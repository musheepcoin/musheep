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
    mails: byId('tab-mails'),
    groups: byId('tab-groups')
  };
  const views = {
    home:  byId('view-home'),
    vcc:   byId('view-vcc'),
    rules: byId('view-rules'),
    check: byId('view-check'),
    mails: byId('view-mails'),
    groups: byId('view-groups')
  };
  function showTab(t){
    Object.values(views).forEach(v=>v && (v.style.display='none'));
    Object.values(tabs).forEach(x=>x && x.classList.remove('active'));
    if(views[t]) views[t].style.display='block';
    if(tabs[t]) tabs[t].classList.add('active');
  }

  /* =========================================================
     GITHUB STORAGE (multi fichiers) via proxy Vercel
     ========================================================= */

  function ghEnabled() {
    return !!(window.GH_OWNER && window.GH_REPO && window.GH_PATHS);
  }

  // ✅ PATCH: lecture via /api/github (mode "read") => plus de cache raw
  async function ghGetContent(path) {
    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, message: "read" }),
      cache: "no-store", 
      keepalive: true
    });

    const data = await res.json().catch(()=>({}));
    if (!res.ok) {
      console.error("❌ Read failed:", data);
      throw new Error(data?.error || "Read failed");
    }
    return { content: data.content };
  }

  // ✅ PATCH: keepalive pour les sorties rapides
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
      }),
      keepalive: true
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
     ✅ AJOUT: refresh ciblé au changement d'onglet / retour page
     ========================================================= */

  async function refreshOnTab(tab){
    if(!ghEnabled()) return;
    try{
      if(tab === "rules") await ghLoadRulesIfAny();
      if(tab === "check") await ghLoadCheckIfAny();
      if(tab === "mails") await ghLoadMailsIfAny();
      if(tab === "home")  await ghLoadHomeIfAny();
      if(tab === "groups") await ghLoadHomeIfAny();
      await updateGhStatusFromHome();
    }catch(e){
      console.warn("refreshOnTab:", tab, e);
    }
  }

  // ✅ MODIF: refresh à chaque clic onglet
  tabs.home?.addEventListener('click', async e=>{
    e.preventDefault();
    await refreshOnTab("home");
    showTab('home');
  });

  tabs.vcc?.addEventListener('click', async e=>{
    e.preventDefault();
    // VCC dépend du dernier import (home), donc on refresh home avant
    await refreshOnTab("home");
    showTab('vcc');
    renderVccMissingArrhesPrepay();
  });

  tabs.rules?.addEventListener('click', async e=>{
    e.preventDefault();
    await refreshOnTab("rules");
    showTab('rules');
  });

  tabs.check?.addEventListener('click', async e=>{
    e.preventDefault();
    await refreshOnTab("check");
    showTab('check');
  });

  tabs.mails?.addEventListener('click', async e=>{
    e.preventDefault();
    await refreshOnTab("mails");
    showTab('mails');
  });


tabs.groups?.addEventListener('click', async e=>{
  e.preventDefault();
  // Groupes dépend du dernier import (home)
  await refreshOnTab("groups");
  showTab('groups');
  renderGroupsFromHome();
});

  showTab('home');

  // Bouton "recalculer" dans l'onglet VCC
  byId('vcc-refresh')?.addEventListener('click', async ()=>{
    await refreshOnTab("home");
    showTab('vcc');
    renderVccMissingArrhesPrepay();
  });

  // ✅ AJOUT: refresh quand tu reviens sur la page (alt-tab / retour focus)
  document.addEventListener("visibilitychange", ()=>{
    if(document.visibilityState === "visible"){
      // On ne reload pas tout en dur : on refresh l'onglet actif le plus probable
      // (si tu veux, on peut détecter l'actif via .active)
      refreshOnTab("home");
      refreshOnTab("rules");
      refreshOnTab("check");
      refreshOnTab("mails");
    }
  });
  window.addEventListener("focus", ()=>{
    refreshOnTab("home");
    refreshOnTab("rules");
    refreshOnTab("check");
    refreshOnTab("mails");
  });

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

  // ✅ PATCH: timestamp local anti-écrasement
  const LS_CHECK_TS = "aar_check_ts_v1";
  function touchCheckTs(){
    const ts = new Date().toISOString();
    localStorage.setItem(LS_CHECK_TS, ts);
    return ts;
  }

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
    // ✅ PATCH: local instant + TS partagé (local/cloud)
    const ts = touchCheckTs();

    localStorage.setItem(LS_CHECK, JSON.stringify(checklist));
    if(memoEl) localStorage.setItem(LS_MEMO, memoEl.value);

    if(ghEnabled()){
      await ghSaveSnapshot(
        window.GH_PATHS.check,
        {
          checklist,
          memo: memoEl ? memoEl.value : "",
          ts
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

      // ✅ PATCH: anti-écrasement (si local plus récent que cloud, on ignore)
      const localTs = localStorage.getItem(LS_CHECK_TS);
      const cloudTs = data?.ts || null;
      if (localTs && cloudTs && new Date(localTs) > new Date(cloudTs)) {
        return false;
      }

      if(data){
        if(Array.isArray(data.checklist)) checklist = data.checklist;
        if(memoEl && typeof data.memo === "string") memoEl.value = data.memo;

        localStorage.setItem(LS_CHECK, JSON.stringify(checklist));
        if(memoEl) localStorage.setItem(LS_MEMO, memoEl.value);
        if (cloudTs) localStorage.setItem(LS_CHECK_TS, cloudTs);

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
      try{ data = JSON.parse((meta?.content||'').trim() || '{}'); }cat
/* =========================================================
   FONCTIONS PARSE FOLS + HOME (import fichiers) + VCC + GROUPES
   ========================================================= */

const LS_HOME = "aar_home_v3";

// Home state (source unique pour VCC + Groupes)
let HOME = JSON.parse(localStorage.getItem(LS_HOME) || "null") || {
  ts: null,
  files: [],
  arrivals: [],   // individus + lignes
  groups: []      // agrégats groupe (calculés)
};

function saveHomeLocal(){
  localStorage.setItem(LS_HOME, JSON.stringify(HOME));
}

async function saveHomeEverywhere(){
  saveHomeLocal();
  if(ghEnabled()){
    await ghSaveSnapshot(
      window.GH_PATHS.home,
      { ...HOME, ts: new Date().toISOString() },
      `Home update (${new Date().toLocaleString("fr-FR")})`
    );
  }
  await updateGhStatusFromHome();
}

async function ghLoadHomeIfAny(){
  // source de vérité : GitHub si dispo, sinon LS
  if(!ghEnabled()){
    // local only
    HOME = JSON.parse(localStorage.getItem(LS_HOME) || "null") || HOME;
    renderHomeSummary();
    return false;
  }
  try{
    const meta = await ghGetContent(window.GH_PATHS.home);
    let data=null;
    try{ data = JSON.parse((meta?.content||"").trim() || "{}"); }catch{ data=null; }
    if(data){
      HOME = {
        ts: data.ts || null,
        files: Array.isArray(data.files) ? data.files : [],
        arrivals: Array.isArray(data.arrivals) ? data.arrivals : [],
        groups: Array.isArray(data.groups) ? data.groups : []
      };
      saveHomeLocal();
      renderHomeSummary();
      return true;
    }
  }catch(e){
    console.warn("⚠️ ghLoadHomeIfAny:", e);
  }
  return false;
}

/* ---------- Parsing helpers ---------- */

function parseDateFR(s){
  // "03/02/2026 00:00:00" -> Date
  if(!s) return null;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if(!m) return null;
  const dd=+m[1], mm=+m[2]-1, yy=+m[3];
  const hh=+(m[4]||0), mi=+(m[5]||0), ss=+(m[6]||0);
  const d = new Date(Date.UTC(yy,mm,dd,hh,mi,ss));
  return isNaN(d.getTime()) ? null : d;
}

function fmtISO(d){
  if(!d) return "";
  // keep local date, but source is UTC midnight, so use UTC to avoid TZ shift
  const y=d.getUTCFullYear();
  const m=String(d.getUTCMonth()+1).padStart(2,"0");
  const da=String(d.getUTCDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}

// CSV ; avec guillemets doubles (rapide, sans libs)
function parseCsvSemicolon(text){
  const rows=[];
  let row=[], cur="", inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(inQ){
      if(c === '"'){
        if(text[i+1] === '"'){ cur+='"'; i++; }
        else inQ=false;
      }else cur+=c;
    }else{
      if(c === '"') inQ=true;
      else if(c === ';'){ row.push(cur); cur=""; }
      else if(c === '\n'){
        row.push(cur); cur="";
        // drop CR
        if(row.length===1 && row[0]==="") { row=[]; continue; }
        rows.push(row.map(x=>x.replace(/\r$/,"")));
        row=[];
      }else cur+=c;
    }
  }
  // last cell
  if(cur.length || row.length){
    row.push(cur);
    rows.push(row.map(x=>x.replace(/\r$/,"")));
  }
  if(!rows.length) return {header:[], data:[]};
  const header = rows[0].map(h=>h.trim());
  const data = [];
  for(let r=1;r<rows.length;r++){
    if(rows[r].every(x=>(x||"").trim()==="")) continue;
    const obj={};
    for(let j=0;j<header.length;j++){
      obj[header[j]] = (rows[r][j] ?? "").trim();
    }
    data.push(obj);
  }
  return {header, data};
}

function normalizeGroupName(s){
  // important : EXACT match demandé => on ne touche pas au contenu,
  // mais on harmonise les espaces invisibles en fin/début.
  return (s ?? "").replace(/\s+/g," ").trim();
}

function computeGroupsFromRows(rows){
  // rows: tableau d'obj avec GUES_GROUPNAME, PSER_DATE, Departure_Date, NB_NIGHTS, NB_OCC_AD, NB_OCC_CH
  const map = new Map();

  for(const r of rows){
    const raw = r.GUES_GROUPNAME || "";
    const key = normalizeGroupName(raw);
    if(!key) continue;

    const g = map.get(key) || {
      name: key,
      rooms: 0,
      adults: 0,
      children: 0,
      minArr: null,
      maxDep: null,
      minN: null,
      maxN: null,
      roomTypes: {}, // TRI/STDM... => count
    };

    g.rooms += 1;

    const ad = parseInt(r.NB_OCC_AD || "0", 10);
    const ch = parseInt(r.NB_OCC_CH || "0", 10);
    if(!isNaN(ad)) g.adults += ad;
    if(!isNaN(ch)) g.children += ch;

    const arr = parseDateFR(r.PSER_DATE);
    const dep = parseDateFR(r.Departure_Date);
    if(arr && (!g.minArr || arr < g.minArr)) g.minArr = arr;
    if(dep && (!g.maxDep || dep > g.maxDep)) g.maxDep = dep;

    const n = parseInt(r.NB_NIGHTS || "", 10);
    if(!isNaN(n)){
      g.minN = (g.minN===null) ? n : Math.min(g.minN, n);
      g.maxN = (g.maxN===null) ? n : Math.max(g.maxN, n);
    }

    const rt = (r.ROOM_TYPE || "").trim();
    if(rt){
      g.roomTypes[rt] = (g.roomTypes[rt] || 0) + 1;
    }

    map.set(key, g);
  }

  const out = Array.from(map.values()).map(g=>{
    const nights = (g.minN!==null && g.maxN!==null)
      ? (g.minN===g.maxN ? `${g.minN}` : `${g.minN}-${g.maxN}`)
      : "";
    const comp = `${g.adults}A+${g.children}E`;

    const roomTypes = Object.entries(g.roomTypes)
      .sort((a,b)=>b[1]-a[1])
      .map(([k,v])=>`${k}:${v}`).join(" ");

    return {
      name: g.name,
      rooms: g.rooms,
      arrival: fmtISO(g.minArr),
      departure: fmtISO(g.maxDep),
      nights,
      comp,
      roomTypes
    };
  });

  // tri : date d'arrivée puis nom
  out.sort((a,b)=> (a.arrival||"").localeCompare(b.arrival||"") || a.name.localeCompare(b.name));
  return out;
}

function renderHomeSummary(){
  const out = byId("output");
  if(!out) return;

  const lines = [];
  lines.push(`<div class="card"><div class="row"><strong>Dernier import</strong><div class="right small muted">${HOME.ts ? new Date(HOME.ts).toLocaleString("fr-FR") : "–"}</div></div>`);
  lines.push(`<div class="muted small" style="margin-top:6px">Fichiers: ${HOME.files?.length ? HOME.files.join(" · ") : "–"}</div>`);
  lines.push(`<div style="margin-top:10px" class="small">Individuels: <strong>${HOME.arrivals?.length || 0}</strong> lignes</div>`);
  lines.push(`<div class="small">Groupes: <strong>${HOME.groups?.length || 0}</strong> groupes</div>`);
  lines.push(`<div class="muted small" style="margin-top:10px">⚠️ Onglets VCC + Groupes se recalculent depuis ce state Home.</div>`);
  lines.push(`</div>`);

  out.innerHTML = lines.join("\n");
}

/* ---------- HOME import UI (drop zone) ---------- */

function isLikelyFolsArrivalFile(header){
  const h = new Set(header);
  return h.has("GUES_NAME") && h.has("RATE") && h.has("GUARANTY");
}

function isLikelyGroupFile(header){
  const h = new Set(header);
  return h.has("GUES_GROUPNAME") && h.has("PSER_DATE") && h.has("Departure_Date");
}

async function handleImportedTextFile(filename, text){
  const {header, data} = parseCsvSemicolon(text);

  if(isLikelyGroupFile(header)){
    // on garde toutes les lignes (même celles sans groupe) pour VCC éventuel,
    // mais on calcule groups uniquement à partir des lignes avec GUES_GROUPNAME
    HOME.arrivals = data;
    HOME.groups = computeGroupsFromRows(data);
    HOME.files = [filename];
    await saveHomeEverywhere();
    renderHomeSummary();
    toast("✅ Import groupes OK (Home)");
    return;
  }

  if(isLikelyFolsArrivalFile(header)){
    HOME.arrivals = data;
    // si on importe un fichier individuel, on ne détruit pas un éventuel calcul de groupes
    HOME.groups = HOME.groups || [];
    HOME.files = [filename];
    await saveHomeEverywhere();
    renderHomeSummary();
    toast("✅ Import arrivées OK (Home)");
    return;
  }

  toast("⚠️ Fichier non reconnu (header inattendu)");
  console.warn("Header non reconnu:", header);
}

function installHomeDropZone(){
  const dz = byId("drop-zone");
  const fileInput = byId("file-input");
  if(!dz || !fileInput) return;

  dz.addEventListener("click", ()=>fileInput.click());

  dz.addEventListener("dragover", (e)=>{
    e.preventDefault();
    dz.classList.add("dragover");
  });
  dz.addEventListener("dragleave", ()=>dz.classList.remove("dragover"));
  dz.addEventListener("drop", async (e)=>{
    e.preventDefault();
    dz.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files || []);
    await handleHomeFiles(files);
  });

  fileInput.addEventListener("change", async (e)=>{
    const files = Array.from(e.target.files || []);
    await handleHomeFiles(files);
    fileInput.value = "";
  });
}

async function handleHomeFiles(files){
  if(!files?.length) return;

  // ✅ Méthode "plus intelligente" : on lit et classifie en 1 passe,
  // et on ne parse que les fichiers utiles.
  // (Tu peux drop plusieurs fichiers : on choisit l'arrivals / group list en priorité)
  const readAsText = (f)=>new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>res(String(r.result||""));
    r.onerror=()=>rej(r.error||new Error("read error"));
    r.readAsText(f);
  });

  // priorité : si un fichier contient GUES_GROUPNAME, on le traite comme "group list"
  for(const f of files){
    if(!/\.csv$|\.txt$/i.test(f.name)) continue;
    const txt = await readAsText(f);
    const headLine = (txt.split(/\r?\n/)[0] || "");
    if(headLine.includes("GUES_GROUPNAME") && headLine.includes("PSER_DATE")){
      await handleImportedTextFile(f.name, txt);
      return;
    }
  }

  // sinon : prend le premier arrivals-like
  for(const f of files){
    if(!/\.csv$|\.txt$/i.test(f.name)) continue;
    const txt = await readAsText(f);
    const headLine = (txt.split(/\r?\n/)[0] || "");
    if(headLine.includes("GUES_NAME") && headLine.includes("RATE") && headLine.includes("GUARANTY")){
      await handleImportedTextFile(f.name, txt);
      return;
    }
  }

  // fallback : premier fichier texte
  const f = files.find(x=>/\.csv$|\.txt$/i.test(x.name));
  if(!f){ toast("⚠️ Aucun fichier .csv/.txt"); return; }
  const txt = await readAsText(f);
  await handleImportedTextFile(f.name, txt);
}

/* ---------- VCC ---------- */

const VCC_RATE_TARGETS = [
  "FLMRB4", "FMRA4S", "FMRB4S", "FLRB4", "FLRA4S"
];

function rateIsTarget(rate){
  const r = (rate||"").toUpperCase();
  return VCC_RATE_TARGETS.some(k=>r.includes(k));
}

function hasArrhesOrPrepay(guar){
  const g = stripAccentsLower(guar||"");
  return g.includes("arrhes") || g.includes("prepay");
}

function renderVccMissingArrhesPrepay(){
  const out = byId("vcc-output");
  const status = byId("vcc-status");
  if(!out) return;

  const rows = Array.isArray(HOME.arrivals) ? HOME.arrivals : [];
  const bad = rows.filter(r => rateIsTarget(r.RATE) && !hasArrhesOrPrepay(r.GUARANTY));

  if(status) status.textContent = `${bad.length} lignes`;

  if(!bad.length){
    out.innerHTML = `<div class="muted">✅ Rien à signaler.</div>`;
    byId("vcc-copy") && (byId("vcc-copy").onclick = ()=>navigator.clipboard.writeText(""));
    return;
  }

  const lines = bad.map(r=>{
    const name = (r.GUES_NAME || "").trim() || "(sans nom)";
    const rate = (r.RATE || "").trim();
    const guar = (r.GUARANTY || "").trim();
    const gname = normalizeGroupName(r.GUES_GROUPNAME || "");
    return `${name} | RATE=${rate} | GUARANTY=${guar}${gname ? " | GROUPE="+gname : ""}`;
  });

  out.innerHTML = `<pre style="white-space:pre-wrap">${lines.join("\n")}</pre>`;

  byId("vcc-copy") && (byId("vcc-copy").onclick = ()=>{
    navigator.clipboard.writeText(lines.join("\n"));
    toast("✔ Liste VCC copiée");
  });
}

/* ---------- GROUPES ---------- */

function isoWeekKeyFromISODate(iso){
  // iso "YYYY-MM-DD"
  if(!iso) return "";
  const [y,m,d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y,m-1,d));
  // ISO week algorithm
  const dayNum = (date.getUTCDay() + 6) % 7; // 0=Mon
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // Thu
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(),0,4));
  const firstDayNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date - firstThu) / (7*24*3600*1000));
  const year = date.getUTCFullYear();
  return `${year}-W${String(week).padStart(2,"0")}`;
}

function renderGroupsFromHome(){
  const wrap = byId("groups-output");
  const status = byId("groups-status");
  if(!wrap) return;

  const groups = Array.isArray(HOME.groups) ? HOME.groups : [];
  if(status) status.textContent = `${groups.length} groupes`;

  if(!groups.length){
    wrap.innerHTML = `<div class="muted">Aucun groupe détecté. (Importe un fichier avec la colonne <strong>GUES_GROUPNAME</strong>.)</div>`;
    return;
  }

  // segmentation : 4 premières semaines (selon la première date trouvée)
  const weeks = [];
  for(const g of groups){
    const wk = isoWeekKeyFromISODate(g.arrival);
    if(wk && !weeks.includes(wk)) weeks.push(wk);
  }
  weeks.sort();
  const keepWeeks = weeks.slice(0,4);
  const filtered = groups.filter(g=>keepWeeks.includes(isoWeekKeyFromISODate(g.arrival)));

  const byWeek = new Map();
  for(const g of filtered){
    const wk = isoWeekKeyFromISODate(g.arrival) || "–";
    if(!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk).push(g);
  }

  const html = [];
  for(const wk of Array.from(byWeek.keys()).sort()){
    html.push(`<h3 style="margin:18px 0 10px 0">${wk}</h3>`);
    html.push(`<table><thead><tr>
      <th>Groupe</th><th>Ch</th><th>Dates</th><th>Nuits</th><th>Compo</th><th>Types</th>
    </tr></thead><tbody>`);
    for(const g of byWeek.get(wk)){
      html.push(`<tr>
        <td>${g.name}</td>
        <td>${g.rooms}</td>
        <td>${g.arrival}→${g.departure}</td>
        <td>${g.nights ? g.nights : "–"}</td>
        <td>${g.comp}</td>
        <td class="muted small">${g.roomTypes || ""}</td>
      </tr>`);
    }
    html.push(`</tbody></table>`);
  }

  html.push(`<div class="muted small" style="margin-top:12px">Affichage volontairement limité aux <strong>4 premières semaines</strong> (comme ton exemple). On enlèvera ce filtre quand tu valides.</div>`);

  wrap.innerHTML = html.join("\n");

  // copy
  byId("groups-copy") && (byId("groups-copy").onclick = ()=>{
    const lines = filtered.map(g=>`${g.name} | ${g.rooms} ch | ${g.arrival}→${g.departure} | ${g.nights} nuit(s) | compo: ${g.comp}`);
    navigator.clipboard.writeText(lines.join("\n"));
    toast("✔ Groupes copiés");
  });
}

byId("groups-refresh")?.addEventListener("click", async ()=>{
  await refreshOnTab("groups");
  showTab("groups");
  renderGroupsFromHome();
});

/* ---------- Init HOME ---------- */
installHomeDropZone();
renderHomeSummary();
ilsIfAny:", e);
    }
    return false;
  }

  /* =========================================================
     FONCTIONS PARSE FOLS (inchangées)
     ========================================================= */

  // ... (le reste de ton fichier ne change pas)
  // IMPORTANT : garde exactement le reste tel quel.

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
