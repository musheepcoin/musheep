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
  const LS_ACDC_ALERTS = 'aar_acdc_alerts_v1';
  const LS_ACDC_SOFA = 'aar_acdc_sofa_v1';

  let STATE = {
    ts: null,
    arrivals_csv: "",
    credit_limit_csv: "",
    rules: null,
    checklist: null,
    memo: "",
    tarifs: null,
    emails: null,
    home_arrivals_stats_source: "",
    acdc_alerts: null,
    acdc_sofa: null
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
      STATE.acdc_alerts = safeJsonParse(localStorage.getItem(LS_ACDC_ALERTS) || 'null', null);
      STATE.acdc_sofa = safeJsonParse(localStorage.getItem(LS_ACDC_SOFA) || 'null', null);

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
    overview: byId('tab-overview'),
    indiv:  byId('tab-indiv'),
    groups: byId('tab-groups'),
    vcc:    byId('tab-vcc'),
    dd:     byId('tab-dd'),     // ✅
    rules:  byId('tab-rules'),
    check:  byId('tab-check'),
    tarifs: byId('tab-tarifs'),
    inventory: byId('tab-inventory'),
    mails:  byId('tab-mails'),
    hotelia: byId('tab-hotel-ia')
  };

  const views = {
    home:   byId('view-home'),
    overview: byId('view-overview'),
    indiv:  byId('view-indiv'),
    groups: byId('view-groups'),
    vcc:    byId('view-vcc'),
    dd:     byId('view-dd'),    // ✅
    rules:  byId('view-rules'),
    check:  byId('view-check'),
    tarifs: byId('view-tarifs'),
    inventory: byId('view-inventory'),
    mails:  byId('view-mails'),
    hotelia: byId('view-hotel-ia')
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

  // --- Handlers tabs (tous avant showTab('home')) ---
  tabs.home?.addEventListener('click', e=>{ e.preventDefault(); showTab('home'); });

  tabs.overview?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('overview');
    if (window.OVERVIEW && typeof window.OVERVIEW.refresh === "function") {
      window.OVERVIEW.refresh(true);
    }
  });

  tabs.indiv?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('indiv');
  });

  tabs.groups?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('groups');
    if (typeof window.onGroupsSourceUpdated === "function") {
      window.onGroupsSourceUpdated();
    }
  });

  tabs.vcc?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('vcc');
    renderVccMissingArrhesPrepay();
  });

  tabs.dd?.addEventListener('click', e=>{
  e.preventDefault();
  showTab('dd');
  window.DD?.refresh?.();
});

  tabs.rules?.addEventListener('click', e=>{ e.preventDefault(); showTab('rules'); });
  tabs.check?.addEventListener('click', e=>{ e.preventDefault(); showTab('check'); });
  tabs.tarifs?.addEventListener('click', e=>{ e.preventDefault(); showTab('tarifs'); });
  tabs.inventory?.addEventListener('click', e=>{ e.preventDefault(); showTab('inventory'); });
  tabs.mails?.addEventListener('click', e=>{ e.preventDefault(); showTab('mails'); });
  tabs.hotelia?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('hotelia');
    window.HOTELIA?.render?.(byId('hotel-ia-output'));
  });

  // ✅ Tab initial (après avoir enregistré tous les handlers)
  showTab('home');

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
    },
    assignment_watch: [],
    checklists: {
      morning: [
        { id: 'm_export_fols', text: 'Export FOLS' },
        { id: 'm_verifier_arrivees', text: 'Vérifier arrivées du jour' },
        { id: 'm_verifier_groupes', text: 'Vérifier groupes' },
        { id: 'm_verifier_vcc', text: 'Vérifier VCC' },
        { id: 'm_preparer_gouvernante', text: 'Préparer gouvernante' }
      ],
      evening: [
        { id: 'e_verifier_arrivees_restantes', text: 'Vérifier arrivées restantes' },
        { id: 'e_controler_caisse', text: 'Contrôler caisse' },
        { id: 'e_verifier_vcc_restantes', text: 'Vérifier VCC restantes' },
        { id: 'e_preparer_plan_chambres', text: 'Préparer plan chambres' },
        { id: 'e_verifier_mails_societes', text: 'Vérifier mails / sociétés' }
      ]
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

  function makeChecklistRuleId(prefix){
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  }

  function normalizeChecklistRuleItems(list, prefix){
    if (!Array.isArray(list)) return [];
    return list.map((item, idx)=>{
      if (typeof item === 'string') {
        return { id: makeChecklistRuleId(prefix || 'chk'), text: item };
      }
      const text = String(item?.text || '').trim();
      const id = String(item?.id || '').trim() || makeChecklistRuleId(prefix || 'chk');
      return { id, text };
    }).filter(x => x.text);
  }

  function loadRules(){
    try{
      const raw=localStorage.getItem(LS_RULES);
      if(!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const o = JSON.parse(raw);
      return {
        keywords:{...DEFAULTS.keywords,...(o.keywords||{})},
        vcc_rates: Array.isArray(o.vcc_rates) ? o.vcc_rates : DEFAULTS.vcc_rates.slice(),
        sofa:{...DEFAULTS.sofa,...(o.sofa||{})},
        assignment_watch: Array.isArray(o.assignment_watch) ? o.assignment_watch : DEFAULTS.assignment_watch.slice(),
        checklists: {
          morning: normalizeChecklistRuleItems(o?.checklists?.morning ?? DEFAULTS.checklists.morning, 'm'),
          evening: normalizeChecklistRuleItems(o?.checklists?.evening ?? DEFAULTS.checklists.evening, 'e')
        }
      };
    }catch(_){ return JSON.parse(JSON.stringify(DEFAULTS)); }
  }
  let RULES = loadRules();

  function saveRules(){
    localStorage.setItem(LS_RULES, JSON.stringify(RULES));
    window.TODO?.refreshHomeChecklist?.();

    // garde Alerte en phase avec la règle courante sans refresh
    try{
      const liveRows =
        (Array.isArray(window.__AAR_LAST_FOLS_ROWS) && window.__AAR_LAST_FOLS_ROWS.length)
          ? window.__AAR_LAST_FOLS_ROWS
          : ((typeof LAST_FOLS_ROWS !== 'undefined' && Array.isArray(LAST_FOLS_ROWS)) ? LAST_FOLS_ROWS : []);
      if(liveRows.length){
        syncMonthlyAlerts(liveRows);
      }
    }catch(err){
      console.warn('live rules sync failed:', err);
    }
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

  function parseRoomSpec(spec){
    const out = new Set();
    String(spec || '').split(',').map(s=>s.trim()).filter(Boolean).forEach(part=>{
      const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if(m){
        let a = parseInt(m[1],10), b = parseInt(m[2],10);
        if(Number.isFinite(a) && Number.isFinite(b)){
          if(a>b){ const t=a; a=b; b=t; }
          for(let n=a;n<=b;n++) out.add(String(n));
        }
      } else {
        const one = part.match(/^(\d+)$/);
        if(one) out.add(String(parseInt(one[1],10)));
      }
    });
    return out;
  }

  function formatShortFrDate(v){
    const d = parseFolsDateCell(v);
    if(!d || isNaN(d)) return '';
    const dd = String(d.getUTCDate()).padStart(2,'0');
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    return `${dd}/${mm}`;
  }

  function assignmentWatchHaystack(row){
    return stripAccentsLower([
      pick(row, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME','GUES_FULLNAME','GUES FULLNAME']),
      pick(row, ['GUES_GROUPNAME','GROUP','GROUPE','Group']),
      pick(row, ['GUES_COMPNAME','COMPANY','SOCIETE','Societe','Company']),
      row.__text || '',
      row.__first || ''
    ].filter(Boolean).join(' | '));
  }

  function extractRowRoom(row){
    const raw = String(pick(row, ['RoomNumPref','ROOM_NUM','ROOM','CHAMBRE','CHB']) || '').trim();
    const m = raw.match(/\d{2,4}/);
    return m ? m[0] : '';
  }

  function buildAssignmentWatchAlerts(rows){
    const rules = Array.isArray(RULES.assignment_watch) ? RULES.assignment_watch : [];
    if(!Array.isArray(rows) || !rows.length || !rules.length) return [];

    const alerts = [];
    rules.forEach((rule, idx)=>{
      const ruleName = String(rule?.name || '').trim();
      const roomsSpec = String(rule?.rooms || '').trim();
      if(!ruleName || !roomsSpec) return;

      const nameNorm = stripAccentsLower(ruleName);
      const expected = parseRoomSpec(roomsSpec);
      if(!expected.size) return;

      const matches = rows.filter(r => assignmentWatchHaystack(r).includes(nameNorm));
      if(!matches.length) return;

      const byDate = new Map();
      matches.forEach(r=>{
        const dateRaw = pick(r, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || '';
        const dateLabel = formatShortFrDate(dateRaw) || 'Date ?';
        if(!byDate.has(dateLabel)) byDate.set(dateLabel, []);
        byDate.get(dateLabel).push(r);
      });

      const details = [];
      byDate.forEach((rowsForDate, dateLabel)=>{
        const roomsDetected = Array.from(new Set(rowsForDate.map(extractRowRoom).filter(Boolean)));
        const ok = roomsDetected.some(r => expected.has(String(r)));
        if(ok) return;
        details.push({
          date: dateLabel,
          detected: roomsDetected.length ? roomsDetected.join(', ') : 'N/A'
        });
      });

      if(!details.length) return;
      details.sort((a,b)=> String(a.date||'').localeCompare(String(b.date||''),'fr'));
      alerts.push({
        id: `assignment_watch_${idx}_${nameNorm}`,
        kind: 'assignment_watch',
        done: false,
        text: `${ruleName} (${roomsSpec}) — ${details.map(d => `${d.date}: ${d.detected}`).join(' • ')}`,
        meta: {
          name: ruleName,
          expected: roomsSpec,
          grouped: true,
          details
        }
      });
    });

    alerts.sort((a,b)=> String(a?.meta?.name||'').localeCompare(String(b?.meta?.name||''),'fr'));
    return alerts;
  }

  function syncMonthlyAlerts(rows){
    const key = 'aar_todo_week_v1';
    const existing = safeJsonParse(localStorage.getItem(key) || '[]', []);
    const manual = Array.isArray(existing) ? existing.filter(x => x?.kind !== 'assignment_watch') : [];
    const alerts = buildAssignmentWatchAlerts(rows);
    localStorage.setItem(key, JSON.stringify([...manual, ...alerts]));
    if(window.TODO?.refresh) window.TODO.refresh();
  }

  function refreshAssignmentWatchAlerts(){
    syncMonthlyAlerts(Array.isArray(LAST_FOLS_ROWS) ? LAST_FOLS_ROWS : []);
  }

  function renderRulesChecklistModel(){
    const mappings = [
      { side:'morning', hostId:'rules-check-morning-list', addId:'rules-check-morning-add', prefix:'m' },
      { side:'evening', hostId:'rules-check-evening-list', addId:'rules-check-evening-add', prefix:'e' }
    ];

    mappings.forEach(cfg=>{
      const host = byId(cfg.hostId);
      const addBtn = byId(cfg.addId);
      if(!host) return;
      host.innerHTML = '';

      const list = Array.isArray(RULES.checklists?.[cfg.side]) ? RULES.checklists[cfg.side] : [];
      if(!list.length){
        const empty = document.createElement('div');
        empty.className = 'muted rules-checklist-empty';
        empty.textContent = 'Aucune tâche fixe.';
        host.appendChild(empty);
      } else {
        list.forEach((item, i)=>{
          const row = document.createElement('div');
          row.className = 'rules-checklist-row';

          const input = document.createElement('input');
          input.type = 'text';
          input.value = item?.text || '';
          input.placeholder = 'Tâche fixe';
          input.addEventListener('input', ()=>{
            RULES.checklists[cfg.side][i].text = input.value;
            saveRules();
          });

          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'todo-del';
          del.textContent = '✕';
          del.title = 'Supprimer';
          del.addEventListener('click', ()=>{
            RULES.checklists[cfg.side].splice(i,1);
            saveRules();
            renderRulesChecklistModel();
          });

          row.append(input, del);
          host.appendChild(row);
        });
      }

      if(addBtn && !addBtn.dataset.bound){
        addBtn.dataset.bound = '1';
        addBtn.addEventListener('click', ()=>{
          if(!RULES.checklists) RULES.checklists = { morning:[], evening:[] };
          RULES.checklists[cfg.side].push({ id: makeChecklistRuleId(cfg.prefix), text:'' });
          saveRules();
          renderRulesChecklistModel();
          const inputs = host.querySelectorAll('input[type="text"]');
          inputs[inputs.length - 1]?.focus();
        });
      }
    });
  }

  function renderAssignmentWatchRules(){
    const host = byId('assignment-rules-list');
    if(!host) return;
    if(!Array.isArray(RULES.assignment_watch)) RULES.assignment_watch = [];
    host.innerHTML = '';

    if(!RULES.assignment_watch.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Aucune surveillance définie pour le moment.';
      host.appendChild(empty);
      return;
    }

    RULES.assignment_watch.forEach((rule, i)=>{
      const row = document.createElement('div');
      row.className = 'assignment-watch-row';

      const name = document.createElement('input');
      name.type = 'text';
      name.placeholder = 'Nom / société / groupe';
      name.value = rule?.name || '';
      name.addEventListener('input', ()=>{
        RULES.assignment_watch[i].name = name.value;
        saveRules();
        refreshAssignmentWatchAlerts();
      });

      const rooms = document.createElement('input');
      rooms.type = 'text';
      rooms.placeholder = '246-250, 360';
      rooms.value = rule?.rooms || '';
      rooms.addEventListener('input', ()=>{
        RULES.assignment_watch[i].rooms = rooms.value;
        saveRules();
        refreshAssignmentWatchAlerts();
      });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn warn';
      del.textContent = 'Supprimer';
      del.addEventListener('click', ()=>{
        RULES.assignment_watch.splice(i,1);
        saveRules();
        renderAssignmentWatchRules();
        renderRulesChecklistModel();
        refreshAssignmentWatchAlerts();
      });

      row.append(name, rooms, del);
      host.appendChild(row);
    });
  }

  renderSofaTable();
  populateKeywordAreas();
  renderAssignmentWatchRules();
  renderRulesChecklistModel();

  byId('btn-save')?.addEventListener('click',()=>{
    readKeywordAreasToRules();
    saveRules();
    renderAssignmentWatchRules();
    renderRulesChecklistModel();
    refreshAssignmentWatchAlerts();
    const s=byId('rules-status'); if(s){ s.textContent='Règles mises à jour ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
  });
  byId('btn-reset')?.addEventListener('click',()=>{
    RULES = JSON.parse(JSON.stringify(DEFAULTS));
    saveRules();
    renderSofaTable();
    populateKeywordAreas();
    renderAssignmentWatchRules();
    renderRulesChecklistModel();
    refreshAssignmentWatchAlerts();
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
          sofa:{...DEFAULTS.sofa,...(obj.sofa||{})},
          assignment_watch: Array.isArray(obj.assignment_watch) ? obj.assignment_watch : DEFAULTS.assignment_watch.slice(),
          checklists: {
            morning: normalizeChecklistRuleItems(obj?.checklists?.morning ?? DEFAULTS.checklists.morning, 'm'),
            evening: normalizeChecklistRuleItems(obj?.checklists?.evening ?? DEFAULTS.checklists.evening, 'e')
          }
        };
        saveRules();
        renderSofaTable();
        populateKeywordAreas();
        renderAssignmentWatchRules();
        renderRulesChecklistModel();
        refreshAssignmentWatchAlerts();
        const s=byId('rules-status'); if(s){ s.textContent='Règles importées ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
      }catch(err){ alert('Fichier JSON invalide'); }
    };
    reader.readAsText(f);
  });

  byId('assignment-rule-add')?.addEventListener('click', ()=>{
    if(!Array.isArray(RULES.assignment_watch)) RULES.assignment_watch = [];
    RULES.assignment_watch.push({ name:'', rooms:'' });
    renderAssignmentWatchRules();
    saveRules();
    refreshAssignmentWatchAlerts();
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
     EMAILS (email center refonte 2 colonnes)
     ========================================================= */
  const emailDefault = [
    {
      title: "Demande de facture",
      subject: "Facture — demande client",
      body: "Bonjour,\n\nVeuillez trouver ci-joint / ci-dessous la facture demandée.\n\nCordialement,\nRéception",
      to: ""
    },
    {
      title: "Réponse tardive",
      subject: "Réponse à votre demande",
      body: "Bonjour,\n\nMerci pour votre message. Nous revenons vers vous dès que possible.\n\nCordialement,\nRéception",
      to: ""
    }
  ];

  let emails = safeJsonParse(localStorage.getItem(LS_EMAILS) || 'null', null) || emailDefault.slice();
  let emailSelectedIndex = 0;
  let emailSearchTerm = "";

  function saveEmails(){
    localStorage.setItem(LS_EMAILS, JSON.stringify(emails));
    scheduleSaveState("emails update");
  }

  function getFilteredEmailIndexes(){
    const q = String(emailSearchTerm || '').trim().toLowerCase();
    return emails
      .map((m, idx)=>({ m, idx }))
      .filter(({m})=>{
        if(!q) return true;
        return [m?.title, m?.subject, m?.to, m?.body]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q));
      })
      .map(x=>x.idx);
  }

  function countRecipients(raw){
    return String(raw || '')
      .split(';')
      .map(s=>s.trim())
      .filter(Boolean)
      .length;
  }

  function ensureValidEmailSelection(filteredIdxs){
    if (!emails.length){
      emailSelectedIndex = -1;
      return;
    }
    if (emailSelectedIndex < 0 || emailSelectedIndex >= emails.length){
      emailSelectedIndex = 0;
    }
    if (filteredIdxs.length && !filteredIdxs.includes(emailSelectedIndex)){
      emailSelectedIndex = filteredIdxs[0];
    }
    if (!filteredIdxs.length){
      emailSelectedIndex = Math.min(Math.max(emailSelectedIndex, 0), emails.length - 1);
    }
  }

  function buildEmailListItem(idx){
    const m = emails[idx] || {};
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'email-center-item' + (idx === emailSelectedIndex ? ' is-active' : '');
    item.addEventListener('click', ()=>{
      emailSelectedIndex = idx;
      renderEmails();
    });

    const top = document.createElement('div');
    top.className = 'email-center-item-top';

    const title = document.createElement('div');
    title.className = 'email-center-item-title';
    title.textContent = m.title || 'Sans titre';

    const chev = document.createElement('div');
    chev.className = 'email-center-item-arrow';
    chev.textContent = '›';

    top.append(title, chev);

    const meta = document.createElement('div');
    meta.className = 'email-center-item-meta';
    const count = countRecipients(m.to);
    meta.textContent = `${count} destinataire${count > 1 ? 's' : ''}`;

    item.append(top, meta);
    return item;
  }

  function buildEmailEditor(idx){
    const m = emails[idx];
    const panel = document.createElement('div');
    panel.className = 'email-center-editor';

    if (!m){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Aucun modèle disponible.';
      panel.appendChild(empty);
      return panel;
    }

    const head = document.createElement('div');
    head.className = 'email-center-editor-head';

    const headTitle = document.createElement('input');
    headTitle.className = 'email-center-main-title';
    headTitle.value = m.title || '';
    headTitle.placeholder = 'Titre du modèle';
    headTitle.addEventListener('input', ()=>{
      emails[idx].title = headTitle.value;
      saveEmails();
    });
    headTitle.addEventListener('blur', ()=> renderEmails());

    head.appendChild(headTitle);

    const recField = document.createElement('div');
    recField.className = 'email-center-field';

    const recLabel = document.createElement('label');
    recLabel.textContent = 'Destinataires';

    const recWrap = document.createElement('div');
    recWrap.className = 'email-center-recipient-box';

    const recipients = String(m.to || '').split(';').map(s=>s.trim()).filter(Boolean);
    if (recipients.length){
      recipients.forEach(addr=>{
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'email-chip email-chip-copy';
        chip.textContent = addr;
        chip.title = 'Copier ' + addr;
        chip.addEventListener('click', async ()=>{
          try{
            await navigator.clipboard.writeText(addr);
            if (window.AAR?.toast) window.AAR.toast('Copié : ' + addr);
          }catch(_){
            try{
              const ta = document.createElement('textarea');
              ta.value = addr;
              ta.style.position = 'fixed';
              ta.style.opacity = '0';
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              ta.remove();
              if (window.AAR?.toast) window.AAR.toast('Copié : ' + addr);
            }catch(__){}
          }
        });
        recWrap.appendChild(chip);
      });
    } else {
      const none = document.createElement('div');
      none.className = 'muted small';
      none.textContent = 'Aucun destinataire';
      recWrap.appendChild(none);
    }

    const recInput = document.createElement('input');
    recInput.className = 'email-center-hidden-input';
    recInput.value = m.to || '';
    recInput.placeholder = 'email1@...; email2@...';
    recInput.addEventListener('input', ()=>{
      emails[idx].to = recInput.value;
      saveEmails();
    });
    recInput.addEventListener('blur', ()=> renderEmails());

    recField.append(recLabel, recWrap, recInput);

    const subjField = document.createElement('div');
    subjField.className = 'email-center-field';

    const subjLabel = document.createElement('label');
    subjLabel.textContent = 'Sujet';

    const subj = document.createElement('input');
    subj.value = m.subject || '';
    subj.placeholder = 'Sujet';
    subj.addEventListener('input', ()=>{
      emails[idx].subject = subj.value;
      saveEmails();
    });
    subj.addEventListener('blur', ()=> renderEmails());

    subjField.append(subjLabel, subj);

    const bodyField = document.createElement('div');
    bodyField.className = 'email-center-field';

    const bodyLabel = document.createElement('label');
    bodyLabel.textContent = 'Aperçu du message';

    const body = document.createElement('textarea');
    body.value = m.body || '';
    body.placeholder = 'Contenu';
    body.addEventListener('input', ()=>{
      emails[idx].body = body.value;
      saveEmails();
    });

    bodyField.append(bodyLabel, body);

    const footer = document.createElement('div');
    footer.className = 'email-center-footer';

    const left = document.createElement('div');
    left.className = 'email-center-footer-left';

    const addRecipient = document.createElement('button');
    addRecipient.type = 'button';
    addRecipient.className = 'btn';
    addRecipient.textContent = '+ Ajouter';
    addRecipient.addEventListener('click', ()=>{
      const current = String(emails[idx].to || '').trim();
      emails[idx].to = current ? current + '; ' : '';
      saveEmails();
      renderEmails();
      panel.querySelector('.email-center-hidden-input')?.focus();
    });

    left.appendChild(addRecipient);

    const right = document.createElement('div');
    right.className = 'email-center-footer-right';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn';
    edit.textContent = 'Modifier';
    edit.addEventListener('click', ()=>{
      panel.querySelector('.email-center-hidden-input')?.focus();
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn warn';
    del.textContent = 'Supprimer';
    del.addEventListener('click', ()=>{
      emails.splice(idx, 1);
      if (emailSelectedIndex >= emails.length) emailSelectedIndex = emails.length - 1;
      saveEmails();
      renderEmails();
    });

    right.append(edit, del);
    footer.append(left, right);

    panel.append(head, recField, subjField, bodyField, footer);
    return panel;
  }

  function renderEmails(){
    const wrap = byId('emails'); if(!wrap) return;
    wrap.innerHTML = '';

    const filteredIdxs = getFilteredEmailIndexes();
    ensureValidEmailSelection(filteredIdxs);

    const shell = document.createElement('div');
    shell.className = 'email-center-shell';

    const top = document.createElement('div');
    top.className = 'email-center-topbar';

    const searchWrap = document.createElement('div');
    searchWrap.className = 'email-center-search-wrap';

    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'email-center-search';
    search.placeholder = 'Rechercher...';
    search.value = emailSearchTerm;
    search.addEventListener('input', ()=>{
      emailSearchTerm = search.value;
      renderEmails();
    });

    searchWrap.appendChild(search);
    top.appendChild(searchWrap);

    const body = document.createElement('div');
    body.className = 'email-center-body';

    const left = document.createElement('div');
    left.className = 'email-center-list';

    const indexesToRender = filteredIdxs.length ? filteredIdxs : emails.map((_, idx)=>idx);

    if (!indexesToRender.length){
      const empty = document.createElement('div');
      empty.className = 'email-center-empty muted';
      empty.textContent = 'Aucun modèle trouvé.';
      left.appendChild(empty);
    } else {
      indexesToRender.forEach(idx => left.appendChild(buildEmailListItem(idx)));
    }

    const right = buildEmailEditor(emailSelectedIndex);

    body.append(left, right);
    shell.append(top, body);
    wrap.appendChild(shell);
  }

  byId('add-mail')?.addEventListener('click', ()=>{
    emails.push({ title:"Nouveau modèle", to:"", subject:"", body:"" });
    emailSelectedIndex = emails.length - 1;
    saveEmails(); renderEmails();
  });

  byId('reset-mails')?.addEventListener('click', ()=>{
    emails = emailDefault.slice();
    emailSelectedIndex = 0;
    emailSearchTerm = "";
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
    return x.toFixed(2); // garde le point décimal
  }

  function computeAll(base){
    const v = base * 0.95;
    return v < 0 ? 0 : v;
  }

  function computeAllPlus(base){
    const v = base * 0.85;
    return v < 0 ? 0 : v;
  }

  function renderTarifs(){
    const body = byId('tarifs-body');
    if (!body) return;
    body.innerHTML = '';

    if (!Array.isArray(tarifs) || tarifs.length !== 4) {
      tarifs = tarifsDefault.slice();
      saveTarifs();
    }

    tarifs.forEach((row, i)=>{
      const tr = document.createElement('tr');

      const tdLabel = document.createElement('td');
      tdLabel.textContent = row.label;

      // --------- Prix du jour ----------
      const tdBase = document.createElement('td');

      const inputBase = document.createElement('input');
      inputBase.type = 'text';
      inputBase.inputMode = 'decimal';
      inputBase.className = 'tarifs-readonly';

      const baseNumInit = n2(row.base);
      inputBase.value = (baseNumInit == null) ? '' : `${fmtEUR(baseNumInit)} €`;
      tdBase.appendChild(inputBase);

      inputBase.addEventListener('focus', ()=>{
        inputBase.value = (inputBase.value || '').replace(/\s*€\s*$/,'');
      });

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

  function processGroupsFromRaw(raw){
    const { header, blocks } = parseCsvHeaderAndBlocks(raw);
    const rows = buildRowsFromBlocks(header, blocks);

    window.GROUPS_SOURCE = rows;
    if (typeof window.onGroupsSourceUpdated === "function") {
      window.onGroupsSourceUpdated();
    }
  }

  function processHomeGraphFromRaw(raw){
    localStorage.setItem('aar_home_arrivals_source_v1', String(raw || ''));
    scheduleSaveState("home stats import");
    if (window.TODO && typeof window.TODO.renderHomeArrivalsChartFromStorage === "function") {
      window.TODO.renderHomeArrivalsChartFromStorage();
    }
  }


  function parseExcelDateToFr(v){
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) {
      const dd = String(v.getDate()).padStart(2,'0');
      const mm = String(v.getMonth()+1).padStart(2,'0');
      const yyyy = v.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    if (typeof v === 'number' && window.XLSX?.SSF?.parse_date_code) {
      const d = window.XLSX.SSF.parse_date_code(v);
      if (d?.y && d?.m && d?.d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
    }
    const s = String(v).trim();
    if (!s) return '';

    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) return `${String(Number(m[1])).padStart(2,'0')}/${String(Number(m[2])).padStart(2,'0')}/${m[3]}`;

    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;

    const monthMap = {
      jan: '01', january: '01', janv: '01', janvier: '01',
      feb: '02', february: '02', fev: '02', fevr: '02', fevrier: '02',
      mar: '03', march: '03', mars: '03',
      apr: '04', april: '04', avr: '04', avril: '04',
      may: '05', mai: '05',
      jun: '06', june: '06', juin: '06',
      jul: '07', july: '07', juil: '07', juillet: '07',
      aug: '08', august: '08', aout: '08',
      sep: '09', sept: '09', september: '09', septembre: '09',
      oct: '10', october: '10', octobre: '10',
      nov: '11', november: '11', novembre: '11',
      dec: '12', december: '12', decembre: '12'
    };

    const norm = s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    m = norm.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
    if (m) {
      const dd = String(Number(m[1])).padStart(2,'0');
      const mm = monthMap[m[2]];
      const yyyy = m[3];
      if (mm) return `${dd}/${mm}/${yyyy}`;
    }

    m = norm.match(/^([a-z]+)\s+(\d{1,2})\s+(\d{4})$/);
    if (m) {
      const mm = monthMap[m[1]];
      const dd = String(Number(m[2])).padStart(2,'0');
      const yyyy = m[3];
      if (mm) return `${dd}/${mm}/${yyyy}`;
    }

    return s;
  }

  function parseAcdcHotelScore(noteText){
    const raw = String(noteText || '').trim();
    if (!raw) return null;
    const m = raw.match(/(\d+(?:[\.,]\d+)?)\s*\/\s*10\s*\(\s*Dans\s+mon\s+h[oô]tel\s*\)/i);
    if (!m) return null;
    const score = Number(String(m[1]).replace(',', '.'));
    if (!Number.isFinite(score)) return null;
    return score;
  }

  function normalizeAcdcHeader(s){
    return String(s || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, "'")
      .replace(/\s+/g, ' ');
  }

  function findAcdcHeaderRow(rows){
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const row = rows[i] || [];
      const norm = row.map(normalizeAcdcHeader);
      const hasNom = norm.some(v => v === 'nom' || v.includes('nom'));
      const hasPrenom = norm.some(v => v === 'prenom' || v.includes('prenom'));
      const hasLastNote = norm.some(v => v.includes('derniere note'));
      if (hasNom && hasPrenom && hasLastNote) return i;
    }
    return -1;
  }

  function getAcdcHeaderIndex(headers, testers){
    const norm = headers.map(normalizeAcdcHeader);
    for (let i = 0; i < norm.length; i++) {
      if (testers.some(rx => rx.test(norm[i]))) return i;
    }
    return -1;
  }


  function normalizeAcdcText(s){
    return String(s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toUpperCase()
      .replace(/['’]/g,' ')
      .replace(/-/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function normalizeAcdcGuestName(nom, prenom){
    return normalizeAcdcText(`${nom || ''} ${prenom || ''}`);
  }

  function normalizePortfolioGuestName(raw){
    const src = String(raw || '').split(' - ')[0];
    return normalizeAcdcText(src);
  }

  function normalizeRoomForSofa(code){
    const s = normalizeAcdcText(code);
    if (s === 'TRI' || s === 'STDM') return s;
    if (s === 'PRIVM') return 'PRIVM';
    if (s === 'EXEC' || s === 'EXE' || s === 'SGE') return 'EXE';
    return '';
  }

  function roomRankForSofa(code){
    const s = normalizeRoomForSofa(code);
    if (s === 'TRI' || s === 'STDM') return 1;
    if (s === 'PRIVM') return 2;
    if (s === 'EXE') return 3;
    return 0;
  }

  function roomRankLabelForSofa(rank){
    if (rank === 1) return 'R1';
    if (rank === 2) return 'R2';
    if (rank === 3) return 'R3';
    return '—';
  }

  function statusRankForSofa(status){
    const s = normalizeAcdcText(status);
    if (!s) return 0;
    if (s.includes('DIAMOND')) return 5;
    if (s.includes('PLAT')) return 4;
    if (s.includes('GOLD')) return 3;
    if (s.includes('SILVER')) return 2;
    return 1;
  }

  function clientCountForSofa(v){
    const s = String(v || '').trim();
    if (!s) return 0;

    const compact = s.replace(/\s+/g, '');

    if (/^\d+\+\d+$/.test(compact)) {
      return compact
        .split('+')
        .map(x => parseInt(x, 10))
        .filter(Number.isFinite)
        .reduce((a, b) => a + b, 0);
    }

    const allNums = compact.match(/\d+/g);
    if (allNums && allNums.length >= 2 && /[+\/]/.test(compact)) {
      return allNums
        .map(x => parseInt(x, 10))
        .filter(Number.isFinite)
        .reduce((a, b) => a + b, 0);
    }

    const n = parseInt(compact, 10);
    return Number.isFinite(n) ? n : 0;
  }

  function isEligibleStatusForSofa(status){
    const s = normalizeAcdcText(status);
    if (!s) return false;
    return s.includes('GOLD') || s.includes('PLAT') || s.includes('DIAMOND') || s.includes('LIMITLESS');
  }

  function parseFrDateForSofa(v){
    const s = String(v || '').trim();
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]);
  }

  function parseFrDateObjForSofa(v){
    const s = String(v || '').trim();
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    return isNaN(d) ? null : d;
  }

  function startOfWeekUtc(d){
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = x.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setUTCDate(x.getUTCDate() + diff);
    return x;
  }

  function addDaysUtc(d, days){
    const x = new Date(d.getTime());
    x.setUTCDate(x.getUTCDate() + days);
    return x;
  }

  function diffDaysUtc(a, b){
    const ms = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    return Math.round(ms / 86400000);
  }

  function fmtShortFrRange(start, end){
    const dd1 = String(start.getUTCDate()).padStart(2, '0');
    const mm1 = String(start.getUTCMonth() + 1).padStart(2, '0');
    const dd2 = String(end.getUTCDate()).padStart(2, '0');
    const mm2 = String(end.getUTCMonth() + 1).padStart(2, '0');
    if (mm1 === mm2) return `${dd1}–${dd2}/${mm1}`;
    return `${dd1}/${mm1}–${dd2}/${mm2}`;
  }

  function sofaSectionStateKey(key){
    return `aar_sofa_section_${key}_v1`;
  }

  function buildPortfolioRoomMap(rows){
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(r=>{
      const name = normalizePortfolioGuestName(
        pick(r, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) ||
        splitCSV(r.__first || '', ';')[0] || ''
      );
      if (!name) return;
      const d = parseFolsDateCell(
        pick(r, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
      );
      if (!d || isNaN(d)) return;
      const dateKey = `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
      const room = normalizeRoomForSofa(pick(r, ['ROOM_TYPE','ROOMTYPE','ROOM']) || '');
      const rank = roomRankForSofa(room);
      if (!rank) return;
      const key = `${name}__${dateKey}`;
      const prev = map.get(key);
      if (!prev || rank > prev.rank) map.set(key, { room, rank });
    });
    return map;
  }

  function buildAcdcSofaCandidatesFromSheetRows(rows, headerIdx){
    const headers = rows[headerIdx].map(v => String(v || '').trim());
    const idxNom = getAcdcHeaderIndex(headers, [/^nom$/, /^nom client$/, /\bnom\b/]);
    const idxPrenom = getAcdcHeaderIndex(headers, [/^prenom$/, /^prenom client$/, /\bprenom\b/]);
    const idxArrival = getAcdcHeaderIndex(headers, [/date d'?arrivee/, /\barrivee\b/]);
    const idxRoom = getAcdcHeaderIndex(headers, [/^code chambre$/, /code chambre/]);
    const idxStatut = getAcdcHeaderIndex(headers, [/^statut$/, /statut fidelite/, /fidelite/]);
    const idxClients = getAcdcHeaderIndex(headers, [/^client\(s\)$/, /^clients$/, /client\(s\)/, /nombre de clients/]);

    if (idxNom < 0 || idxPrenom < 0 || idxArrival < 0 || idxRoom < 0 || idxStatut < 0 || idxClients < 0) {
      return [];
    }

    const out = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const nom = String(row[idxNom] || '').trim();
      const prenom = String(row[idxPrenom] || '').trim();
      if (!nom && !prenom) continue;

      const status = String(row[idxStatut] || '').trim();
      if (!isEligibleStatusForSofa(status)) continue;

      const clients = clientCountForSofa(row[idxClients]);
      if (clients < 3) continue;

      const arrival = parseExcelDateToFr(row[idxArrival]);
      if (!arrival) continue;

      const origRoom = normalizeRoomForSofa(row[idxRoom] || '');
      const origRank = roomRankForSofa(origRoom);
      if (!origRank || origRank > 2) continue;

      out.push({
        id: `${normalizeAcdcGuestName(nom, prenom)}__${arrival}__${i}`,
        done: false,
        kind: 'sofa_upgrade',
        meta: {
          name: normalizeAcdcGuestName(nom, prenom),
          displayName: `${String(nom || '').trim().toUpperCase()} ${String(prenom || '').trim()}`.trim(),
          status,
          clients,
          arrival,
          origRoom,
          origRank
        }
      });
    }
    return out;
  }

  function enrichAcdcSofaCandidates(candidates, portfolioRows){
    const roomMap = buildPortfolioRoomMap(portfolioRows);
    const list = (Array.isArray(candidates) ? candidates : []).map(item=>{
      const meta = item.meta || {};
      const key = `${meta.name || ''}__${meta.arrival || ''}`;
      const cur = roomMap.get(key);
      const currentRank = cur?.rank || 0;
      const currentRoom = cur?.room || '';
      let state = 'À surclasser';
      if (meta.origRank === 1) {
        if (currentRank >= 2) state = 'Déjà surclassé';
        else state = 'À surclasser';
      } else if (meta.origRank === 2) {
        if (currentRank >= 3) state = 'Déjà surclassé';
        else if (currentRank === 2 || !currentRank) state = 'À surclasser vers EXE';
        else state = 'Écart rang';
      }
      return {
        ...item,
        text: `${meta.displayName || meta.name || ''} — ${state}`,
        meta: {
          ...meta,
          currentRoom,
          currentRank,
          state
        }
      };
    });

    list.sort((a,b)=>{
      const da = parseFrDateForSofa(a?.meta?.arrival || '');
      const db = parseFrDateForSofa(b?.meta?.arrival || '');
      if (da !== db) return (da || 99999999) - (db || 99999999);
      const sa = statusRankForSofa(a?.meta?.status || '');
      const sb = statusRankForSofa(b?.meta?.status || '');
      if (sa !== sb) return sb - sa;
      return String(a?.meta?.displayName || '').localeCompare(String(b?.meta?.displayName || ''), 'fr');
    });

    return list;
  }

  function renderAcdcSofaAlerts(alerts){
    const host = byId('home-sofa-alerts');
    if (!host) return;
    const list = (Array.isArray(alerts) ? alerts.slice() : []).sort((a,b)=>{
      const da = parseFrDateForSofa(a?.meta?.arrival || '');
      const db = parseFrDateForSofa(b?.meta?.arrival || '');
      if (da !== db) return (da || 99999999) - (db || 99999999);
      const sa = statusRankForSofa(a?.meta?.status || '');
      const sb = statusRankForSofa(b?.meta?.status || '');
      if (sa !== sb) return sb - sa;
      return String(a?.meta?.displayName || '').localeCompare(String(b?.meta?.displayName || ''), 'fr');
    });
    host.innerHTML = '';

    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Aucun surclassement sofa détecté pour l’instant.';
      host.appendChild(empty);
      return;
    }

    const listById = new Map(list.map(x => [x.id, x]));
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const weekStart = startOfWeekUtc(todayUtc);
    const nextWeekStart = addDaysUtc(weekStart, 7);
    const nextWeekEnd = addDaysUtc(nextWeekStart, 6);

    const sections = [
      {
        key: 'current',
        title: 'Cette semaine',
        subtitle: fmtShortFrRange(weekStart, addDaysUtc(weekStart, 6)),
        defaultOpen: true,
        items: []
      },
      {
        key: 'next',
        title: 'Semaine prochaine',
        subtitle: fmtShortFrRange(nextWeekStart, nextWeekEnd),
        defaultOpen: true,
        items: []
      },
      {
        key: 'later',
        title: 'Plus tard',
        subtitle: 'Au-delà de la semaine prochaine',
        defaultOpen: false,
        items: []
      }
    ];

    list.forEach(item => {
      const d = parseFrDateObjForSofa(item?.meta?.arrival || '');
      if (!d) {
        sections[2].items.push(item);
        return;
      }
      if (d < nextWeekStart) sections[0].items.push(item);
      else if (d <= nextWeekEnd) sections[1].items.push(item);
      else sections[2].items.push(item);
    });

    const summary = document.createElement('div');
    summary.className = 'muted small';
    summary.style.marginBottom = '10px';
    summary.textContent = `${list.length} dossier(s) • ${sections[0].items.length} cette semaine • ${sections[1].items.length} semaine prochaine • ${sections[2].items.length} plus tard`;
    host.appendChild(summary);

    function persistDone(itemId, checked){
      const current = safeJsonParse(localStorage.getItem(LS_ACDC_SOFA) || 'null', []);
      const arr = Array.isArray(current) ? current : [];
      const idx = arr.findIndex(x => x && x.id === itemId);
      if (idx >= 0) arr[idx].done = checked;
      const mem = listById.get(itemId);
      if (mem) mem.done = checked;
      localStorage.setItem(LS_ACDC_SOFA, JSON.stringify(arr));
      scheduleSaveState('acdc sofa toggle');
    }

    function buildRow(item){
      const row = document.createElement('div');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!item.done;
      cb.onchange = ()=> persistDone(item.id, cb.checked);

      const box = document.createElement('div');
      box.className = 'home-eval-line';

      const name = document.createElement('div');
      name.className = 'home-eval-name';
      name.textContent = `${item.meta?.displayName || item.meta?.name || item.text}`;

      const meta = document.createElement('div');
      meta.className = 'home-eval-meta';
      const parts = [];
      if (item.meta?.status) parts.push(item.meta.status);
      if (item.meta?.clients) parts.push(`${item.meta.clients} pax`);
      if (item.meta?.arrival) {
        const d = parseFrDateObjForSofa(item.meta.arrival);
        if (d) {
          const delta = diffDaysUtc(todayUtc, d);
          parts.push(`Arrivée ${item.meta.arrival}${delta >= 0 ? ` (J-${delta})` : ''}`);
        } else {
          parts.push(`Arrivée ${item.meta.arrival}`);
        }
      }
      if (item.meta?.origRoom) parts.push(`Origine ${item.meta.origRoom} (${roomRankLabelForSofa(item.meta.origRank)})`);
      if (item.meta?.currentRoom) parts.push(`Portefeuille ${item.meta.currentRoom} (${roomRankLabelForSofa(item.meta.currentRank)})`);
      else parts.push('Portefeuille non retrouvé');
      meta.textContent = parts.join(' • ');

      box.append(name, meta);
      row.append(cb, box);
      return row;
    }

    sections.forEach(section => {
      const wrap = document.createElement('div');
      wrap.style.marginTop = '10px';
      wrap.style.border = '1px solid rgba(0,0,0,0.06)';
      wrap.style.borderRadius = '12px';
      wrap.style.overflow = 'hidden';
      wrap.style.background = '#fff';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.width = '100%';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'space-between';
      btn.style.gap = '12px';
      btn.style.padding = '12px 14px';
      btn.style.border = 'none';
      btn.style.background = 'transparent';
      btn.style.cursor = 'pointer';
      btn.style.textAlign = 'left';

      const left = document.createElement('div');
      const title = document.createElement('div');
      title.style.fontWeight = '800';
      title.textContent = `${section.title} (${section.items.length})`;
      const sub = document.createElement('div');
      sub.className = 'muted small';
      sub.textContent = section.subtitle;
      left.append(title, sub);

      const arrow = document.createElement('div');
      arrow.style.fontWeight = '900';
      arrow.style.fontSize = '16px';

      const body = document.createElement('div');
      body.className = 'todo-list';
      body.style.padding = '0 10px 10px';

      if (!section.items.length) {
        const empty = document.createElement('div');
        empty.className = 'muted';
        empty.textContent = 'Aucun dossier dans cette plage.';
        body.appendChild(empty);
      } else {
        section.items.forEach(item => body.appendChild(buildRow(item)));
      }

      const saved = localStorage.getItem(sofaSectionStateKey(section.key));
      let isOpen = saved == null ? section.defaultOpen : saved === '1';
      function applyOpen(){
        arrow.textContent = isOpen ? '▾' : '▸';
        body.style.display = isOpen ? '' : 'none';
      }
      applyOpen();

      btn.addEventListener('click', ()=>{
        isOpen = !isOpen;
        localStorage.setItem(sofaSectionStateKey(section.key), isOpen ? '1' : '0');
        applyOpen();
      });

      btn.append(left, arrow);
      wrap.append(btn, body);
      host.appendChild(wrap);
    });
  }


  function parseAcdcWorkbook(arrayBuffer){
    if (!window.XLSX) throw new Error('XLSX indisponible');
    const wb = window.XLSX.read(arrayBuffer, { type:'array', cellDates:true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = window.XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:'' });
    const headerIdx = findAcdcHeaderRow(rows);
    if (headerIdx < 0) throw new Error('Entête ACDC introuvable');

    const headers = rows[headerIdx].map(v => String(v || '').trim());
    const idxNom = getAcdcHeaderIndex(headers, [/^nom$/, /^nom client$/, /\bnom\b/]);
    const idxPrenom = getAcdcHeaderIndex(headers, [/^prenom$/, /^prenom client$/, /\bprenom\b/]);
    const idxArrival = getAcdcHeaderIndex(headers, [/date d'?arrivee/, /\barrivee\b/]);
    const idxRoom = getAcdcHeaderIndex(headers, [/^code chambre$/, /code chambre/]);
    const idxLastNote = getAcdcHeaderIndex(headers, [/derniere note/]);

    if (idxNom < 0 || idxPrenom < 0 || idxLastNote < 0) {
      throw new Error('Colonnes ACDC obligatoires manquantes');
    }

    const alerts = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const nom = String(row[idxNom] || '').trim();
      const prenom = String(row[idxPrenom] || '').trim();
      if (!nom && !prenom) continue;

      const rawNote = String(row[idxLastNote] || '').trim();
      const hotelScore = parseAcdcHotelScore(rawNote);
      if (hotelScore == null || hotelScore > 6) continue;

      alerts.push({
        id: `${nom.toUpperCase()}__${prenom.toUpperCase()}__${i}`,
        done: false,
        kind: 'eval_alert',
        text: `${nom.toUpperCase()} ${prenom}`.trim(),
        meta: {
          name: `${nom.toUpperCase()} ${prenom}`.trim(),
          score: hotelScore,
          arrival: idxArrival >= 0 ? parseExcelDateToFr(row[idxArrival]) : '',
          room: idxRoom >= 0 ? String(row[idxRoom] || '').trim() : '',
          rawNote
        }
      });
    }

    alerts.sort((a,b)=> (a.meta.score - b.meta.score) || a.meta.name.localeCompare(b.meta.name, 'fr'));

    const sofaCandidates = enrichAcdcSofaCandidates(
      buildAcdcSofaCandidatesFromSheetRows(rows, headerIdx),
      LAST_FOLS_ROWS
    );

    return { alerts, sofaCandidates };
  }

  function renderAcdcEvaluationAlerts(alerts){
    const host = byId('home-eval-alerts');
    const status = byId('acdc-import-status');
    if (!host) return;
    const list = (Array.isArray(alerts) ? alerts.slice() : []).sort((a,b)=>{
      const da = parseFrDateForSofa(a?.meta?.arrival || '');
      const db = parseFrDateForSofa(b?.meta?.arrival || '');
      if (da !== db) return (da || 99999999) - (db || 99999999);
      const sa = Number(a?.meta?.score ?? 99);
      const sb = Number(b?.meta?.score ?? 99);
      if (sa !== sb) return sa - sb;
      return String(a?.meta?.name || '').localeCompare(String(b?.meta?.name || ''), 'fr');
    });
    host.innerHTML = '';

    if (status) {
      status.textContent = '';
    }

    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Aucune alerte évaluation pour l’instant.';
      host.appendChild(empty);
      return;
    }

    list.forEach((item, i)=>{
      const row = document.createElement('div');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!item.done;
      cb.onchange = ()=>{
        list[i].done = cb.checked;
        localStorage.setItem(LS_ACDC_ALERTS, JSON.stringify(list));
        scheduleSaveState('acdc evaluation toggle');
      };

      const box = document.createElement('div');
      box.className = 'home-eval-line';

      const name = document.createElement('div');
      name.className = 'home-eval-name';
      name.textContent = `${item.meta?.name || item.text} — ${item.meta?.score ?? '?'} / 10`;

      const meta = document.createElement('div');
      meta.className = 'home-eval-meta';
      const parts = [];
      if (item.meta?.arrival) parts.push(`Arrivée ${item.meta.arrival}`);
      if (item.meta?.room) parts.push(`Chambre ${item.meta.room}`);
      if (item.meta?.rawNote) parts.push(item.meta.rawNote);
      meta.textContent = parts.join(' • ');

      box.append(name, meta);
      row.append(cb, box);
      host.appendChild(row);
    });
  }

  function handleAcdcFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseAcdcWorkbook(e.target.result);
        const alerts = parsed?.alerts || [];
        const sofaCandidates = parsed?.sofaCandidates || [];
        localStorage.setItem(LS_ACDC_ALERTS, JSON.stringify(alerts));
        localStorage.setItem(LS_ACDC_SOFA, JSON.stringify(sofaCandidates));
        renderAcdcEvaluationAlerts(alerts);
        renderAcdcSofaAlerts(sofaCandidates);
        scheduleSaveState('acdc import');
        toast(`⭐ ACDC chargé → ${alerts.length} alerte(s) évaluation`);
      } catch (err) {
        console.error(err);
        toast('⚠️ Import ACDC impossible');
      }
    };
    reader.readAsArrayBuffer(file);
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
        const gname = String(pick(r, [
          'GUES_GROUPNAME',
          'GUES_GROUP_NAME',
          'GROUPNAME',
          'GROUP_NAME'
        ]) || '').trim();

        if (gname) return; // Ignore les lignes appartenant à un groupe

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
            total_resa: 0,
            "2_sofa": [],
            "1_sofa": [],
            "lit_bebe": [],
            "comm": [],
            "dayuse": [],
            "early": []
          };
        }

        grouped[dateKey].total_resa += 1;

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

      const view = {
        ...data,
        "1_sofa": compactSameCategory(data["1_sofa"]),
        "2_sofa": compactSameCategory(data["2_sofa"])
      };

      const blk=document.createElement('div');
      blk.className='day-block';

      const h=document.createElement('div');
      h.className='day-header';
      const n = data.total_resa || 0;
      h.textContent = `📅 ${data.label} (${n} arrivée${n>1?'s':''})`;

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
  const dropZoneGroups  = byId('drop-zone-groups');
  const dropZoneAcdc    = byId('drop-zone-acdc');

  const fileInputIndiv = document.createElement('input');
  fileInputIndiv.type = 'file';
  fileInputIndiv.accept = '.csv,.txt';
  fileInputIndiv.multiple = true;

  const fileInputGroups = document.createElement('input');
  fileInputGroups.type = 'file';
  fileInputGroups.accept = '.csv,.txt';
  fileInputGroups.multiple = true;

  const fileInputAcdc = document.createElement('input');
  fileInputAcdc.type = 'file';
  fileInputAcdc.accept = '.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  fileInputAcdc.multiple = false;

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


  if (dropZoneAcdc) {
    dropZoneAcdc.addEventListener('click', () => fileInputAcdc.click());

    dropZoneAcdc.addEventListener('dragover', e => {
      e.preventDefault();
      dropZoneAcdc.style.borderColor = 'var(--brand)';
    });

    dropZoneAcdc.addEventListener('dragleave', () => {
      dropZoneAcdc.style.borderColor = 'var(--border)';
    });

    dropZoneAcdc.addEventListener('drop', e => {
      e.preventDefault();
      dropZoneAcdc.style.borderColor = 'var(--border)';
      const file = (e.dataTransfer.files || [])[0];
      if (file) handleAcdcFile(file);
    });

    fileInputAcdc.addEventListener('change', e => {
      const file = (e.target.files || [])[0];
      if (file) handleAcdcFile(file);
      fileInputAcdc.value = '';
    });
  }

  function handleIndivFile(file) {
    const reader = new FileReader();
    reader.onload = async e => {
      const text = e.target.result;

      // 1) INDIV + VCC
      processCsvText(text);
      STATE.arrivals_csv = text;
      scheduleSaveState("arrivals import");

      // 2) GROUPES
      processGroupsFromRaw(text);

      // sauvegarde groupes snapshot
      try {
        await ghSaveSnapshotPath(window.GH_PATHS.groups, {
          ts: new Date().toISOString(),
          groups_csv: text
        }, "groups import (from portfolio)");
      } catch (err) {
        console.warn("save groups failed:", err);
      }

      // 3) GRAPH
      processHomeGraphFromRaw(text);

      toast("📂 Portefeuille chargé → Indiv + Groupes + Graph");
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
    window.__AAR_LAST_FOLS_ROWS = rows;
    renderArrivalsFOLS_fromRows(rows);
    syncMonthlyAlerts(rows);
    try {
      const savedSofa = safeJsonParse(localStorage.getItem(LS_ACDC_SOFA) || 'null', []);
      if (Array.isArray(savedSofa) && savedSofa.length) {
        renderAcdcSofaAlerts(enrichAcdcSofaCandidates(savedSofa, rows));
      }
    } catch (err) {
      console.warn('sofa refresh failed:', err);
    }
    if (views?.vcc && views.vcc.style.display !== 'none') {
      renderVccMissingArrhesPrepay();
    }
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
    let remote = null;
    try{
      const meta = await ghGetContent();
      if(meta?.content){
        remote = safeJsonParse(meta.content, null);
      }
    }catch(_){}

    if(remote && typeof remote === "object"){
      STATE = { ...remote, ...STATE };
    }
    STATE.checklist = safeJsonParse(localStorage.getItem(LS_CHECK) || 'null', STATE.checklist);
    STATE.memo = localStorage.getItem(LS_MEMO) || STATE.memo || "";
    STATE.tarifs = safeJsonParse(localStorage.getItem(LS_TARIFS) || 'null', STATE.tarifs);
    STATE.emails = safeJsonParse(localStorage.getItem(LS_EMAILS) || 'null', STATE.emails);
    STATE.home_arrivals_stats_source = localStorage.getItem(LS_HOME_STATS_SOURCE) || STATE.home_arrivals_stats_source || "";

    if(!STATE.ts) STATE.ts = new Date().toISOString();

    // RÈGLES = full local : on ne push jamais les règles sur GitHub
    delete STATE.rules;

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

      if(STATE.rules){
        // RÈGLES = full local : on ignore volontairement toute version GitHub
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

      if (Array.isArray(STATE.acdc_alerts)) {
        localStorage.setItem(LS_ACDC_ALERTS, JSON.stringify(STATE.acdc_alerts));
        renderAcdcEvaluationAlerts(STATE.acdc_alerts);
      }
      if (Array.isArray(STATE.acdc_sofa)) {
        localStorage.setItem(LS_ACDC_SOFA, JSON.stringify(STATE.acdc_sofa));
        renderAcdcSofaAlerts(STATE.acdc_sofa);
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
    renderVacationCalendar(new Date());
    renderAcdcEvaluationAlerts(safeJsonParse(localStorage.getItem(LS_ACDC_ALERTS) || 'null', []));
    renderAcdcSofaAlerts(safeJsonParse(localStorage.getItem(LS_ACDC_SOFA) || 'null', []));
    try {
      if (ghEnabled()) {
        await ghLoadAndHydrateState();
        await updateGhStatus();

        // restore groups
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


  /* =========================================================
     HOME — CALENDRIER VACANCES SCOLAIRES (ZONE C)
     ========================================================= */
  const SCHOOL_HOLIDAYS_ZONE_C = [
    { label: 'Toussaint 2025', start: '2025-10-18', end: '2025-11-02' },
    { label: 'Noël 2025',      start: '2025-12-20', end: '2026-01-04' },
    { label: 'Hiver 2026',     start: '2026-02-21', end: '2026-03-08' },
    { label: 'Printemps 2026', start: '2026-04-18', end: '2026-05-03' },
    { label: 'Été 2026',       start: '2026-07-04', end: '2026-08-31' },
    { label: 'Toussaint 2026', start: '2026-10-17', end: '2026-11-01' },
    { label: 'Noël 2026',      start: '2026-12-19', end: '2027-01-03' },
    { label: 'Hiver 2027',     start: '2027-02-06', end: '2027-02-21' },
    { label: 'Printemps 2027', start: '2027-04-03', end: '2027-04-18' },
    { label: 'Été 2027',       start: '2027-07-03', end: '2027-08-31' }
  ];

  const VAC_MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const VAC_DAYS_FR = ['lu','ma','me','je','ve','sa','di'];
  let VAC_CURRENT = null;

  function isoLocal(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function monthStart(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }

  function addMonths(d, delta){ return new Date(d.getFullYear(), d.getMonth()+delta, 1); }

  function parseISODateLocal(iso){
    const m = String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return null;
    return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  }

  function isHolidayISO(iso){
    return SCHOOL_HOLIDAYS_ZONE_C.find(p => iso >= p.start && iso <= p.end) || null;
  }

  function monthHolidayText(dateObj){
    const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const end = new Date(dateObj.getFullYear(), dateObj.getMonth()+1, 0);
    const startIso = isoLocal(start);
    const endIso = isoLocal(end);

    const hits = SCHOOL_HOLIDAYS_ZONE_C.filter(p => !(p.end < startIso || p.start > endIso));
    if(!hits.length) return 'Aucune vacance scolaire ce mois-ci';

    return hits.map(p => {
      const s = parseISODateLocal(p.start);
      const e = parseISODateLocal(p.end);
      const fmt = (d)=> `${d.getDate()} ${VAC_MONTHS_FR[d.getMonth()]}`;
      return `${p.label} : ${fmt(s)} → ${fmt(e)}`;
    }).join(' • ');
  }

  const LS_HOME_CARD_COLLAPSE = "aar_home_card_collapse_v1";

  function loadHomeCardCollapseState(){
    return safeJsonParse(localStorage.getItem(LS_HOME_CARD_COLLAPSE) || '{}', {});
  }

  function saveHomeCardCollapseState(state){
    localStorage.setItem(LS_HOME_CARD_COLLAPSE, JSON.stringify(state || {}));
  }

  function setCollapsibleCardState(card, collapsed){
    if (!card) return;
    const btn = card.querySelector('.home-card-toggle');
    const body = card.querySelector('[data-collapsible-body]');
    card.classList.toggle('is-collapsed', !!collapsed);
    if (body) body.style.display = collapsed ? 'none' : '';
    if (btn) {
      btn.textContent = collapsed ? '+' : '−';
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.setAttribute('title', collapsed ? 'Déployer' : 'Réduire');
    }
  }

  function initHomeCardCollapse(){
    const state = loadHomeCardCollapseState();
    document.querySelectorAll('.home-alert-card.is-collapsible').forEach(card => {
      const id = card.getAttribute('data-collapsible-id');
      const btn = card.querySelector('.home-card-toggle');
      if (!id || !btn) return;
      setCollapsibleCardState(card, !!state[id]);
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', ()=>{
        const next = !card.classList.contains('is-collapsed');
        state[id] = next;
        setCollapsibleCardState(card, next);
        saveHomeCardCollapseState(state);
      });
    });
  }

  function renderVacationCalendar(targetDate){
    const mount = byId('vac-calendar');
    const legend = byId('vac-calendar-legend');
    const monthLabel = byId('vac-calendar-month-label');
    if(!mount || !legend || !monthLabel) return;

    const base = monthStart(targetDate || new Date());
    VAC_CURRENT = base;

    monthLabel.textContent = `${VAC_MONTHS_FR[base.getMonth()]} ${base.getFullYear()}`;

    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const last = new Date(base.getFullYear(), base.getMonth()+1, 0);
    const jsDay = first.getDay();
    const mondayOffset = (jsDay + 6) % 7;
    const startGrid = new Date(first);
    startGrid.setDate(first.getDate() - mondayOffset);

    let html = '<div class="vac-cal-head">'
      + '<button type="button" id="vac-cal-prev" class="vac-cal-nav">‹</button>'
      + '<button type="button" id="vac-cal-next" class="vac-cal-nav">›</button>'
      + '</div>';
    html += '<div class="vac-cal-grid">';
    html += VAC_DAYS_FR.map(d => `<div class="vac-cal-dow">${d}</div>`).join('');

    const todayIso = isoLocal(new Date());
    const daysInMonth = last.getDate();
    const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

    for(let i=0;i<totalCells;i++){
      const cur = new Date(startGrid);
      cur.setDate(startGrid.getDate() + i);
      const iso = isoLocal(cur);
      const period = isHolidayISO(iso);
      const classes = ['vac-cal-cell'];
      if(cur.getMonth() !== base.getMonth()) classes.push('is-out');
      if(iso === todayIso) classes.push('is-today');
      if(period) classes.push('is-vac');
      const title = period ? `${period.label} — ${iso}` : iso;
      html += `<div class="${classes.join(' ')}" title="${title}">${cur.getDate()}</div>`;
    }

    html += '</div>';
    mount.innerHTML = html;
    legend.innerHTML = `<span class="vac-cal-legend-dot"></span>${monthHolidayText(base)}`;

    byId('vac-cal-prev')?.addEventListener('click', ()=> renderVacationCalendar(addMonths(base, -1)));
    byId('vac-cal-next')?.addEventListener('click', ()=> renderVacationCalendar(addMonths(base, 1)));
  }

  /* =========================================================
     THEME TOGGLE
     ========================================================= */
  (function(){
    const LS_THEME = 'aar_theme_mode_v1';

    function applyTheme(mode){
      document.body.setAttribute('data-theme', mode);
      const btn = document.getElementById('theme-toggle');
      if(btn){
        btn.textContent = mode === 'night' ? '☀️ Day' : '🌙 Night';
      }
      localStorage.setItem(LS_THEME, mode);
    }

    window.addEventListener('DOMContentLoaded', ()=>{
      initHomeCardCollapse();
      const btn = document.getElementById('theme-toggle');
      if(!btn) return;

      const saved = localStorage.getItem(LS_THEME) || 'day';
      applyTheme(saved);

      btn.addEventListener('click', ()=>{
        const current = document.body.getAttribute('data-theme');
        applyTheme(current === 'night' ? 'day' : 'night');
      });
    });
  })();

})(); // fin IIFE PRINCIPAL