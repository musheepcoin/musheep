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
  groups: byId('tab-groups'),
  vcc:   byId('tab-vcc'),
  rules: byId('tab-rules'),
  check: byId('tab-check'),
  mails: byId('tab-mails')
  };
  const views = {
    home:  byId('view-home'),
  groups: byId('view-groups'),
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

// 🔧 STUB TEMPORAIRE — évite crash si ghLoadHomeIfAny n’est pas encore défini
async function ghLoadHomeIfAny() {
  return false;
}
/*
  =========================================================
     ✅ AJOUT: refresh ciblé au changement d'onglet / retour page
     ========================================================= */

  async function refreshOnTab(tab){
    if(!ghEnabled()) return;
    try{
      if(tab === "rules") await ghLoadRulesIfAny();
      if(tab === "check") await ghLoadCheckIfAny();
      if(tab === "mails") await ghLoadMailsIfAny();
      if(tab === "home")  await ghLoadHomeIfAny();
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
  // pour l’instant, les groupes dépendent juste des données home déjà chargées
  showTab('groups');
  // si le module groupes est chargé, on le laisse recalculer
  if (typeof window.onGroupsSourceUpdated === "function") {
    window.onGroupsSourceUpdated();
  }
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
