/* script.js (corrigé intégralement) */

/* ---------- CONFIG GITHUB ---------- */
window.GH_OWNER = "musheepcoin";
window.GH_REPO  = "musheep";
window.GH_PATH  = "data/last.json";
window.GH_TOKEN = null;
window.GH_BRANCH= "main";

// ✅ AJOUT : chemins multi-fichiers (dont groups)
window.GH_PATHS = {
  groups: "data/groups.json"
};

(function(){
  /* ---------- Helpers DOM ---------- */
  const $  = (sel)=>document.querySelector(sel);
  const $$ = (sel)=>Array.from(document.querySelectorAll(sel));
  const byId = (id)=>document.getElementById(id);

  /* ---------- Petit toast ---------- */
  function toast(msg){
    const t=document.createElement('div');
    t.textContent=msg;
    Object.assign(t.style,{
      position:'fixed',right:'12px',bottom:'12px',
      background:'#111',color:'#fff',padding:'10px 14px',
      borderRadius:'8px',boxShadow:'0 2px 10px rgba(0,0,0,.25)',
      zIndex:'9999',fontSize:'13px'
    });
    document.body.appendChild(t);
    setTimeout(()=>{
      t.style.transition='opacity .3s';
      t.style.opacity='0';
      setTimeout(()=>t.remove(),300);
    },2200);
  }

  /* =========================================================
     STATE GLOBAL (GitHub sync)
     ========================================================= */
  const LS_RULES  = 'aar_soiree_rules_v2';
  const LS_CHECK  = 'aar_checklist_v2';
  const LS_MEMO   = 'aar_memo_v2';
  const LS_EMAILS = 'aar_emails_v1';
  const LS_TARIFS = 'aar_tarifs_v1';
  const LS_HOME_STATS_SOURCE = 'aar_home_arrivals_source_v1';


  let STATE = {
    ts: null,
    arrivals_csv: "",
    credit_limit_csv: "",
    rules: null,
    checklist: null,
    memo: "",
    tarifs: null,
    emails: null,
    home_arrivals_stats_source: ""
  };

  function safeJsonParse(raw, fallback){
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  let _saveTimer = null;
  function scheduleSaveState(reason){
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async ()=>{
      // Hydrate STATE depuis le local
      STATE.ts = new Date().toISOString();

      // rules
      STATE.rules = safeJsonParse(localStorage.getItem(LS_RULES) || 'null', null);

      // checklist
      STATE.checklist = safeJsonParse(localStorage.getItem(LS_CHECK) || 'null', null);

      // memo
      STATE.memo = localStorage.getItem(LS_MEMO) || "";
      // emails
      STATE.emails = safeJsonParse(localStorage.getItem(LS_EMAILS) || 'null', null);
      STATE.tarifs = safeJsonParse(localStorage.getItem(LS_TARIFS) || 'null', null);
      // home arrivals stats source (Home graph)
      STATE.home_arrivals_stats_source = localStorage.getItem(LS_HOME_STATS_SOURCE) || "";


      try{
        await ghSaveState(reason || "autosave");
      }catch(e){
        console.warn("autosave GH failed:", e);
      }
    }, 700);
  }

  /* =========================================================
     NAV
     ========================================================= */
const tabs = {
  home:   byId('tab-home'),
  indiv:  byId('tab-indiv'),
  groups: byId('tab-groups'),
  vcc:    byId('tab-vcc'),
  rules:  byId('tab-rules'),
  check:  byId('tab-check'),
  tarifs: byId('tab-tarifs'),
  inventory: byId('tab-inventory'),
  mails:  byId('tab-mails')
};

const views = {
  home:   byId('view-home'),
  indiv:  byId('view-indiv'),
  groups: byId('view-groups'),
  vcc:    byId('view-vcc'),
  rules:  byId('view-rules'),
  check:  byId('view-check'),
  tarifs: byId('view-tarifs'),
  inventory: byId('view-inventory'),
  mails:  byId('view-mails')
};

function showTab(t){
 Object.entries(views).forEach(([k,v])=>{
  if (!v) console.warn("View manquante:", k);
  else v.style.display = 'none';
});

  Object.values(tabs).forEach(x=>{ if(x) x.classList.remove('active'); });

  if (!views[t] || !tabs[t]) {
    console.warn("Tab/view missing:", t, { tab: tabs[t], view: views[t] });
    return;
  }
  views[t].style.display='block';
  tabs[t].classList.add('active');
}

  tabs.home?.addEventListener('click',e=>{e.preventDefault();showTab('home')});
  tabs.indiv?.addEventListener('click', e=>{ e.preventDefault(); showTab('indiv'); });
  tabs.vcc?.addEventListener('click',e=>{e.preventDefault();showTab('vcc'); renderVccMissingArrhesPrepay();});
  tabs.rules?.addEventListener('click',e=>{e.preventDefault();showTab('rules')});
  tabs.check?.addEventListener('click',e=>{e.preventDefault();showTab('check')});
  tabs.tarifs?.addEventListener('click', e=>{ e.preventDefault(); showTab('tarifs'); });
  tabs.inventory?.addEventListener('click',e=>{e.preventDefault();showTab('inventory')});
  tabs.mails?.addEventListener('click',e=>{e.preventDefault();showTab('mails')});
  showTab('home');
  tabs.groups?.addEventListener('click', e=>{
  e.preventDefault();
  showTab('groups');

  // si tu as groups.module.js
  if (typeof window.onGroupsSourceUpdated === "function") {
    window.onGroupsSourceUpdated();
  }
});


  // Bouton "recalculer" dans l'onglet VCC
  byId('vcc-refresh')?.addEventListener('click', ()=>{
    showTab('vcc');
    renderVccMissingArrhesPrepay();
  });

  /* =========================================================
     RULES (LS + UI)
     ========================================================= */
const DEFAULTS = {
  keywords: {
    baby: ["lit bb","lit bebe","lit bébé","baby","cot","crib"],
    comm: ["comm","connecte","connecté","connected","communic"],
    dayuse: ["day use","dayuse"],
    early: ["early","prioritaire","11h","checkin","check-in","arrivee prioritaire"],
  },
   vcc_rates: ["FLMRB4","FMRA4S","FMRB4S","FLRB4","FLRA4S","FLRB3S","FLRA3"],
  sofa: {
    "1A+0E":"0","1A+1E":"1","1A+2E":"2","1A+3E":"2",
    "2A+0E":"0","2A+1E":"1","2A+2E":"2",
    "3A+0E":"1","3A+1E":"2"
  }
};


  function stripAccentsLower(s){
    return s?.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'') || '';
  }
  function parseList(t){return (t||'').split(',').map(x=>stripAccentsLower(x).trim()).filter(Boolean);}
function parseRates(t){
  return (t||'')
    .split(',')
    .map(x=>String(x||'').trim().toUpperCase())
    .filter(Boolean);
}

  function loadRules(){
    try{
      const raw=localStorage.getItem(LS_RULES);
      if(!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const o = JSON.parse(raw);
    return {
  keywords:{...DEFAULTS.keywords,...(o.keywords||{})},
  vcc_rates: Array.isArray(o.vcc_rates) ? o.vcc_rates : DEFAULTS.vcc_rates.slice(),
  sofa:{...DEFAULTS.sofa,...(o.sofa||{})}
};
    }catch(_){ return JSON.parse(JSON.stringify(DEFAULTS)); }
  }
  let RULES = loadRules();

  function saveRules(){
    localStorage.setItem(LS_RULES, JSON.stringify(RULES));
    scheduleSaveState("rules update");
  }

  function buildKeywordRegex(list){
    const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s*');
    const p=(list||[]).map(esc).join('|');
    return p ? new RegExp(`\\b(${p})\\b`,'i') : null;
  }
  function compileRegex(){
  return {
    baby: buildKeywordRegex(RULES.keywords.baby),
    comm: buildKeywordRegex(RULES.keywords.comm),
    dayuse: buildKeywordRegex(RULES.keywords.dayuse),
    early: buildKeywordRegex(RULES.keywords.early),
  };
}


  function renderSofaTable(){
    const body = byId('sofa-rules-body'); if(!body) return;
    body.innerHTML='';
    Object.entries(RULES.sofa).forEach(([comp,act])=>{
      const tr=document.createElement('tr');
      const td1=document.createElement('td'); td1.textContent=comp;
      const td2=document.createElement('td');
      const sel=document.createElement('select');
      ['0','1','2'].forEach(v=>{
        const opt=document.createElement('option');
        opt.value=v; opt.textContent=(v==='0'?'Sofa fermé': v==='1'?'1 sofa':'2 sofa');
        if(v===act) opt.selected=true;
        sel.appendChild(opt);
      });
      sel.onchange=()=>{ RULES.sofa[comp]=sel.value; saveRules(); };
      td2.appendChild(sel);
      tr.append(td1,td2);
      body.appendChild(tr);
    });
  }
  function populateKeywordAreas(){
    byId('kw-baby') && (byId('kw-baby').value=(RULES.keywords.baby||[]).join(', '));
    byId('kw-comm') && (byId('kw-comm').value=(RULES.keywords.comm||[]).join(', '));
    byId('kw-dayuse') && (byId('kw-dayuse').value=(RULES.keywords.dayuse||[]).join(', '));
    byId('kw-early') && (byId('kw-early').value=(RULES.keywords.early||[]).join(', '));
    byId('kw-vcc-rates') && (byId('kw-vcc-rates').value = (RULES.vcc_rates || []).join(', '));


  }
  function readKeywordAreasToRules(){
    RULES.keywords.baby = parseList(byId('kw-baby')?.value||'');
    RULES.keywords.comm = parseList(byId('kw-comm')?.value||'');
    RULES.keywords.dayuse = parseList(byId('kw-dayuse')?.value||'');
    RULES.keywords.early = parseList(byId('kw-early')?.value||'');
  RULES.vcc_rates = parseRates(byId('kw-vcc-rates')?.value || '');


  }

  renderSofaTable();
  populateKeywordAreas();

  byId('btn-save')?.addEventListener('click',()=>{
    readKeywordAreasToRules(); saveRules();
    const s=byId('rules-status'); if(s){ s.textContent='Règles mises à jour ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
  });
  byId('btn-reset')?.addEventListener('click',()=>{
    RULES = JSON.parse(JSON.stringify(DEFAULTS));
    saveRules(); renderSofaTable(); populateKeywordAreas();
    const s=byId('rules-status'); if(s){ s.textContent='Valeurs par défaut restaurées ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
  });
  byId('btn-export')?.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(RULES,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='aar_rules.json'; a.click();
    URL.revokeObjectURL(a.href);
  });
  byId('import-file')?.addEventListener('change',(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const obj=JSON.parse(ev.target.result);
        RULES = {
  keywords:{...DEFAULTS.keywords,...(obj.keywords||{})},
  vcc_rates: Array.isArray(obj.vcc_rates) ? obj.vcc_rates : DEFAULTS.vcc_rates.slice(),
  sofa:{...DEFAULTS.sofa,...(obj.sofa||{})}
};

        saveRules(); renderSofaTable(); populateKeywordAreas();
        const s=byId('rules-status'); if(s){ s.textContent='Règles importées ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
      }catch(err){ alert('Fichier JSON invalide'); }
    };
    reader.readAsText(f);
  });

  /* =========================================================
     CHECKLIST
     ========================================================= */
  const checklistDefault=[
    "Vérifier la propreté du hall + journaux + musique",
    "Compter le fond de caisse",
    "Contrôler et préparer les arrivées du lendemain",
    "Contrôler les garanties à 23h",
    "Clôturer la caisse journalière"
  ];
  const checklistEl=byId('checklist');
  const memoEl=byId('memo');
  if(memoEl){ memoEl.style.minHeight='400px'; }

  let checklist = safeJsonParse(localStorage.getItem(LS_CHECK)||'null', null)
    || checklistDefault.map(t=>({text:t,done:false}));

  function saveChecklist(){
    localStorage.setItem(LS_CHECK,JSON.stringify(checklist));
    scheduleSaveState("checklist update");
  }

  function renderChecklist(){
    if(!checklistEl) return;
    checklistEl.innerHTML='';
    checklist.forEach((item,i)=>{
      const row=document.createElement('div');
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=item.done;
      cb.onchange=()=>{checklist[i].done=cb.checked;saveChecklist();};
      const input=document.createElement('input'); input.type='text'; input.value=item.text; input.style.flex='1';
      input.oninput=()=>{checklist[i].text=input.value;saveChecklist();};
      const del=document.createElement('button'); del.textContent='➖'; del.style.border='none'; del.style.background='transparent'; del.style.cursor='pointer';
      del.onclick=()=>{checklist.splice(i,1);saveChecklist();renderChecklist();};
      row.append(cb,input,del);
      checklistEl.appendChild(row);
    });
    const add=document.createElement('button'); add.textContent='➕ Ajouter une tâche'; add.className='btn'; add.style.marginTop='10px';
    add.onclick=()=>{checklist.push({text:'',done:false});saveChecklist();renderChecklist();};
    checklistEl.appendChild(add);
  }

  byId('reset-check')?.addEventListener('click',()=>{
    checklist=checklistDefault.map(t=>({text:t,done:false}));
    saveChecklist(); renderChecklist();
  });

  if(memoEl){
    memoEl.value = localStorage.getItem(LS_MEMO) || '';
    memoEl.oninput = ()=>{
      localStorage.setItem(LS_MEMO, memoEl.value);
      scheduleSaveState("memo update");
    };
  }

  renderChecklist();



/* =========================================================
   EMAILS (nouveau : persistance + UI + sync)
   ========================================================= */

  const emailDefault = [
    {
      title: "Demande de facture",
      subject: "Facture — demande client",
      body: "Bonjour,\n\nVeuillez trouver ci-joint / ci-dessous la facture demandée.\n\nCordialement,\nRéception"
    },
    {
      title: "Réponse tardive",
      subject: "Réponse à votre demande",
      body: "Bonjour,\n\nMerci pour votre message. Nous revenons vers vous dès que possible.\n\nCordialement,\nRéception"
    }
  ];

  let emails = safeJsonParse(localStorage.getItem(LS_EMAILS) || 'null', null) || emailDefault.slice();

  function saveEmails(){
    localStorage.setItem(LS_EMAILS, JSON.stringify(emails));
    scheduleSaveState("emails update");
  }

function renderEmails(){
  const wrap = byId('emails'); if(!wrap) return;
  wrap.innerHTML = '';

  emails.forEach((m, i)=>{
    const card = document.createElement('div');
    card.className = 'email-model';

    // --- Titre ---
    const title = document.createElement('input');
    title.value = m.title || '';
    title.placeholder = "Titre";
    title.className = "email-title";
    title.oninput = ()=>{ emails[i].title = title.value; saveEmails(); };

    // --- To ---
    const to = document.createElement('input');
    to.value = m.to || '';
    to.placeholder = "To (emails séparés par ;)";
    to.oninput = ()=>{ emails[i].to = to.value; saveEmails(); };

    // --- Objet ---
    const subj = document.createElement('input');
    subj.value = m.subject || '';
    subj.placeholder = "Objet";
    subj.oninput = ()=>{ emails[i].subject = subj.value; saveEmails(); };

    // --- Contenu ---
    const body = document.createElement('textarea');
    body.value = m.body || '';
    body.placeholder = "Contenu";
    body.oninput = ()=>{ emails[i].body = body.value; saveEmails(); };

    // --- Actions ---
    const actions = document.createElement('div');
    actions.className = 'email-actions';

    const copy = document.createElement('button');
    copy.className='btn primary';
    copy.textContent='📋 Copier';
    copy.onclick=()=>{
      const lines = [];
      if (m.to) lines.push(`To: ${m.to}`);
      if (m.subject) lines.push(`Objet: ${m.subject}`);
      if (lines.length) lines.push('');
      lines.push(m.body || '');
      navigator.clipboard.writeText(lines.join('\n'));
      toast("✔ Email copié");
    };

    const del = document.createElement('button');
    del.className='btn warn';
    del.textContent='🗑️ Supprimer';
    del.onclick=()=>{ emails.splice(i,1); saveEmails(); renderEmails(); };

    actions.append(copy, del);

    card.append(title, to, subj, body, actions);
    wrap.appendChild(card);
  });
}



  byId('add-mail')?.addEventListener('click', ()=>{
    emails.push({ title:"", to:"", subject:"", body:"" });
    saveEmails(); renderEmails();
  });

  byId('reset-mails')?.addEventListener('click', ()=>{
    emails = emailDefault.slice();
    saveEmails(); renderEmails();
  });

  renderEmails();
/* =========================================================
   TARIFS (du jour) — 4 gammes, autos calc ALL/ALL Plus
   ========================================================= */

const tarifsDefault = [
  { key: "classique",  label: "Chambre classique",  base: "" },
  { key: "sup",        label: "Chambre supérieure", base: "" },
  { key: "premium",    label: "Chambre Premium",    base: "" },
  { key: "exec",       label: "Chambre Executive",  base: "" },
];

let tarifs = safeJsonParse(localStorage.getItem(LS_TARIFS) || 'null', null) || tarifsDefault.slice();

function saveTarifs(){
  localStorage.setItem(LS_TARIFS, JSON.stringify(tarifs));
  scheduleSaveState("tarifs update");
  const s = byId('tarifs-status');
  if (s) {
    s.textContent = `Mis à jour ✔`;
    setTimeout(()=>{ s.textContent = 'Tarifs chargés'; }, 1200);
  }
}

function n2(v){
  if (v == null) return null;
  let s = String(v).trim();
  if (s === "") return null;

  // accepte "119,00 €" / "119.00€" / espaces
  s = s.replace(/\s/g,'').replace('€','').replace(',', '.');

  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}


function fmtEUR(x){
  if (x == null || !Number.isFinite(x)) return '';
  // affichage FR avec 2 décimales
  return x.toFixed(2).replace('.', ',');
}

function computeAll(base){
  const v = base * 0.95;
  return v < 0 ? 0 : v;
}


function computeAllPlus(base){
  // ALL Plus = -15% sur le prix du jour
  const v = base * 0.85;
  return v < 0 ? 0 : v;
}

function renderTarifs(){
  const body = byId('tarifs-body');
  if (!body) return;
  body.innerHTML = '';

  // sécurité : si structure bizarre, reset
  if (!Array.isArray(tarifs) || tarifs.length !== 4) {
    tarifs = tarifsDefault.slice();
    saveTarifs();
  }

 tarifs.forEach((row, i)=>{
  const tr = document.createElement('tr');

  const tdLabel = document.createElement('td');
  tdLabel.textContent = row.label;
// --------- Prix du jour (editable + € dans le champ) ----------
const tdBase = document.createElement('td');

const inputBase = document.createElement('input');
inputBase.type = 'text';
inputBase.inputMode = 'decimal';
inputBase.className = 'tarifs-readonly'; // même taille que ALL / ALL Plus

// valeur initiale formatée
const baseNumInit = n2(row.base);
inputBase.value = (baseNumInit == null) ? '' : `${fmtEUR(baseNumInit)} €`;

tdBase.appendChild(inputBase);

// focus : retire le " €" pour saisir
inputBase.addEventListener('focus', ()=>{
  inputBase.value = (inputBase.value || '').replace(/\s*€\s*$/,'');
});

// blur : remet "xx,xx €"
inputBase.addEventListener('blur', ()=>{
  const n = n2(inputBase.value);
  inputBase.value = (n == null) ? '' : `${fmtEUR(n)} €`;
});



  // --------- Calcul initial ALL / ALL Plus ----------
  const baseNum = n2(row.base);
  const allNum  = (baseNum == null) ? null : computeAll(baseNum);
  const plusNum = (baseNum == null) ? null : computeAllPlus(baseNum);

  const tdAll = document.createElement('td');
  const all = document.createElement('input');
  all.type = 'text';
  all.readOnly = true;
  all.className = 'tarifs-readonly';
  all.value = (allNum == null) ? '' : `${fmtEUR(allNum)} €`;
  tdAll.appendChild(all);

  const tdPlus = document.createElement('td');
  const plus = document.createElement('input');
  plus.type = 'text';
  plus.readOnly = true;
  plus.className = 'tarifs-readonly';
  plus.value = (plusNum == null) ? '' : `${fmtEUR(plusNum)} €`;
  tdPlus.appendChild(plus);

  // ✅ ONINPUT sans rerender (sinon focus saute)
  inputBase.oninput = ()=>{
    tarifs[i].base = inputBase.value;
    saveTarifs();

    const baseNumLive = n2(inputBase.value);
    all.value  = (baseNumLive == null) ? '' : `${fmtEUR(computeAll(baseNumLive))} €`;
    plus.value = (baseNumLive == null) ? '' : `${fmtEUR(computeAllPlus(baseNumLive))} €`;
  };

  tr.append(tdLabel, tdBase, tdAll, tdPlus);
  body.appendChild(tr);
});


  const s = byId('tarifs-status');
  if (s) s.textContent = 'Tarifs chargés';
}

byId('tarifs-reset')?.addEventListener('click', ()=>{
  tarifs = tarifsDefault.slice();
  saveTarifs();
  renderTarifs();
});

// rendu initial
renderTarifs();

  /* =========================================================
     FONCTIONS PARSE FOLS
     ========================================================= */
  // Dernier import Arrivals FOLS (utilisé par l'onglet VCC)
  let LAST_FOLS_ROWS = [];

  function splitCSV(line, sep=';'){
    const out=[]; let cur=''; let inQuotes=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i], nxt=line[i+1];
      if(ch==='"'){
        if(inQuotes && nxt === '"'){ cur+='"'; i++; }
        else { inQuotes=!inQuotes; }
      }else if(ch===sep && !inQuotes){ out.push(cur); cur=''; }
      else{ cur+=ch; }
    }
    out.push(cur);
    return out.map(s=>s.trim().replace(/^"|"$/g,''));
  }
  const regexClientStart = /^"[A-ZÉÈÀÂÊÎÔÛÄËÏÖÜÇ][^;]+";/;

  function parseCsvHeaderAndBlocks(text){
    const lines = text.replace(/\r\n?/g,'\n').split('\n').filter(l=>l.trim()!=='');
    if(!lines.length) return {header:[], blocks:[]};
    const header = splitCSV(lines[0], ';');
    const blocks=[]; let current=null;
    for(let i=1;i<lines.length;i++){
      const line = lines[i];
      if(regexClientStart.test(line)){
        if(current) blocks.push(current);
        current = { firstLine: line, extra: [] };
      }else{
        if(current) current.extra.push(line);
      }
    }
    if(current) blocks.push(current);
    return {header, blocks};
  }

  function buildRowsFromBlocks(header, blocks){
    const rows=[];
    for(const b of blocks){
      const cells = splitCSV(b.firstLine, ';');
      const obj = {};
      header.forEach((h,idx)=>{ obj[h] = (cells[idx] ?? ''); });
      const mergedText = [b.firstLine, ...(b.extra||[])].join(' ');
      rows.push({ __text: mergedText, __first: b.firstLine, ...obj });
    }
    return rows;
  }

  function pick(row, aliases){
    const keys = Object.keys(row);
    for (const alias of aliases){
      const rx = new RegExp('^' + alias.replace(/\s+/g,'\\s*').replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$', 'i');
      const k = keys.find(kk => rx.test(kk));
      if (k && row[k] !== undefined && row[k] !== '') return row[k];
    }
    return '';
  }

  function parseFolsDateCell(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date && !isNaN(v)) {
      return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
    }
    if (typeof v === 'number') {
      const base = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(base.getTime() + v * 86400000);
      return isNaN(d) ? null : d;
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) { const dd=+m[1], mm=+m[2], yyyy=+m[3]; return new Date(Date.UTC(yyyy, mm-1, dd)); }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) { const yyyy=+m[1], mm=+m[2], dd=+m[3]; return new Date(Date.UTC(yyyy, mm-1, dd)); }
    return null;
  }

  function toFrLabel(dObj) {
    const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const mois  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    const j = jours[dObj.getUTCDay()];
    const jj = String(dObj.getUTCDate()).padStart(2,'0');
    const mm = mois[dObj.getUTCMonth()];
    const yyyy = dObj.getUTCFullYear();
    return `${j} ${jj} ${mm} ${yyyy}`;
  }

  /* ---------- RENDER ARRIVALS ---------- */
function renderArrivalsFOLS_fromRows(rows){
  const out = byId('output-indiv'); if(!out) return;
    out.innerHTML = '';

    const grouped = {};
    const rx = compileRegex();
    let lastKey=null, lastLabel=null;

    rows.forEach(r=>{
      try{
        const nameRaw = String(
          pick(r, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) ||
          splitCSV(r.__first || '', ';')[0] || ''
        );
        let nameParts = nameRaw.trim().split(/\s+/);
        let shortName = '';
        if (nameParts.length > 1) {
          shortName = nameParts[0].length < 3 ? `${nameParts[0]} ${nameParts[1]}` : nameParts[0];
        } else {
          shortName = nameParts[0] || '';
        }
        const name = (shortName || '').toUpperCase().trim();
        if(!name) return;

        const adu = parseInt(
          pick(r, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0'
        ) || 0;
        const enf = parseInt(
          pick(r, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0'
        ) || 0;

        // COM – stable
        let comment = stripAccentsLower((r.__text||'').replace(/<[^>]*>/g,' '))
          .replace(/["*()]/g,' ')
          .replace(/s\/intern[:\s-]*/g, ' ')
          .replace(/[^\p{L}\p{N}\s\+]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // DATE
        let dObj = parseFolsDateCell(
          pick(r, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
        );
        if (!dObj) {
          const m = (r.__text||'').match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
          if (m) {
            const dd=+m[1], mm=+m[2], yyyy=+m[3];
            dObj = new Date(Date.UTC(yyyy, mm-1, dd));
          }
        }

        let dateKey, dateLabel;
        if (!dObj && lastKey) { dateKey = lastKey; dateLabel = lastLabel; }
        else if (dObj) {
          const key = dObj.toISOString().split('T')[0];
          const label = toFrLabel(dObj);
          lastKey=key; lastLabel=label;
          dateKey=key; dateLabel=label;
        } else {
          dateKey='9999-12-31'; dateLabel='Non daté';
        }

        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            label: dateLabel,
            "2_sofa": [], "1_sofa": [],
            "lit_bebe": [], "comm": [],
            "dayuse": [], "early": []
          };
        }

        const sofaKey = `${adu}A+${enf}E`;
        const sofa = (RULES.sofa && RULES.sofa[sofaKey]) || "0";
        if (sofa === "1") grouped[dateKey]["1_sofa"].push(name);
        if (sofa === "2") grouped[dateKey]["2_sofa"].push(name);

        if (rx.baby && rx.baby.test(comment)) grouped[dateKey]["lit_bebe"].push(name);
        if (rx.comm && rx.comm.test(comment)) grouped[dateKey]["comm"].push(name);
        if (rx.dayuse && rx.dayuse.test(comment)) grouped[dateKey]["dayuse"].push(name);
        if (rx.early && rx.early.test(comment)) grouped[dateKey]["early"].push(name);
      }catch(err){
        console.warn('Ligne ignorée (parse error):', err);
      }
    });

    const keys = Object.keys(grouped).sort();
    if (!keys.length){
      out.innerHTML = '<p class="muted">Aucune donnée valide détectée.</p>';
      return;
    }

    // recouche
    const unionNames=(d)=>{
      const arr=[];
      ["1_sofa","2_sofa","lit_bebe","comm","dayuse","early"].forEach(cat=>{
        if(d[cat]?.length) arr.push(...d[cat]);
      });
      return Array.from(new Set(arr));
    };
    for(let i=0;i<keys.length;i++){
      const k=keys[i];
      grouped[k].__all = unionNames(grouped[k]);
      if(i>0){
        const prevSet = new Set(grouped[keys[i-1]].__all||[]);
        grouped[k].recouche = grouped[k].__all.filter(n=>prevSet.has(n));
      }else{
        grouped[k].recouche=[];
      }
    }

    keys.forEach(k=>{
      const data=grouped[k];
            // ✅ Compacte les doublons DANS une catégorie uniquement (ex: "EL HAJJ, EL HAJJ" -> "EL HAJJ (2)")
      function compactSameCategory(list){
        const counts = new Map();
        for (const n of (list || [])) {
          const key = String(n || '').trim();
          if (!key) continue;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        const out = [];
        for (const [name, c] of counts.entries()) {
          out.push(c > 1 ? `${name} (${c})` : name);
        }
        out.sort((a,b)=>a.localeCompare(b,'fr'));
        return out;
      }

      // ⚠️ view = version "affichage" (compactée), data = version brute (calcul)
      const view = {
        ...data,
        "1_sofa": compactSameCategory(data["1_sofa"]),
        "2_sofa": compactSameCategory(data["2_sofa"])
      };

      const blk=document.createElement('div');
      blk.className='day-block';

      const h=document.createElement('div');
      h.className='day-header';
      h.textContent=`📅 ${data.label}`;

      const btn=document.createElement('button');
      btn.className='copy-btn';
      btn.textContent='📋 Copier';

      const copyText=[];
      if (data.recouche?.length) copyText.push(`🔁 RECOUCHE : ${data.recouche.join(', ')}`);
      if (view["2_sofa"].length) copyText.push(`🛋️ 2 SOFA : ${view["2_sofa"].join(', ')}`);
      if (view["1_sofa"].length) copyText.push(`🛋️ 1 SOFA : ${view["1_sofa"].join(', ')}`);
      if (data["lit_bebe"].length) copyText.push(`🍼 LIT BÉBÉ : ${data["lit_bebe"].join(', ')}`);
      if (data["comm"].length)     copyText.push(`🔗 COMMUNIQUANTE : ${data["comm"].join(', ')}`);
      if (data["dayuse"].length)   copyText.push(`⏰ DAY USE : ${data["dayuse"].join(', ')}`);
      if (data["early"].length)    copyText.push(`⏰ ARRIVÉE PRIORITAIRE : ${data["early"].join(', ')}`);

      btn.onclick=()=>{
        navigator.clipboard.writeText(copyText.join('\n'));
        btn.textContent='✔ Copié';
        setTimeout(()=>btn.textContent='📋 Copier',1200);
      };

      const ul=document.createElement('div');

      if (data.recouche?.length){
        const p=document.createElement('div');
        p.textContent=`🔁 RECOUCHE : ${data.recouche.join(', ')}`;
        ul.appendChild(p);
      }

            ["1_sofa","2_sofa","lit_bebe","comm","dayuse","early"].forEach(cat=>{
        const arr = (cat === "1_sofa" || cat === "2_sofa") ? view[cat] : data[cat];
        if (arr && arr.length){
          const p=document.createElement('div');
          const label=
            cat==="lit_bebe" ? "🍼 LIT BÉBÉ" :
            cat==="comm"     ? "🔗 COMMUNIQUANTE" :
            cat==="dayuse"   ? "⏰ DAY USE" :
            cat==="early"    ? "⏰ ARRIVÉE PRIORITAIRE" :
            cat==="2_sofa"   ? "🛋️ 2 SOFA" : "🛋️ 1 SOFA";
          p.textContent = `${label} : ${arr.join(', ')}`;
          ul.appendChild(p);
        }
      });

      blk.append(h, btn, ul);
      out.appendChild(blk);
    });
  }

  /* =========================================================
     VCC (depuis Arrivals FOLS)
     ========================================================= */

  function vccHasArrhesOrPrepay(s){
    const t = stripAccentsLower(String(s||''));
    return t.includes('arrhes') || t.includes('prepay');
  }
  function vccExtractName(row){
    const nameRaw = String(
      pick(row, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME','GUES_FULLNAME','GUES FULLNAME']) ||
      splitCSV(row.__first || '', ';')[0] || ''
    ).trim();
    return nameRaw.replace(/\s+/g,' ').trim();
  }
  function vccGetRateAndGuaranty(row){
    const rate = String(pick(row, ['RATE','TARIF','Rate']) || '').trim();
    const guaranty = String(pick(row, ['GUARANTY','GUARANTEE','GARANTIE','Guarantee']) || '').trim();
    if(rate) return { rate, guaranty };

    const cells = splitCSV(row.__first || '', ';');
    for(let i=0;i<cells.length;i++){
      const v = String(cells[i]||'').trim();
   if((RULES.vcc_rates || []).map(x=>String(x||'').trim().toUpperCase()).includes(v.toUpperCase())){

        return { rate: v, guaranty: String(cells[i-2]||'').trim() };
      }
    }
    return { rate:'', guaranty:'' };
  }

  function renderVccMissingArrhesPrepay(){
    const out = byId('vcc-output');
    const status = byId('vcc-status');
    const copyBtn = byId('vcc-copy');
    if(!out) return;
 const VCC_TARGET_RATES = new Set(
  (RULES.vcc_rates || []).map(x => String(x || '').trim().toUpperCase()).filter(Boolean)
);

    if(!LAST_FOLS_ROWS || !LAST_FOLS_ROWS.length){
      out.innerHTML = '<p class="muted">Aucun export Arrivals FOLS chargé. Importe ton CSV dans l’onglet Home.</p>';
      status && (status.textContent = '–');
      if(copyBtn) copyBtn.onclick = ()=>toast('Aucune liste à copier');
      return;
    }

    const names=[];

    for(const r of LAST_FOLS_ROWS){
      const { rate, guaranty } = vccGetRateAndGuaranty(r);
     if(!rate || !VCC_TARGET_RATES.has(String(rate).toUpperCase())) continue;

      if(vccHasArrhesOrPrepay(guaranty)) continue;
      const n = vccExtractName(r);
      if(n) names.push(n);
    }

    const uniq = Array.from(new Set(names.map(n=>n.toUpperCase()))).sort();
    status && (status.textContent = `${uniq.length} client(s)`);

    if(!uniq.length){
      out.innerHTML = '<p class="muted">✅ Aucun client à signaler : tous les RATE ciblés ont Arrhes/PREPAY.</p>';
      if(copyBtn) copyBtn.onclick = ()=>{ navigator.clipboard.writeText('✅ Aucun client à signaler'); toast('Copié'); };
      return;
    }

    const container = document.createElement('div');
    container.className = 'day-block';
    container.innerHTML = `<div class="day-header">📌 Clients RATE ciblés sans Arrhes / PREPAY</div>`;

    const ta = document.createElement('textarea');
    ta.readOnly = true;
    ta.style.minHeight = '220px';
    ta.style.fontFamily = 'monospace';
    ta.value = uniq.join('\n');
    container.appendChild(ta);

    out.innerHTML='';
    out.appendChild(container);

    if(copyBtn){
      copyBtn.onclick = ()=>{
        navigator.clipboard.writeText(uniq.join('\n'));
        toast('✔ Liste copiée');
      };
    }
  }

  /* =========================================================
     UPLOAD / IMPORT
     ========================================================= */
const dropZoneIndiv   = byId('drop-zone-indiv');
const dropZoneGroups = byId('drop-zone-groups');

/* inputs fantômes */
const fileInputIndiv = document.createElement('input');
fileInputIndiv.type = 'file';
fileInputIndiv.accept = '.csv,.txt';
fileInputIndiv.multiple = true;

const fileInputGroups = document.createElement('input');
fileInputGroups.type = 'file';
fileInputGroups.accept = '.csv,.txt';
fileInputGroups.multiple = true;

/* ---------- DROP INDIV ---------- */
if (dropZoneIndiv) {
  dropZoneIndiv.addEventListener('click', () => fileInputIndiv.click());

  dropZoneIndiv.addEventListener('dragover', e => {
    e.preventDefault();
    dropZoneIndiv.style.borderColor = 'var(--brand)';
  });

  dropZoneIndiv.addEventListener('dragleave', () => {
    dropZoneIndiv.style.borderColor = 'var(--border)';
  });

  dropZoneIndiv.addEventListener('drop', e => {
    e.preventDefault();
    dropZoneIndiv.style.borderColor = 'var(--border)';
    Array.from(e.dataTransfer.files || []).forEach(handleIndivFile);
  });

  fileInputIndiv.addEventListener('change', e => {
    Array.from(e.target.files || []).forEach(handleIndivFile);
    fileInputIndiv.value = '';
  });
}

/* ---------- DROP GROUPES ---------- */
if (dropZoneGroups) {
  dropZoneGroups.addEventListener('click', () => fileInputGroups.click());

  dropZoneGroups.addEventListener('dragover', e => {
    e.preventDefault();
    dropZoneGroups.style.borderColor = 'var(--brand)';
  });

  dropZoneGroups.addEventListener('dragleave', () => {
    dropZoneGroups.style.borderColor = 'var(--border)';
  });

  dropZoneGroups.addEventListener('drop', e => {
    e.preventDefault();
    dropZoneGroups.style.borderColor = 'var(--border)';
    Array.from(e.dataTransfer.files || []).forEach(handleGroupFile);
  });

  fileInputGroups.addEventListener('change', e => {
    Array.from(e.target.files || []).forEach(handleGroupFile);
    fileInputGroups.value = '';
  });
}

function handleIndivFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    processCsvText(text);
    STATE.arrivals_csv = text;
    scheduleSaveState("arrivals import"); // ✅ AJOUT
    toast("📂 Arrivées individuelles chargées");
  };
  reader.readAsText(file, 'utf-8');
}

function handleGroupFile(file) {
  const reader = new FileReader();
  reader.onload = async e => {
    const raw = e.target.result;

    const { header, blocks } = parseCsvHeaderAndBlocks(raw);
    const rows = buildRowsFromBlocks(header, blocks);
    window.GROUPS_SOURCE = rows;

    if (typeof window.onGroupsSourceUpdated === "function") {
      window.onGroupsSourceUpdated();
    }

    toast("👥 Groupes chargés");

    // ✅ save GitHub dédié
    try {
      await ghSaveSnapshotPath(window.GH_PATHS.groups, {
        ts: new Date().toISOString(),
        groups_csv: raw
      }, "groups import");
      toast("☁️ Groupes sauvegardés");
    } catch (err) {
      console.warn("save groups failed:", err);
      toast("⚠️ Sauvegarde groupes échouée");
    }
  };
  reader.readAsText(file, 'utf-8');
}




  function processCsvText(csvText){
    const {header, blocks} = parseCsvHeaderAndBlocks(csvText);
    const rows = buildRowsFromBlocks(header, blocks);
    LAST_FOLS_ROWS = rows;
    renderArrivalsFOLS_fromRows(rows);
    if (views?.vcc && views.vcc.style.display !== 'none') {
      renderVccMissingArrhesPrepay();
    }
  }

  /* ---------- CREDIT LIMIT CHECK (BalanceTotal) ---------- */
  async function handleCreditLimitText(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    const header = (lines.shift() || '').split(';').map(h => h.trim());
    const idxRoom = header.indexOf('ROOM_NUM');
    const idxName = header.indexOf('GUES_FULLNAME');
    const idxBalanceTotal = header.indexOf('BalanceTotal');

    if (idxRoom === -1 || idxBalanceTotal === -1 || idxName === -1) {
      toast("⚠️ Fichier limite de crédit invalide");
      return;
    }

    const rows = [];
    for (const line of lines) {
      const cells = line.split(';');
      const room = cells[idxRoom]?.replace(/"/g, '').trim();
      const name = cells[idxName]?.replace(/"/g, '').trim();
      const rawBal = cells[idxBalanceTotal]?.replace(/"/g, '').trim().replace(',', '.');
      const bal = parseFloat(rawBal || 0);
      if (room && /^\d+$/.test(room)) rows.push({ room: parseInt(room), name, bal });
    }

    rows.sort((a,b)=>a.room-b.room);

    const linesOut = rows.map(r=>{
      const montant = `${Math.abs(r.bal).toFixed(2)} €`;
      const prefix = r.bal < 0 ? '⚠️' : '✅';
      return `${prefix} ${r.room.toString().padEnd(4)} ${(r.name||'').padEnd(22,' ').slice(0,22)} → ${montant}`;
    });

    const container = document.createElement('div');
    container.innerHTML = `<h3>💳 Limite de crédit (BalanceTotal)</h3>`;
    const textarea = document.createElement('textarea');
    textarea.readOnly = true;
    textarea.value = linesOut.join('\n');
    Object.assign(textarea.style,{
      width:'100%',
      height:'220px',
      resize:'vertical',
      background:'#f8f8f8',
      color:'#222',
      fontFamily:'monospace',
      fontSize:'13px',
      border:'1px solid #ccc',
      borderRadius:'6px',
      padding:'6px',
      overflowY:'auto',
      whiteSpace:'pre'
    });
    container.appendChild(textarea);
    byId('checklist')?.prepend(container);

    // mémorise dans STATE
    STATE.credit_limit_csv = text;
  }

/* =========================================================
   GITHUB STORAGE (via proxy Vercel)
   ========================================================= */
function ghEnabled() {
  return !!(window.GH_OWNER && window.GH_REPO && window.GH_PATH);
}

async function ghGetContent() {
  const url = `https://raw.githubusercontent.com/${window.GH_OWNER}/${window.GH_REPO}/main/${window.GH_PATH}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub raw fetch failed: ${res.status}`);
  const text = await res.text();
  return { content: text };
}

async function ghGetContentPath(path) {
  const url = `https://raw.githubusercontent.com/${window.GH_OWNER}/${window.GH_REPO}/main/${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub raw fetch failed: ${res.status}`);
  const text = await res.text();
  return { content: text };
}

async function ghSaveSnapshotPath(path, obj, message) {
  if (!ghEnabled()) return;

  const content = JSON.stringify(obj, null, 2);

  const res = await fetch("/api/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      content,
      message: message || `maj auto ${new Date().toISOString()}`
    })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("❌ Erreur GitHub:", data);
    throw new Error("Erreur sauvegarde GitHub");
  }
  return data;
}

async function ghSaveSnapshot(obj, message) {
  if (!ghEnabled()) return;

  if (!obj || typeof obj !== "object") {
    throw new Error("Format invalide — ghSaveSnapshot attend un objet JSON");
  }

    const content = JSON.stringify(obj, null, 2);

    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.GH_PATH,
        content,
        message: message || `maj auto ${new Date().toISOString()}`
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Erreur GitHub:", data);
      throw new Error("Erreur sauvegarde GitHub");
    }
    return data;
  }

  async function ghSaveState(message){
    // merge avec remote pour éviter d'écraser un autre poste
    let remote = null;
    try{
      const meta = await ghGetContent();
      if(meta?.content){
        remote = safeJsonParse(meta.content, null);
      }
    }catch(_){}

    if(remote && typeof remote === "object"){
      // remote -> STATE (STATE garde ses valeurs)
      STATE = { ...remote, ...STATE };
    }

    // snapshot local -> STATE (au moment de sauver)
    STATE.rules = safeJsonParse(localStorage.getItem(LS_RULES) || 'null', STATE.rules);
    STATE.checklist = safeJsonParse(localStorage.getItem(LS_CHECK) || 'null', STATE.checklist);
    STATE.memo = localStorage.getItem(LS_MEMO) || STATE.memo || "";
    STATE.tarifs = safeJsonParse(localStorage.getItem(LS_TARIFS) || 'null', STATE.tarifs);
    STATE.emails = safeJsonParse(localStorage.getItem(LS_EMAILS) || 'null', STATE.emails);
    STATE.home_arrivals_stats_source = localStorage.getItem(LS_HOME_STATS_SOURCE) || STATE.home_arrivals_stats_source || "";

    if(!STATE.ts) STATE.ts = new Date().toISOString();

    await ghSaveSnapshot(STATE, message);
    await updateGhStatus();
  }

  async function ghLoadAndHydrateState(){
    if (!ghEnabled()) return;
    try{
      const meta = await ghGetContent();
      if (!meta?.content) return;

      const data = safeJsonParse(meta.content.trim(), null);
      if(!data || typeof data !== "object") return;

      STATE = data;

      // hydrate localStorage (pour que tout soit dispo dans l'app)
      if(STATE.rules){
        localStorage.setItem(LS_RULES, JSON.stringify(STATE.rules));
        RULES = loadRules();
        renderSofaTable();
        populateKeywordAreas();
      }
      if(STATE.checklist){
        localStorage.setItem(LS_CHECK, JSON.stringify(STATE.checklist));
        checklist = STATE.checklist;
        renderChecklist();
      }
      if(typeof STATE.memo === "string"){
        localStorage.setItem(LS_MEMO, STATE.memo);
        if(memoEl) memoEl.value = STATE.memo;
      }

      if(STATE.emails){
        localStorage.setItem(LS_EMAILS, JSON.stringify(STATE.emails));
        emails = STATE.emails;
        renderEmails();
      }

      if(STATE.tarifs){
        localStorage.setItem(LS_TARIFS, JSON.stringify(STATE.tarifs));
        tarifs = STATE.tarifs;
        renderTarifs();
      }
      if (typeof STATE.home_arrivals_stats_source === "string" && STATE.home_arrivals_stats_source.trim()) {
        localStorage.setItem(LS_HOME_STATS_SOURCE, STATE.home_arrivals_stats_source);
        if (window.TODO && typeof window.TODO.renderHomeArrivalsChartFromStorage === "function") {
          window.TODO.renderHomeArrivalsChartFromStorage();
        }
      }

      if(STATE.arrivals_csv && STATE.arrivals_csv.trim()){
        processCsvText(STATE.arrivals_csv);
        toast("☁️ Arrivées restaurées");
      }

    }catch(err){
      console.warn("⚠️ Lecture GitHub impossible:", err);
      toast("⚠️ Erreur de lecture (mode local)");
    }
  }

  async function updateGhStatus() {
    const el = document.getElementById("gh-date-text");
    if (!el || !ghEnabled()) return;

    try {
      const meta = await ghGetContent();
      if (!meta?.content) {
        el.textContent = "Aucune donnée";
        el.style.color = "#c97a00";
        return;
      }

      const data = safeJsonParse(meta.content, {});
      const ts = data.ts || new Date().toISOString();
      const local = new Date(ts).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short"
      });

      el.textContent = `Mis à jour le ${local}`;
      el.style.color = "#0a7be7";
    } catch (err) {
      el.textContent = "Erreur de mise à jour";
      el.style.color = "#c97a00";
    }
  }

  /* ---------- Auto-chargement ---------- */
window.addEventListener("DOMContentLoaded", async () => {
  try {
    if (ghEnabled()) {
      await ghLoadAndHydrateState();
      await updateGhStatus();

      // ✅ restore groups
      try {
        const metaG = await ghGetContentPath(window.GH_PATHS.groups);
        const gdata = safeJsonParse(metaG.content.trim(), null);

        if (gdata?.groups_csv && gdata.groups_csv.trim()) {
          const { header, blocks } = parseCsvHeaderAndBlocks(gdata.groups_csv);
          const rows = buildRowsFromBlocks(header, blocks);
          window.GROUPS_SOURCE = rows;

          if (typeof window.onGroupsSourceUpdated === "function") {
            window.onGroupsSourceUpdated();
          }

          toast("☁️ Groupes restaurés");
        }
      } catch (e) {
        console.warn("groups load failed:", e);
      }
    }
  } catch (err) {
    console.warn("⚠️ Init interrompue:", err);
  }
});


  // expose console debug
  window.ghSaveState = ghSaveState;
  window.ghGetContent = ghGetContent;
  window.updateGhStatus = updateGhStatus;
  window.ghEnabled = ghEnabled;
// ================= EXPOSE MINI API (pour modules externes) =================
window.AAR = window.AAR || {};
window.AAR.scheduleSaveState = scheduleSaveState;
window.AAR.safeJsonParse = safeJsonParse;
window.AAR.byId = (id)=>document.getElementById(id);
window.AAR.toast = toast;


})(); // fin IIFE
