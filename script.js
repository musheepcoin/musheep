/* ---------- CONFIG GITHUB ---------- */
window.GH_OWNER  = "musheepcoin";
window.GH_REPO   = "musheep";
window.GH_BRANCH = "main";
window.GH_TOKEN  = null; // géré côté serveur (Vercel)

// ✅ Un fichier par “state” d’onglet
window.GH_PATHS = {
  home:  "data/home.json",
  rules: "data/rules.json",
  check: "data/check.json",
  mails: "data/mails.json",
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

  function debounce(fn, wait=400){
    let t=null;
    return (...args)=>{
      clearTimeout(t);
      t=setTimeout(()=>fn(...args), wait);
    };
  }

  /* ---------- NAV ---------- */
  const tabs = {
    home:  byId('tab-home'),
    vcc:   byId('tab-vcc'),
    rules: byId('tab-rules'),
    check: byId('tab-check'),
    mails: byId('tab-mails')
  };
  const views = {
    home:  byId('view-home'),
    vcc:   byId('view-vcc'),
    rules: byId('view-rules'),
    check: byId('view-check'),
    mails: byId('view-mails')
  };
  function showTab(t){
    Object.values(views).forEach(v=>v && (v.style.display='none'));
    Object.values(tabs).forEach(x=>x && x.classList.remove('active'));
    if(views[t]) views[t].style.display='block';
    if(tabs[t]) tabs[t].classList.add('active');
  }
  tabs.home?.addEventListener('click',e=>{e.preventDefault();showTab('home')});
  tabs.vcc?.addEventListener('click',e=>{e.preventDefault();showTab('vcc'); renderVccMissingArrhesPrepay();});
  tabs.rules?.addEventListener('click',e=>{e.preventDefault();showTab('rules')});
  tabs.check?.addEventListener('click',e=>{e.preventDefault();showTab('check')});
  tabs.mails?.addEventListener('click',e=>{e.preventDefault();showTab('mails')});
  showTab('home');

  // Bouton "recalculer" dans l'onglet VCC
  byId('vcc-refresh')?.addEventListener('click', ()=>{
    showTab('vcc');
    renderVccMissingArrhesPrepay();
  });

  /* =========================================================
     GITHUB STORAGE (multi fichiers) via proxy Vercel
     ========================================================= */

  function ghEnabled() {
    return !!(window.GH_OWNER && window.GH_REPO && window.GH_PATHS);
  }

  async function ghGetContent(path) {
    const url = `https://raw.githubusercontent.com/${window.GH_OWNER}/${window.GH_REPO}/${window.GH_BRANCH}/${path}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`GitHub raw fetch failed: ${res.status}`);
    const text = await res.text();
    return { content: text };
  }

  async function ghSaveSnapshot(path, obj, message) {
    if (!ghEnabled()) return;
    if (!path) throw new Error("ghSaveSnapshot: path manquant");
    if (!obj || typeof obj !== "object") throw new Error("ghSaveSnapshot: obj invalide");

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

    const data = await res.json().catch(()=>({}));
    if (!res.ok) {
      console.error("❌ Erreur GitHub:", data);
      throw new Error(data?.error || "GitHub save failed");
    }
    return data;
  }

  async function updateGhStatusFromHome() {
    const el = byId("gh-date-text");
    if (!el || !ghEnabled()) return;

    try {
      const meta = await ghGetContent(window.GH_PATHS.home);
      let data = {};
      try { data = JSON.parse(meta.content || "{}"); } catch {}
      const ts = data.ts || null;

      if (!ts) {
        el.textContent = "Aucune donnée";
        el.style.color = "#c97a00";
        return;
      }

      const local = new Date(ts).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
      el.textContent = `Mis à jour le ${local}`;
      el.style.color = "#0a7be7";
    } catch (err) {
      el.textContent = "Erreur de mise à jour";
      el.style.color = "#c97a00";
    }
  }

  // Expose console (utile debug)
  window.ghSaveSnapshot = ghSaveSnapshot;
  window.ghGetContent   = ghGetContent;
  window.ghEnabled      = ghEnabled;

  /* =========================================================
     RULES (LS + UI) + GitHub rules.json
     ========================================================= */

  const DEFAULTS={
    keywords:{
      baby:["lit bb","lit bebe","lit bébé","baby","cot","crib"],
      comm:["comm","connecte","connecté","connected","communic"],
      dayuse:["day use","dayuse"],
      early:["early","prioritaire","11h","checkin","check-in","arrivee prioritaire"]
    },
    sofa:{
      "1A+0E":"0","1A+1E":"1","1A+2E":"2","1A+3E":"2",
      "2A+0E":"0","2A+1E":"1","2A+2E":"2",
      "3A+0E":"1","3A+1E":"2"
    }
  };
  const LS_RULES='aar_soiree_rules_v2';

  function stripAccentsLower(s){
    return s?.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'') || '';
  }

  function loadRulesLocal(){
    try{
      const raw=localStorage.getItem(LS_RULES);
      if(!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const o = JSON.parse(raw);
      return {
        keywords:{...DEFAULTS.keywords,...(o.keywords||{})},
        sofa:{...DEFAULTS.sofa,...(o.sofa||{})}
      };
    }catch(_){ return JSON.parse(JSON.stringify(DEFAULTS)); }
  }

  let RULES = loadRulesLocal();

  async function saveRulesEverywhere(){
    // local
    localStorage.setItem(LS_RULES, JSON.stringify(RULES));
    // cloud
    if (ghEnabled()){
      await ghSaveSnapshot(
        window.GH_PATHS.rules,
        { rules: RULES, ts: new Date().toISOString() },
        `Rules update (${new Date().toLocaleString("fr-FR")})`
      );
    }
  }

  function parseList(t){return (t||'').split(',').map(x=>stripAccentsLower(x).trim()).filter(Boolean);}

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
      sel.onchange=async ()=>{
        RULES.sofa[comp]=sel.value;
        try { await saveRulesEverywhere(); toast("✅ Règles sofa sauvegardées"); }
        catch(e){ console.warn(e); toast("⚠️ Sauvegarde rules échouée"); }
      };
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
  }

  function readKeywordAreasToRules(){
    RULES.keywords.baby = parseList(byId('kw-baby')?.value||'');
    RULES.keywords.comm = parseList(byId('kw-comm')?.value||'');
    RULES.keywords.dayuse = parseList(byId('kw-dayuse')?.value||'');
    RULES.keywords.early = parseList(byId('kw-early')?.value||'');
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

  // UI init rules
  renderSofaTable();
  populateKeywordAreas();

  byId('btn-save')?.addEventListener('click', async ()=>{
    readKeywordAreasToRules();
    try{
      await saveRulesEverywhere();
      const s=byId('rules-status'); if(s){ s.textContent='Règles mises à jour ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
      toast("✅ Rules sauvegardées (multi-PC)");
    }catch(e){
      console.warn(e);
      toast("⚠️ Sauvegarde rules échouée");
    }
  });

  byId('btn-reset')?.addEventListener('click', async ()=>{
    RULES = JSON.parse(JSON.stringify(DEFAULTS));
    try{
      await saveRulesEverywhere();
      renderSofaTable();
      populateKeywordAreas();
      const s=byId('rules-status'); if(s){ s.textContent='Valeurs par défaut restaurées ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
      toast("✅ Rules réinitialisées");
    }catch(e){
      console.warn(e);
      toast("⚠️ Reset rules échoué");
    }
  });

  byId('btn-export')?.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(RULES,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='aar_rules.json'; a.click();
    URL.revokeObjectURL(a.href);
  });

  byId('import-file')?.addEventListener('change',(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const reader=new FileReader();
    reader.onload=async (ev)=>{
      try{
        const obj=JSON.parse(ev.target.result);
        RULES = {keywords:{...DEFAULTS.keywords,...obj.keywords}, sofa:{...DEFAULTS.sofa,...obj.sofa}};
        await saveRulesEverywhere();
        renderSofaTable();
        populateKeywordAreas();
        const s=byId('rules-status'); if(s){ s.textContent='Règles importées ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
        toast("✅ Rules importées (multi-PC)");
      }catch(err){ alert('Fichier JSON invalide'); }
    };
    reader.readAsText(f);
  });

  async function ghLoadRulesIfAny(){
    if(!ghEnabled()) return false;
    try{
      const meta = await ghGetContent(window.GH_PATHS.rules);
      let data=null;
      try{ data = JSON.parse((meta?.content||'').trim() || '{}'); }catch{ data=null; }
      if(data?.rules){
        RULES = {
          keywords:{...DEFAULTS.keywords,...(data.rules.keywords||{})},
          sofa:{...DEFAULTS.sofa,...(data.rules.sofa||{})}
        };
        localStorage.setItem(LS_RULES, JSON.stringify(RULES));
        renderSofaTable();
        populateKeywordAreas();
        return true;
      }
    }catch(e){
      console.warn("⚠️ ghLoadRulesIfAny:", e);
    }
    return false;
  }

  /* =========================================================
     CHECKLIST (LS) + GitHub check.json
     ========================================================= */

  const LS_CHECK='aar_checklist_v2';
  const LS_MEMO='aar_memo_v2';

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

  let checklist = JSON.parse(localStorage.getItem(LS_CHECK)||'null') || checklistDefault.map(t=>({text:t,done:false}));

  async function saveCheckEverywhere(){
    localStorage.setItem(LS_CHECK, JSON.stringify(checklist));
    if(memoEl) localStorage.setItem(LS_MEMO, memoEl.value);

    if(ghEnabled()){
      await ghSaveSnapshot(
        window.GH_PATHS.check,
        {
          checklist,
          memo: memoEl ? memoEl.value : "",
          ts: new Date().toISOString()
        },
        `Checklist update (${new Date().toLocaleString("fr-FR")})`
      );
    }
  }

  const saveCheckEverywhereDebounced = debounce(()=>{
    saveCheckEverywhere().then(()=>toast("✅ Checklist sauvegardée")).catch(e=>{
      console.warn(e); toast("⚠️ Sauvegarde checklist échouée");
    });
  }, 500);

  function renderChecklist(){
    if(!checklistEl) return;
    checklistEl.innerHTML='';
    checklist.forEach((item,i)=>{
      const row=document.createElement('div');
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!item.done;
      cb.onchange=()=>{
        checklist[i].done=cb.checked;
        saveCheckEverywhereDebounced();
      };
      const input=document.createElement('input'); input.type='text'; input.value=item.text||''; input.style.flex='1';
      input.oninput=()=>{
        checklist[i].text=input.value;
        saveCheckEverywhereDebounced();
      };
      const del=document.createElement('button'); del.textContent='➖'; del.style.border='none'; del.style.background='transparent'; del.style.cursor='pointer';
      del.onclick=()=>{
        checklist.splice(i,1);
        saveCheckEverywhereDebounced();
        renderChecklist();
      };
      row.append(cb,input,del);
      checklistEl.appendChild(row);
    });
    const add=document.createElement('button'); add.textContent='➕ Ajouter une tâche'; add.className='btn'; add.style.marginTop='10px';
    add.onclick=()=>{
      checklist.push({text:'',done:false});
      saveCheckEverywhereDebounced();
      renderChecklist();
    };
    checklistEl.appendChild(add);
  }

  byId('reset-check')?.addEventListener('click', async ()=>{
    checklist=checklistDefault.map(t=>({text:t,done:false}));
    try{
      await saveCheckEverywhere();
      renderChecklist();
      toast("✅ Checklist réinitialisée");
    }catch(e){
      console.warn(e); toast("⚠️ Reset checklist échoué");
    }
  });

  if(memoEl){
    memoEl.value=localStorage.getItem(LS_MEMO)||'';
    memoEl.oninput=()=>saveCheckEverywhereDebounced();
  }

  renderChecklist();

  async function ghLoadCheckIfAny(){
    if(!ghEnabled()) return false;
    try{
      const meta = await ghGetContent(window.GH_PATHS.check);
      let data=null;
      try{ data = JSON.parse((meta?.content||'').trim() || '{}'); }catch{ data=null; }
      if(data){
        if(Array.isArray(data.checklist)) checklist = data.checklist;
        if(memoEl && typeof data.memo === "string") memoEl.value = data.memo;

        localStorage.setItem(LS_CHECK, JSON.stringify(checklist));
        if(memoEl) localStorage.setItem(LS_MEMO, memoEl.value);

        renderChecklist();
        return true;
      }
    }catch(e){
      console.warn("⚠️ ghLoadCheckIfAny:", e);
    }
    return false;
  }

  /* =========================================================
     EMAILS (LS) + GitHub mails.json
     ========================================================= */

  const LS_MAILS='aar_emails_v1';
  const emailsWrap = byId('emails');
  const btnAddMail = byId('add-mail');
  const btnResetMails = byId('reset-mails');

  const MAILS_DEFAULT = [
    { title: "Facture / Invoice", to: "", subject: "Demande de facture", body: "Bonjour,\n\nPouvez-vous me transmettre la facture de mon séjour ?\n\nMerci,\nCordialement," },
    { title: "Société - coordonnées", to: "", subject: "Coordonnées société", body: "Bonjour,\n\nVoici les coordonnées de facturation :\n\nSociété : \nAdresse : \nTVA : \n\nCordialement," },
  ];

  let EMAIL_MODELS = JSON.parse(localStorage.getItem(LS_MAILS)||'null') || MAILS_DEFAULT;

  async function saveMailsEverywhere(){
    localStorage.setItem(LS_MAILS, JSON.stringify(EMAIL_MODELS));
    if(ghEnabled()){
      await ghSaveSnapshot(
        window.GH_PATHS.mails,
        { mails: EMAIL_MODELS, ts: new Date().toISOString() },
        `Mails update (${new Date().toLocaleString("fr-FR")})`
      );
    }
  }

  const saveMailsEverywhereDebounced = debounce(()=>{
    saveMailsEverywhere().then(()=>toast("✅ Mails sauvegardés")).catch(e=>{
      console.warn(e); toast("⚠️ Sauvegarde mails échouée");
    });
  }, 500);

  function renderMails(){
    if(!emailsWrap) return;
    emailsWrap.innerHTML='';

    EMAIL_MODELS.forEach((m, idx)=>{
      const card = document.createElement('div');
      card.className = 'email-model';

      const t = document.createElement('input');
      t.placeholder = "Titre";
      t.value = m.title || "";
      t.oninput = ()=>{ EMAIL_MODELS[idx].title = t.value; saveMailsEverywhereDebounced(); };

      const to = document.createElement('input');
      to.placeholder = "Destinataire (optionnel)";
      to.value = m.to || "";
      to.oninput = ()=>{ EMAIL_MODELS[idx].to = to.value; saveMailsEverywhereDebounced(); };

      const s = document.createElement('input');
      s.placeholder = "Sujet";
      s.value = m.subject || "";
      s.oninput = ()=>{ EMAIL_MODELS[idx].subject = s.value; saveMailsEverywhereDebounced(); };

      const b = document.createElement('textarea');
      b.placeholder = "Corps";
      b.value = m.body || "";
      b.oninput = ()=>{ EMAIL_MODELS[idx].body = b.value; saveMailsEverywhereDebounced(); };

      const actions = document.createElement('div');
      actions.className = 'email-actions';

      const copy = document.createElement('button');
      copy.className = 'btn primary';
      copy.textContent = "📋 Copier";
      copy.onclick = ()=>{
        const pack = [
          (m.to ? `TO: ${m.to}` : null),
          (m.subject ? `SUBJECT: ${m.subject}` : null),
          "",
          (m.body || "")
        ].filter(x=>x!==null).join("\n");
        navigator.clipboard.writeText(pack);
        toast("✔ Copié");
      };

      const del = document.createElement('button');
      del.className = 'btn warn';
      del.textContent = "🗑 Supprimer";
      del.onclick = ()=>{
        EMAIL_MODELS.splice(idx,1);
        saveMailsEverywhereDebounced();
        renderMails();
      };

      actions.append(copy, del);
      card.append(t, to, s, b, actions);
      emailsWrap.appendChild(card);
    });
  }

  btnAddMail?.addEventListener('click', ()=>{
    EMAIL_MODELS.push({ title:"", to:"", subject:"", body:"" });
    saveMailsEverywhereDebounced();
    renderMails();
  });

  btnResetMails?.addEventListener('click', async ()=>{
    EMAIL_MODELS = JSON.parse(JSON.stringify(MAILS_DEFAULT));
    try{
      await saveMailsEverywhere();
      renderMails();
      toast("✅ Mails réinitialisés");
    }catch(e){
      console.warn(e); toast("⚠️ Reset mails échoué");
    }
  });

  renderMails();

  async function ghLoadMailsIfAny(){
    if(!ghEnabled()) return false;
    try{
      const meta = await ghGetContent(window.GH_PATHS.mails);
      let data=null;
      try{ data = JSON.parse((meta?.content||'').trim() || '{}'); }catch{ data=null; }
      if(data?.mails && Array.isArray(data.mails)){
        EMAIL_MODELS = data.mails;
        localStorage.setItem(LS_MAILS, JSON.stringify(EMAIL_MODELS));
        renderMails();
        return true;
      }
    }catch(e){
      console.warn("⚠️ ghLoadMailsIfAny:", e);
    }
    return false;
  }

  /* =========================================================
     FONCTIONS PARSE FOLS (inchangées)
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
    const out = byId('output'); if(!out) return;
    out.innerHTML = '';

    const rx = compileRegex();
    const grouped = {};
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

        // COM – simple et stable
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
      ["2_sofa","1_sofa","lit_bebe","comm","dayuse","early"].forEach(cat=>{
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
      if (data["2_sofa"].length) copyText.push(`🛋️ 2 SOFA : ${data["2_sofa"].join(', ')}`);
      if (data["1_sofa"].length) copyText.push(`🛋️ 1 SOFA : ${data["1_sofa"].join(', ')}`);
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
      ["2_sofa","1_sofa","lit_bebe","comm","dayuse","early"].forEach(cat=>{
        if (data[cat].length){
          const p=document.createElement('div');
          const label=
            cat==="lit_bebe" ? "🍼 LIT BÉBÉ" :
            cat==="comm"     ? "🔗 COMMUNIQUANTE" :
            cat==="dayuse"   ? "⏰ DAY USE" :
            cat==="early"    ? "⏰ ARRIVÉE PRIORITAIRE" :
            cat==="2_sofa"   ? "🛋️ 2 SOFA" : "🛋️ 1 SOFA";
          p.textContent = `${label} : ${data[cat].join(', ')}`;
          ul.appendChild(p);
        }
      });

      blk.append(h, btn, ul);
      out.appendChild(blk);
    });
  }

  /* ---------- VCC (depuis Arrivals FOLS) : contrôle Arrhes / PREPAY ---------- */
  const VCC_TARGET_RATES = new Set(['FLMRB4','FMRA4S','FMRB4S','FLRB4','FLRA4S']);
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
      if(VCC_TARGET_RATES.has(v)){
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

    if(!LAST_FOLS_ROWS || !LAST_FOLS_ROWS.length){
      out.innerHTML = '<p class="muted">Aucun export Arrivals FOLS chargé. Importe ton CSV dans l’onglet Home.</p>';
      status && (status.textContent = '–');
      if(copyBtn) copyBtn.onclick = ()=>toast('Aucune liste à copier');
      return;
    }

    const names=[];
    for(const r of LAST_FOLS_ROWS){
      const { rate, guaranty } = vccGetRateAndGuaranty(r);
      if(!rate || !VCC_TARGET_RATES.has(rate)) continue;
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

  /* ---------- UPLOAD / IMPORT (HOME) ---------- */
  const dropZone = byId('drop-zone');
  const fileInput = byId('file-input');

  if(!dropZone || !fileInput) {
    console.warn("⚠️ Drop zone ou champ fichier introuvable dans le DOM.");
  } else {

    dropZone.addEventListener('click', ()=> fileInput.click());

    ['dragenter','dragover'].forEach(ev=>{
      dropZone.addEventListener(ev, e=>{
        e.preventDefault();
        dropZone.style.borderColor='var(--brand)';
      });
    });

    ['dragleave','drop'].forEach(ev=>{
      dropZone.addEventListener(ev, e=>{
        e.preventDefault();
        dropZone.style.borderColor='var(--border)';
      });
    });

    dropZone.addEventListener('drop', e=>{
      const files = Array.from(e.dataTransfer.files || []);
      files.forEach(f=>handleFile(f));
    });

    fileInput.addEventListener('change', e=>{
      const files = Array.from(e.target.files || []);
      files.forEach(f=>handleFile(f));
      fileInput.value='';
    });

    console.log("✅ Drop zone prête (import CSV actif)");
  }

  async function saveHomeEverywhere(csvText, originName="import"){
    if(!ghEnabled()) return;
    await ghSaveSnapshot(
      window.GH_PATHS.home,
      { csv: csvText, ts: new Date().toISOString(), origin: originName },
      `Import Home - ${originName} (${new Date().toLocaleString("fr-FR")})`
    );
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

  async function handleCreditLimitText(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    const header = lines.shift().split(';').map(h => h.trim());
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

    const checklist = byId('checklist');
    checklist?.prepend(container);

    toast("💳 Fichier limite de crédit analysé");
  }

  function handleFile(file){
    const reader = new FileReader();

    reader.onload = async (e)=>{
      try {
        const text = e.target.result;
        const name = (file.name || '').toLowerCase();

        // Détection type CSV
        if (name.includes("credit") || name.includes("limit")) {
          await handleCreditLimitText(text);
        } else {
          processCsvText(text);
          // ✅ Home.json = dernier import arrivals (ou fichier principal)
          if (ghEnabled()){
            try{
              await saveHomeEverywhere(text, file.name);
              toast("☁️ Home sauvegardé (multi-PC)");
              await updateGhStatusFromHome();
            }catch(err){
              console.warn("⚠️ Sauvegarde Home échouée :", err);
              toast("⚠️ Erreur sauvegarde Home");
            }
          }
        }
      } catch (err) {
        console.error("Erreur import :", err);
        alert("Erreur pendant l’import : " + err.message);
      }
    };

    reader.readAsText(file, 'utf-8');
  }

  async function ghLoadHomeIfAny(){
    if (!ghEnabled()) return false;
    try {
      const meta = await ghGetContent(window.GH_PATHS.home);
      let data=null;
      try { data = JSON.parse((meta?.content||'').trim() || '{}'); } catch { data=null; }
      if (data?.csv && data.csv.trim()){
        processCsvText(data.csv);
        return true;
      }
    } catch (err) {
      console.warn("⚠️ ghLoadHomeIfAny:", err);
    }
    return false;
  }

  /* =========================================================
     BOOT (restaurations multi-PC)
     ========================================================= */

  window.addEventListener("DOMContentLoaded", async () => {
    try {
      if (ghEnabled()) {
        console.log("☁️ Mode proxy GitHub actif (multi fichiers)");

        // Ordre logique : rules -> check -> mails -> home
        await ghLoadRulesIfAny();
        await ghLoadCheckIfAny();
        await ghLoadMailsIfAny();
        await ghLoadHomeIfAny();

        await updateGhStatusFromHome();
        toast("☁️ États restaurés (multi-PC)");
      } else {
        console.log("💡 Mode local : aucun stockage GitHub détecté");
      }
    } catch (err) {
      console.warn("⚠️ Initialisation GitHub interrompue:", err);
    }
  });

})(); // fin IIFE
