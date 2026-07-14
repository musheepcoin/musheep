
function formatNameVCC(fullName){
  if(!fullName) return '';

  const raw = String(fullName || '').replace(/\s+/g, ' ').trim();
  if(!raw) return '';

  const capFirst = (value) => String(value || '')
    .toLowerCase()
    .replace(/(^|[\s'’-])([\p{L}])/gu, (_, sep, ch) => `${sep}${ch.toUpperCase()}`)
    .trim();

  const joinUpper = (parts) => parts.filter(Boolean).join(' ').toUpperCase().trim();

  if (raw.includes(',')) {
    const commaParts = raw.split(',').map(x => x.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      return `${commaParts[0].toUpperCase()} ${capFirst(commaParts.slice(1).join(' '))}`.trim();
    }
  }

  const tokens = raw.split(/\s+/).filter(Boolean);
  if (!tokens.length) return '';
  if (tokens.length === 1) return tokens[0].toUpperCase();

  const isAllUpper = (token) => {
    const letters = String(token || '').replace(/[^\p{L}]/gu, '');
    return !!letters && letters === letters.toUpperCase();
  };

  const firstUpperRun = [];
  for (const token of tokens) {
    if (isAllUpper(token)) firstUpperRun.push(token);
    else break;
  }

  const lastUpperRun = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (isAllUpper(tokens[i])) lastUpperRun.unshift(tokens[i]);
    else break;
  }

  if (firstUpperRun.length && firstUpperRun.length < tokens.length) {
    const first = tokens.slice(firstUpperRun.length).join(' ');
    return `${joinUpper(firstUpperRun)} ${capFirst(first)}`.trim();
  }

  if (lastUpperRun.length && lastUpperRun.length < tokens.length) {
    const first = tokens.slice(0, tokens.length - lastUpperRun.length).join(' ');
    return `${joinUpper(lastUpperRun)} ${capFirst(first)}`.trim();
  }

  const surnameParticles = new Set(['de','du','des','van','von','da','di','del','della','le','la']);
  let cut = tokens.length - 1;
  while (cut - 1 >= 0 && surnameParticles.has(tokens[cut - 1].toLowerCase())) {
    cut -= 1;
  }

  const first = tokens.slice(0, cut).join(' ');
  const last = tokens.slice(cut).join(' ');

  return `${last.toUpperCase()} ${capFirst(first)}`.trim();
}

function formatVccLastNameFirstName(fullName){
  if(!fullName) return '';

  const raw = String(fullName || '').replace(/\s+/g, ' ').trim();
  if(!raw) return '';

  const capFirst = (value) => String(value || '')
    .toLocaleLowerCase('fr-FR')
    .replace(/(^|[\s'’-])([\p{L}])/gu, (_, sep, ch) => `${sep}${ch.toLocaleUpperCase('fr-FR')}`)
    .trim();

  // Une virgule indique déjà explicitement « NOM, Prénom ».
  if(raw.includes(',')){
    const [lastName, ...firstNameParts] = raw.split(',').map(part => part.trim()).filter(Boolean);
    return `${String(lastName || '').toLocaleUpperCase('fr-FR')} ${capFirst(firstNameParts.join(' '))}`.trim();
  }

  // Dans l'export VCC FOLS, la valeur est toujours « NOM PRÉNOM ».
  const tokens = raw.split(/\s+/).filter(Boolean);
  if(tokens.length === 1) return tokens[0].toLocaleUpperCase('fr-FR');

  const firstName = tokens.pop();
  const lastName = tokens.join(' ');
  return `${lastName.toLocaleUpperCase('fr-FR')} ${capFirst(firstName)}`.trim();
}

function formatAcdcNameParts(lastName, firstName){
  const formattedLastName = String(lastName || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('fr-FR');
  const formattedFirstName = String(firstName || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr-FR')
    .replace(/(^|[\s'’-])([\p{L}])/gu, (_, sep, ch) => `${sep}${ch.toLocaleUpperCase('fr-FR')}`);
  return `${formattedLastName} ${formattedFirstName}`.trim();
}

/* script.js (corrigé intégralement) */

/* ---------- CONFIG GITHUB ---------- */
window.GH_OWNER = "musheepcoin";
window.GH_REPO  = "musheep";
window.GH_PATH = null;
window.GH_TOKEN = null;
window.GH_BRANCH= "main";

window.GH_PATHS = {
  portfolio: "data/portfolio.json",
  acdc: "data/acdc.json"
};

(function(){
  /* ---------- Helpers DOM ---------- */
  const $  = (sel)=>document.querySelector(sel);
  const $$ = (sel)=>Array.from(document.querySelectorAll(sel));
  const byId = (id)=>document.getElementById(id);


  function initSidebarPmsSwitcher(){
    const wrap = byId('sidebar-pms-switcher');
    const trigger = byId('sidebar-pms-trigger');
    if(!wrap || !trigger || wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';

    function setOpen(next){
      wrap.classList.toggle('is-open', !!next);
      trigger.setAttribute('aria-expanded', next ? 'true' : 'false');
    }

    trigger.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      setOpen(!wrap.classList.contains('is-open'));
    });

    document.addEventListener('click', (e)=>{
      if(!wrap.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') setOpen(false);
    });
  }
  /* ---------- Petit toast ---------- */
  function toast(msg){
    if (window.ORIS_ASSISTANT?.notify?.(msg)) return;
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
    },4400);
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
  const LS_IMPORT_DATE_INDIV = 'aar_import_date_indiv_v1';
  const LS_IMPORT_DATE_ACDC = 'aar_import_date_acdc_v1';
  const LS_ARRIVALS_CSV = 'aar_arrivals_csv_v1';
  const LS_DASHBOARD_ACTIVE_DATE = 'aar_dashboard_active_date_v1';
  const LS_RESERVATION_CONTROL = 'aar_reservation_control_v3';
  const LS_GROUPS_COMPACT = 'aar_groups_compact_v1';

  // Le système d'historique FOLS a été supprimé : libérer immédiatement
  // les anciennes copies qui pouvaient saturer le stockage du navigateur.
  [
    'aar_fols_snapshots_v2',
    'aar_fols_current_snapshot_date_v1',
    'aar_fols_previous_snapshot_date_v1',
    'aar_groups_csv_v1',
    'aar_operational_rows_v1'
  ].forEach(key => localStorage.removeItem(key));

  function asUtcStart(date){
    if (!(date instanceof Date) || isNaN(date)) return null;
    return new Date(Date.UTC(date.getUTCFullYear ? date.getUTCFullYear() : date.getFullYear(), date.getUTCMonth ? date.getUTCMonth() : date.getMonth(), date.getUTCDate ? date.getUTCDate() : date.getDate()));
  }

  function getStoredDashboardActiveDate(){
    const raw = localStorage.getItem(LS_DASHBOARD_ACTIVE_DATE) || '';
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  // À chaque ouverture du site, repartir sur la journée actuelle.
  // La date reste ensuite navigable avec les flèches pendant la session.
  let DASHBOARD_ACTIVE_DATE = (()=>{
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  })();

  function getDashboardActiveDateObj(){
    return new Date(DASHBOARD_ACTIVE_DATE.getTime());
  }

  function saveDashboardActiveDate(){
    localStorage.setItem(LS_DASHBOARD_ACTIVE_DATE, toIsoDateUtc(DASHBOARD_ACTIVE_DATE));
  }

  saveDashboardActiveDate();

  function parseFrenchUiDateLabel(text, fallbackYear){
    const raw = String(text || '').trim();
    if (!raw) return null;

    const normalized = raw
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    let m = normalized.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3] || fallbackYear || new Date().getUTCFullYear());
      const d = new Date(Date.UTC(yyyy, mm - 1, dd));
      return isNaN(d) ? null : d;
    }

    const months = {
      janvier: 0, janv: 0,
      fevrier: 1, fevr: 1, fev: 1,
      mars: 2,
      avril: 3, avr: 3,
      mai: 4,
      juin: 5,
      juillet: 6, juil: 6,
      aout: 7,
      septembre: 8, sept: 8,
      octobre: 9, oct: 9,
      novembre: 10, nov: 10,
      decembre: 11, dec: 11
    };

    m = normalized.match(/(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun\.?|mar\.?|mer\.?|jeu\.?|ven\.?|sam\.?|dim\.?)?\s*(\d{1,2})\s+([a-z.]+)\s+(\d{4})/);
    if (m) {
      const dd = Number(m[1]);
      const token = String(m[2] || '').replace(/\./g, '');
      const mm = months[token];
      const yyyy = Number(m[3]);
      if (Number.isInteger(mm)) {
        const d = new Date(Date.UTC(yyyy, mm, dd));
        return isNaN(d) ? null : d;
      }
    }

    return null;
  }

  function syncHomeChecklistToDashboardDate(){
    const stamp = byId('today-stamp');
    const prevBtn = byId('home-check-prev');
    const nextBtn = byId('home-check-next');
    const target = getDashboardActiveDateObj();
    if (!stamp || !prevBtn || !nextBtn || !target) return;

    const current = parseFrenchUiDateLabel(stamp.textContent, target.getUTCFullYear());
    if (!current) return;

    const diff = Math.round((target.getTime() - current.getTime()) / 86400000);
    if (!diff) return;

    const btn = diff > 0 ? nextBtn : prevBtn;
    for (let i = 0; i < Math.min(Math.abs(diff), 400); i++) {
      btn.click();
    }
  }

  let STATE = {
    ts: null,
    arrivals_csv: "",
    groups_csv: "",
    acdc_payload: null
  };

  function safeJsonParse(raw, fallback){
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  let _saveTimer = null;
  function scheduleSaveState(reason){
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(()=>{
      // Local-only persistence now.
      // Cross-PC GitHub sync is intentionally limited to Individuel + Groupes imports.
    }, 150);
  }

  /* =========================================================
     NAV
     ========================================================= */
  const tabs = {
    home:   byId('tab-home'),
    assistant: byId('tab-assistant'),
    reservationControl: byId('tab-reservation-control'),
    overview: byId('tab-overview'),
    indiv:  byId('tab-indiv'),
    groups: byId('tab-groups'),
    vcc:    byId('tab-vcc'),
    dd:     byId('tab-dd'),     // ✅
    rules:  byId('tab-rules'),
    plan:   byId('tab-plan'),
    check:  byId('tab-check'),
    tarifs: byId('tab-tarifs'),
    inventory: byId('tab-inventory'),
    mails:  byId('tab-mails'),
    hotelia: byId('tab-hotel-ia')
  };

  const views = {
    home:   byId('view-home'),
    assistant: byId('view-assistant'),
    reservationControl: byId('view-reservation-control'),
    overview: byId('view-overview'),
    indiv:  byId('view-indiv'),
    groups: byId('view-groups'),
    vcc:    byId('view-vcc'),
    dd:     byId('view-dd'),    // ✅
    rules:  byId('view-rules'),
    plan:   byId('view-plan'),
    check:  byId('view-check'),
    tarifs: byId('view-tarifs'),
    inventory: byId('view-inventory'),
    mails:  byId('view-mails'),
    hotelia: byId('view-hotel-ia')
  };

  function showTab(t){
    document.body.classList.toggle('assistant-mode', t === 'assistant');
    Object.entries(views).forEach(([k,v])=>{
      if (!v) console.warn("View manquante:", k);
      else v.style.display = 'none';
    });

    Object.values(tabs).forEach(x=>{ if(x) x.classList.remove('active'); });
    document.querySelectorAll('.sidebar-nav .nav-dropdown-trigger').forEach(x=>x.classList.remove('active'));

    if (!views[t] || !tabs[t]) {
      console.warn("Tab/view missing:", t, { tab: tabs[t], view: views[t] });
      return;
    }
    views[t].style.display='block';
    tabs[t].classList.add('active');

    if (t === 'indiv' || t === 'overview') {
      document.querySelector('.sidebar-parent-link')?.classList.add('active');
    }
  }

  // --- Handlers tabs (tous avant showTab('home')) ---
  tabs.home?.addEventListener('click', e=>{ e.preventDefault(); showTab('home'); });
  tabs.assistant?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('assistant');
    window.ORIS_ASSISTANT?.render?.(byId('assistant-output'));
  });
  tabs.reservationControl?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('reservationControl');
    window.RESERVATION_CONTROL?.render?.();
  });

  tabs.overview?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('overview');
    if (window.OVERVIEW && typeof window.OVERVIEW.refresh === "function") {
      window.OVERVIEW.refresh(true);
      refreshTodayPreferencesKpi();
    }
  });

  tabs.indiv?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('indiv');
    refreshIndivFusedView();
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
  tabs.plan?.addEventListener('click', e=>{
    e.preventDefault();
    showTab('plan');
    window.PLAN?.render?.();
  });
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
  initSidebarPmsSwitcher();
  renderDashboardCurrentDate();
  byId('dashboard-date-prev')?.addEventListener('click', ()=> shiftDashboardActiveDate(-1));
  byId('dashboard-date-next')?.addEventListener('click', ()=> shiftDashboardActiveDate(1));
  setTimeout(syncHomeChecklistToDashboardDate, 0);


  byId('indiv-day-control-close')?.addEventListener('click', closeIndivDayControl);
  byId('indiv-day-control-modal')?.addEventListener('click', (e)=>{ if(e.target?.id === 'indiv-day-control-modal') closeIndivDayControl(); });
  byId('reservation-control-ai-start')?.addEventListener('click', ()=>setTimeout(refreshIndivFusedView, 0));
  document.querySelectorAll('#view-indiv [data-reservation-control-period]').forEach(btn=>{
    btn.addEventListener('click', ()=>setTimeout(refreshIndivFusedView, 0));
  });
  byId('kpi-departures-card')?.addEventListener('click', ()=> openHomeKpiModal('departures'));
  byId('kpi-arrivals-card')?.addEventListener('click', ()=> openHomeKpiModal('arrivals'));
  byId('kpi-vcc-card')?.addEventListener('click', ()=> openHomeKpiModal('vcc'));
  byId('kpi-preferences-card')?.addEventListener('click', ()=> openHomeKpiModal('preferences'));
  byId('kpi-baby-card')?.addEventListener('click', ()=> openHomeKpiModal('babies'));
  byId('kpi-sofa-card')?.addEventListener('click', ()=> openHomeKpiModal('sofas'));
  byId('kpi-stayovers-card')?.addEventListener('click', ()=> openHomeKpiModal('stayovers'));
  byId('home-vcc-modal')?.addEventListener('click', (e)=>{ if(e.target?.id === 'home-vcc-modal') closeHomeKpiModal(); });

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
      baby: ["lit bb","lit bebe","lit b?b?","baby","crib","extra bed/crib","baby cot","cot requested"],
      comm: ["comm","connecte","connecté","connected","communic"],
      dayuse: ["day use","dayuse"],
      early: ["early","prioritaire","11h","checkin","check-in","arrivee prioritaire"],
    },
    baby_exclude: ["bébé?","bébé ?","bb?","bb ?"],
    vcc_rates: ["FLMRB4","FMRA4S","FMRB4S","FLRB4","FLRA4S","FLRB3S","FLRA3"],
    sofa: {
      "1A+0E":"0","1A+1E":"1","1A+2E":"2","1A+3E":"2",
      "2A+0E":"0","2A+1E":"1","2A+2E":"2","2A+3E":"2",
      "3A+0E":"1","3A+1E":"2"
    },
    assignment_watch: [],
    inventory_capacity: {
      TRI: 0,
      STDM: 0,
      PRIVM: 0,
      EXEC: 0,
      SGE: 0
    },
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

  function parseBabyRuleBlock(text){
    const items = String(text || '')
      .split(/[\n,]+/)
      .map(x => stripAccentsLower(x).trim())
      .filter(Boolean);

    const include = [];
    const exclude = [];

    items.forEach(item => {
      if (item.startsWith('!')) exclude.push(item.slice(1).trim());
      else include.push(item);
    });

    return { include, exclude };
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

  function sanitizeBabyKeywordList(list){
    return (Array.isArray(list) ? list : [])
      .map(x => String(x || '').trim())
      .filter(Boolean)
      .filter(x => stripAccentsLower(x) !== 'cot');
  }

  function loadRules(){
    try{
      const raw=localStorage.getItem(LS_RULES);
      if(!raw) { const defaults = JSON.parse(JSON.stringify(DEFAULTS)); defaults.keywords.baby = sanitizeBabyKeywordList(defaults.keywords.baby); return defaults; }
      const o = JSON.parse(raw);
      const keywords = {...DEFAULTS.keywords,...(o.keywords||{})};
      keywords.baby = sanitizeBabyKeywordList(keywords.baby);
      return {
        keywords,
        baby_exclude: Array.isArray(o.baby_exclude) ? o.baby_exclude : DEFAULTS.baby_exclude.slice(),
        vcc_rates: Array.isArray(o.vcc_rates) ? o.vcc_rates : DEFAULTS.vcc_rates.slice(),
        sofa:{...DEFAULTS.sofa,...(o.sofa||{})},
        assignment_watch: Array.isArray(o.assignment_watch) ? o.assignment_watch : DEFAULTS.assignment_watch.slice(),
        inventory_capacity: {
          ...DEFAULTS.inventory_capacity,
          ...(o.inventory_capacity || {})
        },
        checklists: {
          morning: normalizeChecklistRuleItems(o?.checklists?.morning ?? DEFAULTS.checklists.morning, 'm'),
          evening: normalizeChecklistRuleItems(o?.checklists?.evening ?? DEFAULTS.checklists.evening, 'e')
        }
      };
    }catch(_){ return JSON.parse(JSON.stringify(DEFAULTS)); }
  }
  let RULES = loadRules();

  function saveRules(options = {}){
    const {
      refreshHomeChecklist = true,
      syncAssignmentAlerts = true,
      refreshTodo = true
    } = options;

    localStorage.setItem(LS_RULES, JSON.stringify(RULES));

    if(refreshHomeChecklist){
      window.TODO?.refreshHomeChecklist?.();
    }

    if (typeof refreshInventoryPressureCard === 'function') {
      refreshInventoryPressureCard(getHotelMemoryRows());
    }

    // garde Alerte en phase avec la règle courante
    if(syncAssignmentAlerts){
      try{
        const liveRows = getHotelMemoryRows();
        if(liveRows.length){
          syncMonthlyAlerts(liveRows, { refreshTodo });
        }
      }catch(err){
        console.warn('live rules sync failed:', err);
      }
    }
  }

  
  function cleanKeywordHaystack(str){
    return stripAccentsLower(String(str || ''))
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

function buildKeywordRegex(list, mode = 'word'){
    const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s*');
    const p=(list||[]).map(esc).join('|');
    if(!p) return null;
    if(mode === 'substring') return new RegExp(`(${p})`,'i');
    return new RegExp(`\\b(${p})\\b`,'i');
  }
  function compileRegex(){
    return {
      baby: buildKeywordRegex(RULES.keywords.baby),
      comm: buildKeywordRegex(RULES.keywords.comm, 'substring'),
      dayuse: buildKeywordRegex(RULES.keywords.dayuse),
      early: buildKeywordRegex(RULES.keywords.early),
    };
  }

  function hasBabyRequest(comment){
    const raw = stripAccentsLower(String(comment || ''));

    const babyList = Array.isArray(RULES.keywords?.baby) ? RULES.keywords.baby : [];
    const excludeList = Array.isArray(RULES.baby_exclude) ? RULES.baby_exclude : [];

    const hasExclude = excludeList.some(k => {
      const token = stripAccentsLower(k).trim();
      return token && raw.includes(token);
    });

    if (hasExclude) return false;

    const text = raw
      .replace(/["*()]/g, ' ')
      .replace(/s\/intern[:\s-]*/g, ' ')
      .replace(/[^\p{L}\p{N}\s\+]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const paddedText = ` ${text} `;
    const hasBaby = babyList.some(k => {
      const token = stripAccentsLower(k)
        .replace(/[^\p{L}\p{N}\s\+]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return token && paddedText.includes(` ${token} `);
    });

    return hasBaby;
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
    byId('kw-baby') && (byId('kw-baby').value=[...(RULES.keywords.baby||[]), ...((RULES.baby_exclude||[]).map(x => '!' + x))].join(', '));
    byId('kw-comm') && (byId('kw-comm').value=(RULES.keywords.comm||[]).join(', '));
    byId('kw-dayuse') && (byId('kw-dayuse').value=(RULES.keywords.dayuse||[]).join(', '));
    byId('kw-early') && (byId('kw-early').value=(RULES.keywords.early||[]).join(', '));
    byId('kw-vcc-rates') && (byId('kw-vcc-rates').value = (RULES.vcc_rates || []).join(', '));
  }

  function readKeywordAreasToRules(){
    const babyParsed = parseBabyRuleBlock(byId('kw-baby')?.value||'');
    RULES.keywords.baby = babyParsed.include;
    RULES.baby_exclude = babyParsed.exclude;
    RULES.keywords.comm = parseList(byId('kw-comm')?.value||'');
    RULES.keywords.dayuse = parseList(byId('kw-dayuse')?.value||'');
    RULES.keywords.early = parseList(byId('kw-early')?.value||'');
    RULES.vcc_rates = parseRates(byId('kw-vcc-rates')?.value || '');
  }

  function normalizeInventoryCapacityValue(value){
    const n = parseInt(String(value ?? '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function ensureInventoryCapacityRules(){
    RULES.inventory_capacity = {
      ...DEFAULTS.inventory_capacity,
      ...(RULES.inventory_capacity || {})
    };
    return RULES.inventory_capacity;
  }

  function populateInventoryCapacityInputs(){
    const caps = ensureInventoryCapacityRules();
    [['TRI','rule-inv-tri'], ['STDM','rule-inv-stdm'], ['PRIVM','rule-inv-privm'], ['EXEC','rule-inv-exec'], ['SGE','rule-inv-sge']].forEach(([key, id])=>{
      const el = byId(id);
      if (!el) return;
      const value = normalizeInventoryCapacityValue(caps[key]);
      el.value = value > 0 ? String(value) : '';
    });
  }

  function readInventoryCapacityInputsToRules(){
    const caps = ensureInventoryCapacityRules();
    [['TRI','rule-inv-tri'], ['STDM','rule-inv-stdm'], ['PRIVM','rule-inv-privm'], ['EXEC','rule-inv-exec'], ['SGE','rule-inv-sge']].forEach(([key, id])=>{
      caps[key] = normalizeInventoryCapacityValue(byId(id)?.value || '');
    });
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

  let _assignmentWatchIndexRowsRef = null;
  let _assignmentWatchIndexedRows = [];

  function getAssignmentWatchIndexedRows(rows){
    if(!Array.isArray(rows) || !rows.length) return [];
    if(_assignmentWatchIndexRowsRef === rows && Array.isArray(_assignmentWatchIndexedRows) && _assignmentWatchIndexedRows.length){
      return _assignmentWatchIndexedRows;
    }

    _assignmentWatchIndexRowsRef = rows;
    _assignmentWatchIndexedRows = rows.map(row => ({
      haystack: assignmentWatchHaystack(row),
      dateLabel: formatShortFrDate(
        pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
      ) || 'Date ?',
      room: extractRowRoom(row)
    }));

    return _assignmentWatchIndexedRows;
  }

  function invalidateAssignmentWatchIndex(){
    _assignmentWatchIndexRowsRef = null;
    _assignmentWatchIndexedRows = [];
  }

  function buildAssignmentWatchAlerts(rows){
    const rules = Array.isArray(RULES.assignment_watch) ? RULES.assignment_watch : [];
    if(!Array.isArray(rows) || !rows.length || !rules.length) return [];

    const indexedRows = getAssignmentWatchIndexedRows(rows);
    const alerts = [];
    rules.forEach((rule, idx)=>{
      const ruleName = String(rule?.name || '').trim();
      const roomsSpec = String(rule?.rooms || '').trim();
      if(!ruleName || !roomsSpec) return;

      const nameNorm = stripAccentsLower(ruleName);
      const expected = parseRoomSpec(roomsSpec);
      if(!expected.size) return;

      const byDate = new Map();
      for(const item of indexedRows){
        if(!item.haystack.includes(nameNorm)) continue;
        if(!byDate.has(item.dateLabel)) byDate.set(item.dateLabel, new Set());
        if(item.room) byDate.get(item.dateLabel).add(item.room);
      }

      if(!byDate.size) return;

      const details = [];
      byDate.forEach((roomSet, dateLabel)=>{
        const roomsDetected = Array.from(roomSet);
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

  function syncMonthlyAlerts(rows, options = {}){
    const { refreshTodo = true } = options;
    const key = 'aar_todo_week_v1';
    const existing = safeJsonParse(localStorage.getItem(key) || '[]', []);
    const manual = Array.isArray(existing) ? existing.filter(x => x?.kind !== 'assignment_watch') : [];
    const alerts = buildAssignmentWatchAlerts(rows);
    localStorage.setItem(key, JSON.stringify([...manual, ...alerts]));
    if(refreshTodo && window.TODO?.refresh) window.TODO.refresh();
  }

  function refreshAssignmentWatchAlerts(options = {}){
    syncMonthlyAlerts(getHotelMemoryRows(), options);
  }

  let _assignmentWatchCommitTimer = null;
  function scheduleAssignmentWatchCommit(){
    clearTimeout(_assignmentWatchCommitTimer);
    _assignmentWatchCommitTimer = setTimeout(()=>{
      saveRules({
        refreshHomeChecklist: false,
        syncAssignmentAlerts: false
      });
      refreshAssignmentWatchAlerts();
    }, 450);
  }

  function moveChecklistRuleItem(side, fromIndex, toIndex){
    if(!Array.isArray(RULES.checklists?.[side])) return;
    if(fromIndex === toIndex) return;
    const list = RULES.checklists[side];
    if(fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    saveRules();
    renderRulesChecklistModel();
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
      let dragIndex = -1;

      if(!list.length){
        const empty = document.createElement('div');
        empty.className = 'muted rules-checklist-empty';
        empty.textContent = 'Aucune tâche fixe.';
        host.appendChild(empty);
      } else {
        list.forEach((item, i)=>{
          const row = document.createElement('div');
          row.className = 'rules-checklist-row';
          row.draggable = true;
          row.dataset.index = String(i);

          row.addEventListener('dragstart', (e)=>{
            dragIndex = i;
            row.classList.add('is-dragging');
            if(e.dataTransfer){
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(i));
            }
          });

          row.addEventListener('dragend', ()=>{
            dragIndex = -1;
            row.classList.remove('is-dragging');
            host.querySelectorAll('.rules-checklist-row').forEach(el=>el.classList.remove('is-drag-over'));
          });

          row.addEventListener('dragover', (e)=>{
            e.preventDefault();
            if(dragIndex === i) return;
            row.classList.add('is-drag-over');
            if(e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          });

          row.addEventListener('dragleave', ()=>{
            row.classList.remove('is-drag-over');
          });

          row.addEventListener('drop', (e)=>{
            e.preventDefault();
            row.classList.remove('is-drag-over');
            const fromIndex = dragIndex >= 0 ? dragIndex : Number(e.dataTransfer?.getData('text/plain'));
            moveChecklistRuleItem(cfg.side, fromIndex, i);
          });

          const handle = document.createElement('button');
          handle.type = 'button';
          handle.className = 'rules-checklist-handle';
          handle.title = 'Glisser pour réorganiser';
          handle.setAttribute('aria-label', 'Glisser pour réorganiser');
          handle.textContent = '⋮⋮';

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

          row.append(handle, input, del);
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
        scheduleAssignmentWatchCommit();
      });

      name.addEventListener('blur', ()=>{
        clearTimeout(_assignmentWatchCommitTimer);
        saveRules({
          refreshHomeChecklist: false,
          syncAssignmentAlerts: false
        });
        refreshAssignmentWatchAlerts();
      });

      const rooms = document.createElement('input');
      rooms.type = 'text';
      rooms.placeholder = '246-250, 360';
      rooms.value = rule?.rooms || '';
      rooms.addEventListener('input', ()=>{
        RULES.assignment_watch[i].rooms = rooms.value;
        scheduleAssignmentWatchCommit();
      });

      rooms.addEventListener('blur', ()=>{
        clearTimeout(_assignmentWatchCommitTimer);
        saveRules({
          refreshHomeChecklist: false,
          syncAssignmentAlerts: false
        });
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
  populateInventoryCapacityInputs();
  renderAssignmentWatchRules();
  renderRulesChecklistModel();

  byId('btn-save')?.addEventListener('click',()=>{
    readKeywordAreasToRules();
    readInventoryCapacityInputsToRules();
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
    populateInventoryCapacityInputs();
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
          baby_exclude: Array.isArray(obj.baby_exclude) ? obj.baby_exclude : DEFAULTS.baby_exclude.slice(),
          vcc_rates: Array.isArray(obj.vcc_rates) ? obj.vcc_rates : DEFAULTS.vcc_rates.slice(),
          sofa:{...DEFAULTS.sofa,...(obj.sofa||{})},
          assignment_watch: Array.isArray(obj.assignment_watch) ? obj.assignment_watch : DEFAULTS.assignment_watch.slice(),
          inventory_capacity: {
            ...DEFAULTS.inventory_capacity,
            ...(obj.inventory_capacity || {})
          },
          checklists: {
            morning: normalizeChecklistRuleItems(obj?.checklists?.morning ?? DEFAULTS.checklists.morning, 'm'),
            evening: normalizeChecklistRuleItems(obj?.checklists?.evening ?? DEFAULTS.checklists.evening, 'e')
          }
        };
        saveRules();
        renderSofaTable();
        populateKeywordAreas();
        populateInventoryCapacityInputs();
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
      inputBase.value = (baseNumInit == null) ?'' : `${fmtEUR(baseNumInit)} €`;
      tdBase.appendChild(inputBase);

      inputBase.addEventListener('focus', ()=>{
        inputBase.value = (inputBase.value || '').replace(/\s*€\s*$/,'');
      });

      inputBase.addEventListener('blur', ()=>{
        const n = n2(inputBase.value);
        inputBase.value = (n == null) ?'' : `${fmtEUR(n)} €`;
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
      all.value = (allNum == null) ?'' : `${fmtEUR(allNum)} €`;
      tdAll.appendChild(all);

      const tdPlus = document.createElement('td');
      const plus = document.createElement('input');
      plus.type = 'text';
      plus.readOnly = true;
      plus.className = 'tarifs-readonly';
      plus.value = (plusNum == null) ?'' : `${fmtEUR(plusNum)} €`;
      tdPlus.appendChild(plus);

      inputBase.oninput = ()=>{
        tarifs[i].base = inputBase.value;
        saveTarifs();

        const baseNumLive = n2(inputBase.value);
        all.value  = (baseNumLive == null) ?'' : `${fmtEUR(computeAll(baseNumLive))} €`;
        plus.value = (baseNumLive == null) ?'' : `${fmtEUR(computeAllPlus(baseNumLive))} €`;
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
  const regexClientStart = /^"[A-ZÉÈÀÂÊÎÔÛÄËÏÖŒÇ][^;]+";/;

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
    processGroupsFromRows(rows);
  }

  function processGroupsFromRows(rows){
    persistCompactGroupRows(rows);
    if (typeof window.onGroupsSourceUpdated === "function") {
      window.onGroupsSourceUpdated();
    }
  }

  function buildHomeGraphCompactFromRows(rows){
    const mapInd = new Map();
    const mapGrp = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const dateObj = parseFolsDateCell(
        pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
      );
      if (!dateObj) return;
      const iso = toIsoDateUtc(dateObj);
      const groupName = String(pick(row, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim();
      const roomNum = String(pick(row, ['ROOM_NUM','ROOM','ROOM_NO','CHAMBRE','NUM_CHAMBRE']) || '').trim();
      const rooms = Math.max(1, parseInt(pick(row, ['NB_RESA','NB RESA','NBR_RESA','NB_ROOMS','ROOMS']) || '1', 10) || 1);
      const isGroup = !!groupName || /^grp\b/i.test(roomNum);
      const target = isGroup ? mapGrp : mapInd;
      target.set(iso, (target.get(iso) || 0) + rooms);
    });
    const dates = Array.from(new Set([...mapInd.keys(), ...mapGrp.keys()])).sort();
    return {
      compact: true,
      dates,
      yInd: dates.map(date => mapInd.get(date) || 0),
      yGrp: dates.map(date => mapGrp.get(date) || 0)
    };
  }

  function processHomeGraphFromRaw(raw, rowsOverride = null){
    const rows = Array.isArray(rowsOverride)
      ? rowsOverride
      : (() => {
          const { header, blocks } = parseCsvHeaderAndBlocks(String(raw || ''));
          return buildRowsFromBlocks(header, blocks);
        })();
    localStorage.setItem('aar_home_arrivals_source_v1', JSON.stringify(buildHomeGraphCompactFromRows(rows)));
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
      .replace(/[\\u0300-\\u036f]/g, '')
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
      .replace(/[\\u0300-\\u036f]/g, '')
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

  
  function formatGuestNameDisplay(raw){
    const cleaned = collapseRepeatedNameParts(raw);
    return formatNameVCC(cleaned);
  }

  function collapseRepeatedNameParts(raw){
    const src = String(raw || '').trim();
    if (!src) return '';
    const parts = src.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      const seen = new Set();
      const kept = [];
      for (const part of parts) {
        const key = normalizeAcdcText(part);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        kept.push(part);
      }
      if (kept.length) return kept.join(' - ');
    }

    const words = src.split(/\s+/).map(s => s.trim()).filter(Boolean);
    if (!words.length) return '';
    const out = [];
    const seenWords = new Set();
    for (const word of words) {
      const key = normalizeAcdcText(word);
      if (!key || seenWords.has(key)) continue;
      seenWords.add(key);
      out.push(word);
    }
    return out.join(' ');
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
      const key = `${formatNameVCC(name)}__${dateKey}`;
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
    const idxAgence = getAcdcHeaderIndex(headers, [/^agence de voyage$/, /agence de voyage/, /\bagence\b.*\bvoyage\b/, /\btravel agency\b/]);

    if (idxNom < 0 || idxPrenom < 0 || idxArrival < 0 || idxRoom < 0 || idxStatut < 0 || idxClients < 0) {
      return [];
    }

    const out = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const nom = String(row[idxNom] || '').trim();
      const prenom = String(row[idxPrenom] || '').trim();
      if (!nom && !prenom) continue;

      const agenceVoyage = idxAgence >= 0 ? String(row[idxAgence] || '').trim() : '';
      if (agenceVoyage) continue;

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
          lastName: nom,
          firstName: prenom,
          displayName: formatAcdcNameParts(nom, prenom),
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
      name.textContent = (item.meta?.lastName || item.meta?.firstName)
        ? formatAcdcNameParts(item.meta?.lastName, item.meta?.firstName)
        : formatVccLastNameFirstName(collapseRepeatedNameParts(item.meta?.name || item.meta?.displayName || item.text));

      const meta = document.createElement('div');
      meta.className = 'home-eval-meta';
      const parts = [];
      if (item.meta?.status) parts.push(item.meta.status);
      if (item.meta?.clients) parts.push(`${item.meta.clients} pax`);
      if (item.meta?.arrival) {
        parts.push(`Arrivée ${item.meta.arrival}`);
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
        arrow.textContent = isOpen ?'▾' : '▸';
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
        text: formatAcdcNameParts(nom, prenom),
        meta: {
          name: formatAcdcNameParts(nom, prenom),
          lastName: nom,
          firstName: prenom,
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
      getHotelMemoryRows()
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
      const storedNameParts = String(item.id || '').split('__');
      const storedFirstName = collapseRepeatedNameParts(String(storedNameParts[1] || '').split(/\s*-\s*/)[0]);
      const displayName = (item.meta?.lastName || item.meta?.firstName)
        ? formatAcdcNameParts(item.meta?.lastName, item.meta?.firstName)
        : (storedNameParts.length >= 2
          ? formatAcdcNameParts(collapseRepeatedNameParts(storedNameParts[0]), storedFirstName)
          : formatVccLastNameFirstName(item.meta?.name || item.text));
      name.textContent = `${displayName} — ${item.meta?.score ?? '?'} / 10`;

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

  function formatImportDate(ts){
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return d.toLocaleString('fr-FR', { dateStyle:'medium', timeStyle:'short' });
  }


  function formatDashboardCurrentDate(date = new Date()) {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function renderDashboardCurrentDate(){
    const el = byId('dashboard-current-date');
    if (!el) return;
    const txt = formatDashboardCurrentDate(getDashboardActiveDateObj());
    el.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  function renderDashboardKpiSubLabels(){
    const dateObj = getDashboardActiveDateObj();
    const dd = String(dateObj.getUTCDate()).padStart(2,'0');
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2,'0');
    const label = `${dd}/${mm}`;
    const map = {
      'kpi-departures-sub': `pour le ${label}`,
      'kpi-arrivals-sub': `pour le ${label}`,
      'kpi-stayovers-sub': `pour le ${label}`,
      'kpi-sofa-sub': `pour le ${label}`,
      'kpi-baby-sub': `pour le ${label}`,
      'kpi-vcc-sub': `pour le ${label}`,
      'kpi-preferences-sub': `pour le ${label}`
    };
    Object.entries(map).forEach(([id, text])=>{
      const el = byId(id);
      if (el) el.textContent = text;
    });
  }

  function getActiveHomeKpiModalType(){
    const map = {
      'kpi-departures-card': 'departures',
      'kpi-arrivals-card': 'arrivals',
      'kpi-vcc-card': 'vcc',
      'kpi-preferences-card': 'preferences',
      'kpi-baby-card': 'babies',
      'kpi-sofa-card': 'sofas',
      'kpi-stayovers-card': 'stayovers'
    };
    return map[HOME_KPI_MODAL_ACTIVE_CARD_ID || ''] || '';
  }

  function getInventoryPressureDateLabel(dateObj){
    if (!(dateObj instanceof Date) || isNaN(dateObj)) return '—';
    const dd = String(dateObj.getUTCDate()).padStart(2,'0');
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2,'0');
    return `${dd}/${mm}`;
  }

  function normalizeInventoryCategory(raw){
    const src = String(raw || '').trim().toUpperCase();
    if (!src) return '';
    if (src === 'TRI') return 'TRI';
    if (src === 'STDM' || src === 'STD' || src === 'STD M') return 'STDM';
    if (src === 'PRIVM' || src === 'PRIV M') return 'PRIVM';
    if (src === 'EXEC' || src === 'EXE') return 'EXEC';
    if (src === 'SGE') return 'SGE';
    return '';
  }

  function getInventoryCategoryFromRow(row){
    const direct = normalizeInventoryCategory(pick(row, [
      'ROOM_TYPE','ROOMTYPE','TYPE_CHB','TYPE CHB','ROOM CAT','ROOM CATEGORY',
      'ROOM_CLASS','ROOMCLASS','CATEGORY','CATEGORIE','CAT','CAT_CHB','CAT CHB',
      'CLASS','CHB_TYPE','CHB TYPE','TYPO_CHB','TYPO CHB','TYPCOD'
    ]) || '');
    if (direct) return direct;

    const hay = [
      pick(row, ['ROOM_TYPE','ROOMTYPE','TYPE_CHB','TYPE CHB','ROOM CAT','ROOM CATEGORY','ROOM_CLASS','ROOMCLASS','CATEGORY','CATEGORIE','CAT','CAT_CHB','CAT CHB','CLASS','CHB_TYPE','CHB TYPE','TYPO_CHB','TYPO CHB','TYPCOD']) || '',
      row.__first || '',
      row.__text || ''
    ].join(' | ').toUpperCase();

    const match = hay.match(/(TRI|STDM|PRIVM|EXEC|EXE|SGE)/);
    return normalizeInventoryCategory(match ? match[1] : '');
  }

  function getInventoryPressureStatus(ratio){
    if (!(ratio > 0)) return { label: 'faible', tone: 'low' };
    if (ratio >= 0.85) return { label: 'élevée', tone: 'high' };
    if (ratio >= 0.55) return { label: 'moyenne', tone: 'medium' };
    return { label: 'faible', tone: 'low' };
  }

  function getGroupInventoryArrivalCountsForDate(dateObj){
    const counts = { TRI: 0, STDM: 0, PRIVM: 0, EXEC: 0, SGE: 0 };
    const result = window.__AAR_GROUPS_WEEKS_RESULT;
    const weeks = Array.isArray(result?.weeks) ? result.weeks : [];
    if (!(dateObj instanceof Date) || isNaN(dateObj) || !weeks.length) return counts;

    const targetTime = Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());

    weeks.forEach(week => {
      (Array.isArray(week?.groups) ? week.groups : []).forEach(group => {
        const arrival = group?.arrival instanceof Date ? group.arrival : null;
        if (!arrival || isNaN(arrival)) return;
        const arrivalTime = Date.UTC(arrival.getUTCFullYear(), arrival.getUTCMonth(), arrival.getUTCDate());
        if (arrivalTime !== targetTime) return;

        const roomTypes = group?.roomTypes || {};
        Object.entries(roomTypes).forEach(([rawCategory, rawCount]) => {
          const category = normalizeInventoryCategory(rawCategory);
          const count = Number(rawCount || 0);
          if (!category || !(count > 0)) return;
          counts[category] = (counts[category] || 0) + count;
        });
      });
    });

    return counts;
  }

  function buildInventoryPressureState(rows){
    const activeDate = getDashboardActiveDateObj();
    const targetTime = activeDate.getTime();
    const capacities = {
      ...DEFAULTS.inventory_capacity,
      ...((RULES && RULES.inventory_capacity) || {})
    };
    const individualCounts = { TRI: 0, STDM: 0, PRIVM: 0, EXEC: 0, SGE: 0 };

    (Array.isArray(rows) ? rows : []).forEach(row => {
      const category = getInventoryCategoryFromRow(row);
      if (!category) return;

      const arrival = parseFolsDateCell(
        pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
      );
      if (!arrival) return;

      const departure = parseFolsDateCell(
        pick(row, ['Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || ''
      );

      const startTime = asUtcStart(arrival)?.getTime();
      if (!Number.isFinite(startTime)) return;
      const endTime = departure ? asUtcStart(departure)?.getTime() : null;

      const isActive = endTime == null ? (targetTime === startTime) : (targetTime >= startTime && targetTime < endTime);
      if (!isActive) return;

      individualCounts[category] = (individualCounts[category] || 0) + 1;
    });

    const groupArrivalCounts = getGroupInventoryArrivalCountsForDate(activeDate);

    return ['TRI','STDM','PRIVM','EXEC','SGE'].map(category => {
      const capacity = normalizeInventoryCapacityValue(capacities[category]);
      const usedIndividuals = Number(individualCounts[category] || 0);
      const usedGroups = Number(groupArrivalCounts[category] || 0);
      const used = usedIndividuals + usedGroups;
      const ratio = capacity > 0 ? Math.min(used / capacity, 1) : 0;
      const status = getInventoryPressureStatus(ratio);
      return { category, used, capacity, ratio, status, usedIndividuals, usedGroups };
    });
  }

  function refreshInventoryPressureCard(rows){
    const host = byId('inventory-pressure-list');
    const dateLabel = byId('inventory-pressure-date-label');
    if (dateLabel) dateLabel.textContent = getInventoryPressureDateLabel(getDashboardActiveDateObj());
    if (!host) return;

    const state = buildInventoryPressureState(rows);
    host.innerHTML = '';

    state.forEach(item => {
      const row = document.createElement('div');
      row.className = 'inventory-pressure-row';

      const head = document.createElement('div');
      head.className = 'inventory-pressure-head';

      const name = document.createElement('span');
      name.className = 'inventory-pressure-name';
      name.textContent = item.category;

      const meta = document.createElement('span');
      meta.className = 'inventory-pressure-meta muted small';
      const metaBits = [];
      if (item.usedIndividuals > 0) metaBits.push(`${item.usedIndividuals} indiv`);
      if (item.usedGroups > 0) metaBits.push(`${item.usedGroups} grp`);
      if (!metaBits.length) metaBits.push('0');
      meta.textContent = metaBits.join(' • ');

      head.append(name, meta);

      const track = document.createElement('div');
      track.className = 'inventory-pressure-track';
      const fill = document.createElement('div');
      fill.className = `inventory-pressure-fill is-${item.status.tone}`;
      fill.style.width = `${Math.max(8, Math.round(item.ratio * 100))}%`;
      if (!(item.ratio > 0)) fill.style.width = '8%';
      track.appendChild(fill);

      row.append(head, track);
      host.appendChild(row);
    });
  }

  window.__AAR_REFRESH_INVENTORY_PRESSURE = function(){
    refreshInventoryPressureCard(getHotelMemoryRows());
  };

  function refreshDashboardForActiveDate(){
    renderDashboardCurrentDate();
    renderDashboardKpiSubLabels();
    renderVacationCalendar(getDashboardActiveDateObj());
    setTimeout(syncHomeChecklistToDashboardDate, 0);

    const rows = getHotelMemoryRows();
    if (rows.length) {
      renderArrivalsFOLS_fromRows(rows);
    } else {
      updateSofaKpiHover({ counts: {} });
      renderHomeKpiMetrics({ arrivals: 0, departures: 0, stayovers: 0, babies: 0, sofas: 0, vcc: 0, preferences: 0 });
      renderHomeNextDays([]);
      refreshTodayPreferencesKpi({ forceOverviewRefresh: true });
      refreshInventoryPressureCard([]);
    }
    if (!byId('home-vcc-modal')?.hidden) {
      const type = getActiveHomeKpiModalType();
      if (type) openHomeKpiModal(type);
    }
  }

  function setDashboardActiveDate(dateObj, options = {}){
    const safe = asUtcStart(dateObj);
    if (!safe) return;
    DASHBOARD_ACTIVE_DATE = safe;
    saveDashboardActiveDate();
    refreshDashboardForActiveDate(options);
  }

  function shiftDashboardActiveDate(offsetDays){
    const base = getDashboardActiveDateObj();
    setDashboardActiveDate(addDaysUtc(base, Number(offsetDays) || 0));
  }

  function renderImportDates(){
    const indivEl = byId('import-date-indiv');
    const acdcEl = byId('import-date-acdc');
    if (indivEl) {
      const reservationPayload = safeJsonParse(localStorage.getItem(LS_RESERVATION_CONTROL) || 'null', null);
      const ts = localStorage.getItem(LS_IMPORT_DATE_INDIV) || reservationPayload?.importedAt || '';
      indivEl.textContent = `Mise à jour : ${formatImportDate(ts)}`;
    }
    if (acdcEl) {
      const ts = localStorage.getItem(LS_IMPORT_DATE_ACDC) || '';
      acdcEl.textContent = `Mise à jour : ${formatImportDate(ts)}`;
    }
  }

  function handleAcdcFile(file) {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        if (!window.XLSX && typeof window.AAR_LOAD_XLSX === 'function') {
          await window.AAR_LOAD_XLSX();
        }
        const parsed = parseAcdcWorkbook(e.target.result);
        const alerts = parsed?.alerts || [];
        const sofaCandidates = parsed?.sofaCandidates || [];
        const nowTs = new Date().toISOString();
        localStorage.setItem(LS_ACDC_ALERTS, JSON.stringify(alerts));
        localStorage.setItem(LS_ACDC_SOFA, JSON.stringify(sofaCandidates));
        localStorage.setItem(LS_IMPORT_DATE_ACDC, nowTs);
        renderImportDates();
        renderAcdcEvaluationAlerts(alerts);
        renderAcdcSofaAlerts(sofaCandidates);

        const statusEl = byId('acdc-import-status');
        if (statusEl) {
          statusEl.textContent = `ACDC chargé • ${alerts.length} alerte(s) • ${sofaCandidates.length} sofa`;
        }

        try {
          await ghSaveSnapshotPath(window.GH_PATHS.acdc, {
            version: 1,
            type: "acdc",
            updated_at: nowTs,
            source: "acdc_portfolio",
            hotel_id: "novotel_collegien",
            payload: {
              alerts,
              sofa_candidates: sofaCandidates
            },
            meta: {
              import_label: "Portefeuille ACDC",
              imported_by: "manual",
              alerts_count: alerts.length,
              sofa_count: sofaCandidates.length
            }
          }, "acdc import");
        } catch (err) {
          console.warn("save acdc failed:", err);
        }

        toast(`ACDC charge - ${alerts.length} alerte(s) evaluation`);
      } catch (err) {
        console.error(err);
        toast('Import ACDC impossible');
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

  function addDaysUtc(d, days){
    if (!(d instanceof Date) || isNaN(d) || !Number.isFinite(days)) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
  }

  function normalizeRecoucheGuestName(raw){
    let s = String(raw || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!s) return '';

    const rawParts = s.split(/\s+-\s+/).map(x => x.trim()).filter(Boolean);
    if (rawParts.length) {
      const uniqueParts = [];
      const seen = new Set();
      rawParts.forEach(part => {
        const cleaned = stripAccentsLower(part)
          .replace(/[^a-z0-9\s\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();
        if (cleaned && !seen.has(cleaned)) {
          seen.add(cleaned);
          uniqueParts.push(cleaned);
        }
      });

      if (uniqueParts.length === 1) {
        s = uniqueParts[0];
      } else if (uniqueParts.length > 1) {
        s = uniqueParts[0];
      }
    }

    return stripAccentsLower(s)
      .replace(/[^a-z0-9\s\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function recoucheDisplayLastName(raw){
    let cleaned = String(raw || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return '';

    const rawParts = cleaned.split(/\s+-\s+/).map(x => x.trim()).filter(Boolean);
    if (rawParts.length) cleaned = rawParts[0];

    cleaned = cleaned.toUpperCase();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    return parts[0].length < 3 ? `${parts[0]} ${parts[1] || ''}`.trim() : parts[0];
  }

  function parsePositiveIntLoose(v){
    if (v == null || v === '') return null;
    const n = parseInt(String(v).replace(/[^\d\-]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function toIsoDateUtc(d){
    if (!(d instanceof Date) || isNaN(d)) return '';
    return d.toISOString().slice(0, 10);
  }

  function getLocalSnapshotDateKey(){
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2,'0');
    const d = String(now.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function loadFolsSnapshots(){
    localStorage.removeItem(LS_FOLS_SNAPSHOTS);
    localStorage.removeItem(LS_FOLS_CURRENT_SNAPSHOT_DATE);
    localStorage.removeItem(LS_FOLS_PREVIOUS_SNAPSHOT_DATE);
    return {};
  }

  function saveFolsSnapshotsMap(map){
    localStorage.removeItem(LS_FOLS_SNAPSHOTS);
    localStorage.removeItem(LS_FOLS_CURRENT_SNAPSHOT_DATE);
    localStorage.removeItem(LS_FOLS_PREVIOUS_SNAPSHOT_DATE);
    return {};
  }

  function isQuotaExceededError(err){
    if (!err) return false;
    const code = Number(err.code || 0);
    const name = String(err.name || '');
    const msg = String(err.message || '').toLowerCase();
    return code === 22 || code === 1014 || name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || msg.includes('quota');
  }

  function cleanupFolsSnapshots(map){
    const keys = Object.keys(map || {}).sort();
    if (keys.length <= MAX_FOLS_SNAPSHOTS) return map;
    const trimmed = { ...(map || {}) };
    while (Object.keys(trimmed).length > MAX_FOLS_SNAPSHOTS) {
      const oldest = Object.keys(trimmed).sort()[0];
      delete trimmed[oldest];
    }
    return trimmed;
  }

  function shiftIsoDateKey(dateKey, deltaDays){
    const d = parseFolsDateCell(String(dateKey || '').trim());
    if (!d || !Number.isFinite(deltaDays)) return '';
    return toIsoDateUtc(addDaysUtc(d, deltaDays));
  }

  function extractSnapshotStayBounds(row){
    const arrival = parseFolsDateCell(
      pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
    );
    if (!arrival) return null;

    let departure = parseFolsDateCell(
      pick(row, ['Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || ''
    );

    const nights = parsePositiveIntLoose(
      pick(row, ['NB_NIGHTS','NIGHTS','NUITS','NB NUITS']) || ''
    );

    if (!departure && nights != null) {
      departure = addDaysUtc(arrival, nights);
    }

    if ((!departure || departure <= arrival) && nights != null) {
      departure = addDaysUtc(arrival, nights);
    }

    if (!departure || departure <= arrival) {
      departure = addDaysUtc(arrival, 1);
    }

    if (!departure || departure <= arrival) return null;

    return {
      arrival,
      departure,
      arrivalKey: toIsoDateUtc(arrival),
      departureKey: toIsoDateUtc(departure)
    };
  }

  function rowIntersectsSnapshotWindow(row, windowStartKey, windowEndKey){
    const bounds = extractSnapshotStayBounds(row);
    if (!bounds || !windowStartKey || !windowEndKey) return false;
    return bounds.departureKey >= windowStartKey && bounds.arrivalKey <= windowEndKey;
  }

  function buildCompactSnapshotRowSignature(row){
    if (!row || typeof row !== 'object') return '';
    return [
      String(row.GUES_NAME || '').trim().toUpperCase(),
      String(row.GUES_GROUPNAME || '').trim().toUpperCase(),
      String(row.PSER_DATE || '').trim(),
      String(row.Departure_Date || '').trim(),
      String(row.NB_NIGHTS || '').trim(),
      String(row.ROOM || '').trim().toUpperCase(),
      String(row.ROOM_TYPE || '').trim().toUpperCase(),
      String(row.NB_OCC_AD || '').trim(),
      String(row.NB_OCC_CH || '').trim(),
      String(row.RATE || '').trim().toUpperCase(),
      String(row.GUARANTY || '').trim().toUpperCase(),
      Number(row.__bf || 0) > 0 ? '1' : '0',
      Number(row.__cf || 0) > 0 ? '1' : '0',
      Number(row.__df || 0) > 0 ? '1' : '0',
      Number(row.__ef || 0) > 0 ? '1' : '0'
    ].join('|');
  }

  function dedupeCompactSnapshotRows(rows){
    const list = Array.isArray(rows) ? rows : [];
    const out = [];
    const seen = new Set();
    list.forEach(row => {
      const sig = buildCompactSnapshotRowSignature(row);
      if (!sig || seen.has(sig)) return;
      seen.add(sig);
      out.push(row);
    });
    return out;
  }

  function compactFolsSnapshotRow(row){
    const src = row && typeof row === 'object' ? row : {};
    const text = String(src.__text || '').trim();
    const compact = {
      GUES_NAME: pick(src, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) || '',
      GUES_GROUPNAME: pick(src, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '',
      PSER_DATE: pick(src, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || '',
      Departure_Date: pick(src, ['Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || '',
      NB_NIGHTS: pick(src, ['NB_NIGHTS','NIGHTS','NUITS','NB NUITS']) || '',
      ROOM: pick(src, ['ROOM','ROOM_NO','ROOM NO','ROOM_NUMBER','ROOM NUMBER','CHAMBRE','ROOMNUM','CHB','RM']) || '',
      ROOM_TYPE: normalizeInventoryCategory(
        pick(src, ['ROOM_TYPE','ROOMTYPE','TYPE_CHB','TYPE CHB','ROOM CAT','ROOM CATEGORY','ROOM_CLASS','ROOMCLASS','CATEGORY','CATEGORIE','CAT','CAT_CHB','CAT CHB','CLASS','CHB_TYPE','CHB TYPE','TYPO_CHB','TYPO CHB','TYPCOD']) || ''
      ) || '',
      NB_OCC_AD: pick(src, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '',
      NB_OCC_CH: pick(src, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '',
      RATE: pick(src, ['RATE','TARIF','Rate']) || '',
      GUARANTY: pick(src, ['GUARANTY','GUARANTEE','GARANTIE','Guarantee']) || '',
      __bf: hasBabyRequest(text) ? 1 : 0,
      __cf: compileRegex().comm && compileRegex().comm.test(cleanKeywordHaystack(text || '')) ? 1 : 0,
      __df: compileRegex().dayuse && compileRegex().dayuse.test(
        cleanKeywordHaystack(text || '')
          .replace(/["*()]/g,' ')
          .replace(/s\/intern[:\s-]*/g, ' ')
          .replace(/[^\p{L}\p{N}\s\+]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      ) ? 1 : 0,
      __ef: compileRegex().early && compileRegex().early.test(
        cleanKeywordHaystack(text || '')
          .replace(/["*()]/g,' ')
          .replace(/s\/intern[:\s-]*/g, ' ')
          .replace(/[^\p{L}\p{N}\s\+]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      ) ? 1 : 0
    };

    return compact;
  }

  function compactFolsSnapshotRows(rows, referenceDateKey = ''){
    if (!Array.isArray(rows)) return [];
    const baseKey = String(referenceDateKey || '').trim() || getLocalSnapshotDateKey();
    const windowStartKey = shiftIsoDateKey(baseKey, -5) || baseKey;
    const windowEndKey = shiftIsoDateKey(baseKey, 5) || baseKey;

    const compacted = rows
      .filter(row => rowIntersectsSnapshotWindow(row, windowStartKey, windowEndKey))
      .map(compactFolsSnapshotRow);

    return dedupeCompactSnapshotRows(compacted);
  }

  function buildSnapshotKpiPayload(rows, targetKey, previousSnapshotRows = []){
    const sourceRows = Array.isArray(rows) ? rows : [];
    const grouped = {};
    const rx = compileRegex();
    let lastKey = null, lastLabel = null;

    sourceRows.forEach(r => {
      try {
        const gname = String(pick(r, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim();
        if (gname) return;

        const name = recoucheDisplayLastName(String(pick(r, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) || '').trim());
        if (!name) return;

        const adu = parseInt(pick(r, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0', 10) || 0;
        const enf = parseInt(pick(r, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0', 10) || 0;
        const text = String(r.__text || '').trim();
        const keywordHaystack = cleanKeywordHaystack(text || '');
        const comment = keywordHaystack
          .replace(/["*()]/g,' ')
          .replace(/s\/intern[:\s-]*/g, ' ')
          .replace(/[^\p{L}\p{N}\s\+]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        let dObj = parseFolsDateCell(pick(r, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || '');
        if (!dObj && lastKey) dObj = new Date(`${lastKey}T00:00:00Z`);
        if (!dObj) return;

        const dateKey = toIsoDateUtc(dObj);
        if (!dateKey) return;
        if (dObj) {
          lastKey = dateKey;
          lastLabel = toFrLabel(dObj);
        }

        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            label: lastLabel || dateKey,
            total_resa: 0,
            '2_sofa': [],
            '1_sofa': [],
            'lit_bebe': [],
            'lit_bebe_plus1_sofa': [],
            sofa_type_counts: {},
            comm: [],
            dayuse: [],
            early: []
          };
        }

        grouped[dateKey].total_resa += 1;
        const sofaKey = `${adu}A+${enf}E`;
        const sofa = (RULES.sofa && RULES.sofa[sofaKey]) || '0';
        if (sofa === '1') grouped[dateKey]['1_sofa'].push(name);
        if (sofa === '2') grouped[dateKey]['2_sofa'].push(name);
        if (sofa === '1' || sofa === '2') {
          const sofaRoomType = getSofaRoomTypeDisplay(getInventoryCategoryFromRow(r) || pick(r, ['ROOM_TYPE']) || '');
          if (sofaRoomType) grouped[dateKey].sofa_type_counts[sofaRoomType] = Number(grouped[dateKey].sofa_type_counts[sofaRoomType] || 0) + 1;
        }
        const babyFlag = Number(r.__bf || 0) > 0 || (!!text && hasBabyRequest(text));
        const commFlag = Number(r.__cf || 0) > 0 || (!!text && rx.comm && rx.comm.test(keywordHaystack));
        const dayuseFlag = Number(r.__df || 0) > 0 || (!!text && rx.dayuse && rx.dayuse.test(comment));
        const earlyFlag = Number(r.__ef || 0) > 0 || (!!text && rx.early && rx.early.test(comment));

        if (babyFlag) {
          grouped[dateKey]['lit_bebe'].push(name);
          if ((adu + enf) === 4) grouped[dateKey]['lit_bebe_plus1_sofa'].push(name);
        }
        if (commFlag) grouped[dateKey].comm.push(name);
        if (dayuseFlag) grouped[dateKey].dayuse.push(name);
        if (earlyFlag) grouped[dateKey].early.push(name);
      } catch(err) {
        console.warn('snapshot KPI row ignored:', err);
      }
    });

    const activeGroup = grouped[targetKey] || null;
    const stayovers = (buildTrueRecoucheByDate(sourceRows, previousSnapshotRows).get(targetKey) || []).map(name => ({
      name: formatNameVCC(name),
      meta: 'Recouche'
    }));
    const departureCount = sourceRows.reduce((sum, r) => {
      const gname = String(pick(r, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim();
      if (gname) return sum;
      const departure = parseFolsDateCell(pick(r, ['Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || '');
      return sum + ((departure && toIsoDateUtc(departure) === targetKey) ? 1 : 0);
    }, 0);
    const babies = activeGroup ? (activeGroup['lit_bebe'] || []).map(name => ({
      name: formatNameVCC(name),
      meta: (activeGroup['lit_bebe_plus1_sofa'] || []).includes(name) ?'Lit bébé + sofa' : 'Lit bébé'
    })) : [];
    const sofas = activeGroup ? [
      ...(activeGroup['1_sofa'] || []).map(name => ({ name: formatNameVCC(name), meta: '1 sofa' })),
      ...(activeGroup['2_sofa'] || []).map(name => ({ name: formatNameVCC(name), meta: '2 sofas' }))
    ] : [];
    const vcc = collectHomeVccEntriesForDate(sourceRows, targetKey).map(item => ({
      name: item.name,
      meta: [item.rate, item.arrivalLabel && item.departureLabel ?`${item.arrivalLabel} → ${item.departureLabel}` : (item.arrivalLabel || item.departureLabel || ''), Number.isFinite(item.nights) && item.nights > 0 ?`${item.nights} ${item.nights > 1 ?'nuits' : 'nuit'}` : ''].filter(Boolean).join(' • ')
    }));

    return {
      metrics: {
        arrivals: activeGroup ? Number(activeGroup.total_resa || 0) : 0,
        departures: departureCount,
        stayovers: stayovers.length,
        babies: babies.length,
        sofas: sofas.length,
        vcc: vcc.length
      },
      details: {
        arrivals: getKpiArrivalDetailEntries(sourceRows, targetKey),
        departures: getKpiDepartureDetailEntries(sourceRows, targetKey),
        babies,
        sofas,
        sofas_summary: { counts: activeGroup && activeGroup.sofa_type_counts ? { ...activeGroup.sofa_type_counts } : {} },
        stayovers,
        vcc
      }
    };
  }


  function buildSnapshotKpiMapPayload(rows, referenceDateKey){
    const baseKey = String(referenceDateKey || '').trim() || getLocalSnapshotDateKey();
    const windowStartKey = shiftIsoDateKey(baseKey, -5) || baseKey;
    const windowEndKey = shiftIsoDateKey(baseKey, 5) || baseKey;
    const map = {};

    let cursorKey = windowStartKey;
    while (cursorKey) {
      const previousRows = getPreviousFolsSnapshotRowsForDate(cursorKey);
      map[cursorKey] = buildSnapshotKpiPayload(rows, cursorKey, previousRows);
      if (cursorKey === windowEndKey) break;
      const nextKey = shiftIsoDateKey(cursorKey, 1);
      if (!nextKey || nextKey === cursorKey) break;
      cursorKey = nextKey;
    }

    return map;
  }

  function getFolsSnapshotRowsForDate(dateKey){
    const snapshots = loadFolsSnapshots();
    return Array.isArray(snapshots?.[dateKey]?.rows) ? snapshots[dateKey].rows : [];
  }

  function getFolsSnapshotKpiForDate(dateKey){
    const targetKey = String(dateKey || '').trim();
    if (!targetKey) return null;

    const snapshots = loadFolsSnapshots();
    const direct = snapshots?.[targetKey];
    if (direct) {
      if (direct.kpi_by_date && direct.kpi_by_date[targetKey]) return direct.kpi_by_date[targetKey];
      if (direct.kpi) return direct.kpi;
    }

    const keys = Object.keys(snapshots || {}).sort().reverse();
    for (const snapshotKey of keys) {
      const snap = snapshots?.[snapshotKey];
      if (!snap) continue;
      const windowStartKey = String(snap.windowStartKey || shiftIsoDateKey(snapshotKey, -5) || snapshotKey);
      const windowEndKey = String(snap.windowEndKey || shiftIsoDateKey(snapshotKey, 5) || snapshotKey);
      if (windowStartKey && windowEndKey && !(windowStartKey <= targetKey && targetKey <= windowEndKey)) continue;
      if (snap.kpi_by_date && snap.kpi_by_date[targetKey]) return snap.kpi_by_date[targetKey];
      if (snapshotKey === targetKey && snap.kpi) return snap.kpi;
    }

    return null;
  }

  function getPreviousFolsSnapshotRowsForDate(referenceDateKey){
    const refKey = String(referenceDateKey || '').trim();
    if (!refKey) return [];
    const snapshots = loadFolsSnapshots();
    const keys = Object.keys(snapshots || {}).filter(k => k && k < refKey).sort();
    if (!keys.length) return [];

    const merged = [];
    keys.forEach(snapshotKey => {
      const snap = snapshots?.[snapshotKey];
      if (!snap || !Array.isArray(snap.rows) || !snap.rows.length) return;

      const windowStartKey = String(snap.windowStartKey || shiftIsoDateKey(snapshotKey, -5) || snapshotKey);
      const windowEndKey = String(snap.windowEndKey || shiftIsoDateKey(snapshotKey, 5) || snapshotKey);

      if (windowStartKey && windowEndKey && !(windowStartKey <= refKey && refKey <= windowEndKey)) return;

      snap.rows.forEach(row => {
        if (rowIntersectsSnapshotWindow(row, refKey, refKey)) {
          merged.push(row);
        }
      });
    });

    return dedupeCompactSnapshotRows(merged);
  }

  function saveFolsSnapshot(_rawCsv, _rows){
    localStorage.removeItem(LS_FOLS_SNAPSHOTS);
    localStorage.removeItem(LS_FOLS_CURRENT_SNAPSHOT_DATE);
    localStorage.removeItem(LS_FOLS_PREVIOUS_SNAPSHOT_DATE);
    return '';
  }

  function getPreviousFolsSnapshotRows(){
    const currentDate = localStorage.getItem(LS_FOLS_CURRENT_SNAPSHOT_DATE) || '';
    return getPreviousFolsSnapshotRowsForDate(currentDate);
  }

  function buildTrueRecoucheByDate(rows, extraRows = []){
    const byGuest = new Map();
    const mergedRows = [
      ...(Array.isArray(extraRows) ? extraRows : []),
      ...(Array.isArray(rows) ? rows : [])
    ];

    mergedRows.forEach((r, idx) => {
      const gname = String(pick(r, [
        'GUES_GROUPNAME',
        'GUES_GROUP_NAME',
        'GROUPNAME',
        'GROUP_NAME'
      ]) || '').trim();
      if (gname) return;

      const rawName = String(
        pick(r, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) ||
        splitCSV(r.__first || '', ';')[0] || ''
      ).trim();
      const guestKey = normalizeRecoucheGuestName(rawName);
      const displayName = recoucheDisplayLastName(rawName);
      if (!guestKey || !displayName) return;

      const arrival = parseFolsDateCell(
        pick(r, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
      );
      if (!arrival) return;

      let departure = parseFolsDateCell(
        pick(r, ['Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || ''
      );

      const nights = parsePositiveIntLoose(
        pick(r, ['NB_NIGHTS','NIGHTS','NUITS','NB NUITS']) || ''
      );

      if (!departure && nights != null) {
        departure = addDaysUtc(arrival, nights);
      }

      if ((!departure || departure <= arrival) && nights != null) {
        departure = addDaysUtc(arrival, nights);
      }

      if (!departure || departure <= arrival) return;

      if (!byGuest.has(guestKey)) byGuest.set(guestKey, []);
      byGuest.get(guestKey).push({
        guestKey,
        displayName,
        arrival,
        departure,
        arrivalKey: toIsoDateUtc(arrival),
        departureKey: toIsoDateUtc(departure),
        rowIndex: idx
      });
    });

    const recoucheByDate = new Map();

    byGuest.forEach((list) => {
      const sorted = list
        .slice()
        .sort((a, b) =>
          a.arrival - b.arrival ||
          a.departure - b.departure ||
          a.rowIndex - b.rowIndex
        );

      const deduped = [];
      const seen = new Set();

      sorted.forEach(item => {
        const sig = `${item.arrivalKey}__${item.departureKey}`;
        if (seen.has(sig)) return;
        seen.add(sig);
        deduped.push(item);
      });

      for (let i = 1; i < deduped.length; i++) {
        const prev = deduped[i - 1];
        const curr = deduped[i];
        const sameDayCheckoutCheckin = prev.departureKey && curr.arrivalKey && prev.departureKey === curr.arrivalKey;
        const notOverlap = curr.arrival >= prev.departure;

        if (sameDayCheckoutCheckin && notOverlap) {
          if (!recoucheByDate.has(curr.arrivalKey)) recoucheByDate.set(curr.arrivalKey, []);
          recoucheByDate.get(curr.arrivalKey).push(curr.displayName);
        }
      }
    });

    recoucheByDate.forEach((names, key) => {
      recoucheByDate.set(
        key,
        Array.from(new Set((names || []).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'))
      );
    });

    return recoucheByDate;
  }


  function getTodayLocalDateKey(){
    return toIsoDateUtc(getDashboardActiveDateObj());
  }

  function getTodayLocalDateObj(){
    return getDashboardActiveDateObj();
  }

  function getTodayLabelVariants(){
    const d = getTodayLocalDateObj();
    const dd = String(d.getUTCDate()).padStart(2,'0');
    const mm = String(d.getUTCMonth() + 1).padStart(2,'0');
    const yyyy = d.getUTCFullYear();
    return [
      toFrLabel(d).toLowerCase(),
      `${dd}/${mm}/${yyyy}`,
      `${dd}/${mm}`,
      `${yyyy}-${mm}-${dd}`
    ];
  }

  function getHomeVccTargetPrefixes(){
    return ['FLM', 'FMR', 'FLR'];
  }

  function toNameCase(value){
    return formatNameVCC(value);
  }

  function getHomeVccStayInfo(row){
    const arrival = parseFolsDateCell(
      pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
    );
    if (!arrival || isNaN(arrival)) return { arrivalLabel: '', departureLabel: '', nights: null };

    let departure = parseFolsDateCell(
      pick(row, ['Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || ''
    );
    const nights = parsePositiveIntLoose(
      pick(row, ['NB_NIGHTS','NIGHTS','NUITS','NB NUITS']) || ''
    );

    if ((!departure || departure <= arrival) && nights != null) {
      departure = addDaysUtc(arrival, nights);
    }

    const arrivalLabel = vccExtractDate(row);
    let departureLabel = '';
    if (departure && !isNaN(departure) && departure > arrival) {
      const dd = String(departure.getUTCDate()).padStart(2,'0');
      const mm = String(departure.getUTCMonth()+1).padStart(2,'0');
      departureLabel = `${dd}/${mm}`;
    }

    let safeNights = nights;
    if ((safeNights == null || !Number.isFinite(Number(safeNights))) && departure && departure > arrival) {
      safeNights = Math.round((departure - arrival) / 86400000);
    }

    return {
      arrivalLabel,
      departureLabel,
      nights: Number.isFinite(Number(safeNights)) ? Number(safeNights) : null
    };
  }

  function collectHomeVccEntriesForDate(rows, targetKey){
    const sourceRows = Array.isArray(rows) ? rows : [];
    const dayKey = String(targetKey || '').trim() || toIsoDateUtc(getDashboardActiveDateObj());
    const prefixes = getHomeVccTargetPrefixes();
    const entries = [];
    const seen = new Set();

    for (const r of sourceRows){
      const { rate, guaranty } = vccGetRateAndGuaranty(r);
      const rateUp = String(rate || '').trim().toUpperCase();
      if (!rateUp) continue;
      if (!prefixes.some(prefix => rateUp.startsWith(prefix))) continue;
      if (vccHasArrhesOrPrepay(guaranty)) continue;

      const arrivalDate = parseFolsDateCell(
        pick(r, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
      );
      if (!arrivalDate || toIsoDateUtc(arrivalDate) !== dayKey) continue;

      const name = vccExtractName(r);
      if (!name) continue;

      const date = vccExtractDate(r);
      const sig = `${vccNormalizeNameToken(name)}__${date}__${rateUp}`;
      if (seen.has(sig)) continue;
      seen.add(sig);

      const stay = getHomeVccStayInfo(r);

      entries.push({
        name: formatVccLastNameFirstName(name),
        date,
        rate: rateUp,
        arrivalLabel: stay.arrivalLabel,
        departureLabel: stay.departureLabel,
        nights: stay.nights
      });
    }

    entries.sort((a,b)=>{
      if (String(a.date || '') !== String(b.date || '')) return String(a.date || '').localeCompare(String(b.date || ''), 'fr');
      if (String(a.rate || '') !== String(b.rate || '')) return String(a.rate || '').localeCompare(String(b.rate || ''), 'fr');
      return String(a.name || '').localeCompare(String(b.name || ''), 'fr');
    });

    return entries;
  }

  function collectHomeVccEntries(rows){
    return collectHomeVccEntriesForDate(rows, toIsoDateUtc(getDashboardActiveDateObj()));
  }


  function getSofaRoomTypeDisplay(raw){
    const src = normalizeInventoryCategory(raw);
    if (src === 'TRI') return 'TRI';
    if (src === 'STDM') return 'STDM';
    if (src === 'PRIVM') return 'PRIVM';
    if (src === 'SGE') return 'SGE';
    if (src === 'EXEC') return 'EXEC';
    return '';
  }

  function getSofaUnitsByRoomType(roomType){
    const src = String(roomType || '').trim().toUpperCase();
    if (src === 'TRI' || src === 'SGE') return 1;
    if (src === 'STDM' || src === 'PRIVM' || src === 'EXEC') return 2;
    return 0;
  }

  function formatSofaTypeSummaryLines(counts){
    const map = counts && typeof counts === 'object' ? counts : {};
    const ordered = ['TRI', 'STDM', 'PRIVM', 'SGE', 'EXEC'];
    const extras = Object.keys(map)
      .filter(key => !ordered.includes(String(key || '').trim().toUpperCase()) && Number(map[key] || 0) > 0)
      .sort((a,b)=>String(a).localeCompare(String(b),'fr'));
    const finalOrder = [...ordered, ...extras];
    return finalOrder
      .filter(type => Number(map[type] || 0) > 0)
      .map(type => {
        const units = getSofaUnitsByRoomType(type);
        return {
          type,
          units,
          count: Number(map[type] || 0),
          line: `${type} ${units === 1 ?'1 sofa' : '2 sofas'} → ${Number(map[type] || 0)}`
        };
      });
  }

  function updateSofaKpiHover(summary){
    const card = byId('kpi-sofa-card');
    const lines = formatSofaTypeSummaryLines(summary?.counts || {});
    const text = lines.length ? lines.map(item => item.line).join('\n') : '';
    if (card) {
      if (text) card.setAttribute('title', text);
      else card.removeAttribute('title');
      card.removeAttribute('data-sofa-tooltip');
    }
  }

  function buildSofaTooltipText(counts){
    const lines = formatSofaTypeSummaryLines(counts || {});
    return lines.length ? lines.map(item => item.line).join('\n') : 'Aucun sofa';
  }

  let HOME_KPI_MODAL_ACTIVE_CARD_ID = '';
  window.__AAR_HOME_KPI_DETAILS = window.__AAR_HOME_KPI_DETAILS || { arrivals: [], departures: [], babies: [], sofas: [], stayovers: [] };

  function renderHomeVccModalList(entries){
    const host = byId('home-vcc-list');
    if (!host) return;

    const list = Array.isArray(entries) ? entries : [];
    if (!list.length){
      host.innerHTML = '<div class="home-vcc-empty">Aucune donnée pour aujourd’hui.</div>';
      return;
    }

    host.innerHTML = list.map(item => {
      const name = String(item?.name || item?.label || '').trim();
      const meta = String(item?.meta || '').trim();
      return `
      <div class="home-vcc-item">
        <div class="home-vcc-item-main">
          <div class="home-vcc-item-line">
            <span class="home-vcc-item-name">${escapeHtml(name)}</span>
            ${meta ? `<span class="home-vcc-item-meta">${escapeHtml(meta)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
    }).join('');
  }

  function extractTodayPreferenceEntriesFromOverviewDom(){
    const host = byId('overview-results');
    if (!host) return [];

    const variants = getTodayLabelVariants();
    const directCandidates = Array.from(host.children || []).filter(el => el && el.nodeType === 1);
    const sectionCandidates = directCandidates.length ? directCandidates : [host];

    let target = null;
    for (const node of sectionCandidates){
      const text = String(node.textContent || '').toLowerCase();
      if (variants.some(v => v && text.includes(v))) {
        target = node;
        break;
      }
    }
    if (!target) return [];

    const rows = [];
    const addRow = (name, meta='') => {
      const cleanName = String(name || '').replace(/\s+/g, ' ').trim();
      const cleanMeta = String(meta || '').replace(/\s+/g, ' ').trim();
      if (!cleanName) return;
      if (/^aucune/i.test(cleanName) || /^préférences/i.test(cleanName)) return;
      const sig = `${cleanName}__${cleanMeta}`;
      if (rows.some(x => `${x.name}__${x.meta}` === sig)) return;
      rows.push({ name: cleanName, meta: cleanMeta });
    };

    const tbodyRows = Array.from(target.querySelectorAll('tbody tr'));
    if (tbodyRows.length){
      tbodyRows.forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td,th')).map(td => String(td.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
        if (!cells.length) return;
        addRow(cells[0], cells.slice(1).join(' • '));
      });
      return rows;
    }

    const candidates = Array.from(target.querySelectorAll('li,.overview-row,.pref-row,.preference-row,.day-row,.overview-item,p'));
    candidates.forEach(el => {
      const txt = String(el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) return;
      const low = txt.toLowerCase();
      if (variants.includes(low)) return;
      if (/^préférences/i.test(txt) || /^aucune/i.test(txt)) return;
      const bits = txt.split(/\s+[•\-–—]\s+/).map(x => x.trim()).filter(Boolean);
      addRow(bits[0] || txt, bits.slice(1).join(' • '));
    });

    if (rows.length) return rows;

    const body = target.querySelector('.day-block > div:last-child, .day-body, .overview-body, .card-body, div[style*="white-space"]') || target;
    const rawText = String(body.textContent || '');
    const lines = rawText.split(/\r?\n+/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    lines.forEach(line => {
      const low = line.toLowerCase();
      if (variants.some(v => v && low === v)) return;
      if (/^aucune/i.test(line) || /^preferences/i.test(stripAccentsLower(line)) || line === '-' || line === '?') return;

      const prefixMatch = line.match(/^(?:PROCHE\s*ASCENSEUR|ELOIGNE\s*ASCENSEUR|ELOIGNEE\s*ASCENSEUR|AVEC\s*BAIGNOIRE)\s*:\s*(.+)$/i);
      if (prefixMatch){
        const meta = line.slice(0, line.indexOf(':')).trim();
        prefixMatch[1].split(/\s*,\s*/).map(x => x.trim()).filter(Boolean).forEach(name => addRow(name, meta));
        return;
      }

      const bits = line.split(/\s+[?\-??]\s+/).map(x => x.trim()).filter(Boolean);
      addRow(bits[0] || line, bits.slice(1).join(' - '));
    });

    return rows;
  }

  function getHomeKpiModalConfig(type){
    const details = window.__AAR_HOME_KPI_DETAILS || {};
    if (type === 'departures') {
      return {
        title: 'Départs du jour',
        sub: `Liste des clients au départ le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}` ,
        entries: Array.isArray(details.departures) ? details.departures : [],
        empty: `Aucun départ détecté pour le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}.`,
        anchorId: 'kpi-departures-card'
      };
    }
    if (type === 'arrivals') {
      return {
        title: 'Arrivées du jour',
        sub: `Liste des clients à l’arrivée le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}` ,
        entries: Array.isArray(details.arrivals) ? details.arrivals : [],
        empty: `Aucune arrivée détectée pour le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}.`,
        anchorId: 'kpi-arrivals-card'
      };
    }
    if (type === 'vcc') {
      const entries = collectHomeVccEntries(getHotelMemoryRows()).map(item => {
        const stayBits = [];
        if (item.arrivalLabel && item.departureLabel) stayBits.push(`${item.arrivalLabel} → ${item.departureLabel}`);
        else if (item.date) stayBits.push(item.date);
        if (Number.isFinite(item.nights) && item.nights > 0) stayBits.push(`${item.nights} ${item.nights > 1 ? 'nuits' : 'nuit'}`);
        return { name: item.name || '', meta: [item.rate || '', ...stayBits].filter(Boolean).join(' • ') };
      });
      return {
        title: 'VCC à traiter du jour',
        sub: `Rates FLM / FMR / FLR sans Arrhes ni PREPAY • ${formatDashboardCurrentDate(getDashboardActiveDateObj())}`,
        entries,
        empty: `Aucune VCC à traiter pour le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}.`,
        anchorId: 'kpi-vcc-card'
      };
    }
    if (type === 'preferences') {
      return {
        title: 'Préférences du jour',
        sub: `Détectées dans l’onglet Préférences pour le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}`,
        entries: extractTodayPreferenceEntriesFromOverviewDom(),
        empty: `Aucune préférence détectée pour le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}.`,
        anchorId: 'kpi-preferences-card'
      };
    }
    if (type === 'babies') {
      return {
        title: 'Lits bébé du jour',
        sub: `Demandes détectées sur les arrivées du ${formatDashboardCurrentDate(getDashboardActiveDateObj())}`,
        entries: Array.isArray(details.babies) ? details.babies : [],
        empty: `Aucun lit bébé détecté pour le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}.`,
        anchorId: 'kpi-baby-card'
      };
    }
    if (type === 'sofas') {
      return {
        title: 'Sofas du jour',
        sub: `Arrivées sofa du ${formatDashboardCurrentDate(getDashboardActiveDateObj())}`,
        entries: Array.isArray(details.sofas) ? details.sofas : [],
        empty: `Aucun sofa détecté pour le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}.`,
        anchorId: 'kpi-sofa-card'
      };
    }
    if (type === 'stayovers') {
      return {
        title: 'Recouches du jour',
        sub: `Déduites depuis l’import FOLS actuel • ${formatDashboardCurrentDate(getDashboardActiveDateObj())}`,
        entries: Array.isArray(details.stayovers) ? details.stayovers : [],
        empty: `Aucune recouche détectée pour le ${formatDashboardCurrentDate(getDashboardActiveDateObj())}.`,
        anchorId: 'kpi-stayovers-card'
      };
    }

    return { title: 'Détail du jour', sub: '', entries: [], empty: 'Aucune donnée.', anchorId: 'kpi-vcc-card' };
  }

  function formatDashboardShortDate(dateObj){
    if (!(dateObj instanceof Date) || isNaN(dateObj)) return '';
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  }

  function getKpiRowDisplayName(row){
    const raw = String(
      pick(row, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) ||
      splitCSV(row?.__first || '', ';')[0] || ''
    ).trim();
    return raw ? formatGuestNameDisplay(raw) : '';
  }

  function compactKpiMetaValues(values){
    const out = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach(value => {
      const clean = String(value || '').replace(/\s+/g, ' ').trim();
      if (!clean) return;
      const key = normalizeAcdcText(clean);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(clean);
    });
    return out;
  }

  function createGroupedKpiEntries(rows, targetKey, mode){
    const sourceRows = Array.isArray(rows) ? rows : [];
    const groups = new Map();

    sourceRows.forEach(row => {
      const gname = String(pick(row, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim();
      if (gname) return;

      const targetDate = parseFolsDateCell(
        mode === 'departure'
          ? (pick(row, ['Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || '')
          : (pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || '')
      );
      if (!targetDate || toIsoDateUtc(targetDate) !== targetKey) return;

      const name = getKpiRowDisplayName(row);
      if (!name) return;

      const stay = getHomeVccStayInfo(row);
      const arrivalKey = stay.arrivalLabel || '';
      const departureKey = stay.departureLabel || '';
      const groupKey = [normalizeAcdcText(name), arrivalKey, departureKey, mode].join('__');

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          name,
          rooms: [],
          categories: [],
          pax: [],
          stays: [],
          nights: [],
          rates: [],
          rawCount: 0
        });
      }

      const group = groups.get(groupKey);
      group.rawCount += 1;
      compactKpiMetaValues([getKpiRowRoomLabel(row)]).forEach(v => group.rooms.push(v));
      compactKpiMetaValues([getKpiRowCategoryLabel(row)]).forEach(v => group.categories.push(v));
      compactKpiMetaValues([getKpiRowPaxLabel(row)]).forEach(v => group.pax.push(v));
      compactKpiMetaValues([
        (stay.arrivalLabel && stay.departureLabel) ?`${stay.arrivalLabel} → ${stay.departureLabel}` : (stay.arrivalLabel || stay.departureLabel || '')
      ]).forEach(v => group.stays.push(v));
      compactKpiMetaValues([Number.isFinite(stay.nights) && stay.nights > 0 ? `${stay.nights} ${stay.nights > 1 ? 'nuits' : 'nuit'}` : '']).forEach(v => group.nights.push(v));
      compactKpiMetaValues([getKpiRowRateLabel(row)]).forEach(v => group.rates.push(v));
    });

    const entries = Array.from(groups.values()).map(group => {
      const rooms = compactKpiMetaValues(group.rooms);
      const categories = compactKpiMetaValues(group.categories);
      const pax = compactKpiMetaValues(group.pax);
      const stays = compactKpiMetaValues(group.stays);
      const nights = compactKpiMetaValues(group.nights);
      const rates = compactKpiMetaValues(group.rates);
      const meta = [
        rooms.length ? rooms.join(' / ') : '',
        categories.length ? categories.join(' / ') : '',
        pax.length ? pax.join(' / ') : '',
        stays.length ? stays.join(' / ') : '',
        nights.length ? nights.join(' / ') : '',
        rates.length ? rates.join(' / ') : ''
      ].filter(Boolean).join(' • ');
      const name = group.rawCount > 1 ?`${group.name} ×${group.rawCount}` : group.name;
      return {
        name,
        meta,
        sortRoom: rooms[0] || '',
        sortStay: stays[0] || '',
        rawCount: group.rawCount
      };
    });

    entries.sort((a, b) => {
      const roomCmp = String(a.sortRoom || '').localeCompare(String(b.sortRoom || ''), 'fr', { numeric: true, sensitivity: 'base' });
      if (roomCmp) return roomCmp;
      const nameCmp = String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' });
      if (nameCmp) return nameCmp;
      return String(a.sortStay || '').localeCompare(String(b.sortStay || ''), 'fr', { sensitivity: 'base' });
    });

    return entries.map(({ sortRoom, sortStay, ...item }) => item);
  }

  function getKpiRowRoomLabel(row){
    const room = String(pick(row, ['ROOM','ROOM_NO','ROOM NO','ROOM_NUMBER','ROOM NUMBER','CHAMBRE','ROOMNUM','CHB','RM']) || '').trim();
    return room ? `Ch ${room}` : '';
  }

  function getKpiRowPaxLabel(row){
    const adu = parsePositiveIntLoose(pick(row, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0') || 0;
    const enf = parsePositiveIntLoose(pick(row, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0') || 0;
    if (!adu && !enf) return '';
    if (adu && enf) return `${adu}A+${enf}E`;
    if (adu) return `${adu}A`;
    return `${enf}E`;
  }

  function getKpiRowCategoryLabel(row){
    const category = getInventoryCategoryFromRow(row);
    return category || '';
  }

  function getKpiRowRateLabel(row){
    const { rate } = vccGetRateAndGuaranty(row || {});
    const clean = String(rate || '').trim().toUpperCase();
    return clean || '';
  }

  function getKpiArrivalDetailEntries(rows, targetKey){
    return createGroupedKpiEntries(rows, targetKey, 'arrival');
  }
  function getKpiDepartureDetailEntries(rows, targetKey){
    return createGroupedKpiEntries(rows, targetKey, 'departure');
  }

  function positionHomeKpiModal(anchorId){
    const modal = byId('home-vcc-modal');
    const card = byId(anchorId || HOME_KPI_MODAL_ACTIVE_CARD_ID || 'kpi-vcc-card');
    const panel = modal?.querySelector('.home-vcc-panel');
    if (!modal || !card || !panel) return;

    const rect = card.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const panelWidth = Math.min(460, Math.max(300, vw - 32));
    const panelHeight = Math.min(560, Math.floor(vh * 0.68));
    const gap = 12;

    let left = rect.right - panelWidth;
    left = Math.max(16, Math.min(left, vw - panelWidth - 16));

    let top = rect.bottom + gap;
    if (top + panelHeight > vh - 16) top = Math.max(16, rect.top - panelHeight - gap);

    modal.style.setProperty('--home-vcc-left', `${Math.round(left)}px`);
    modal.style.setProperty('--home-vcc-top', `${Math.round(top)}px`);
  }

  function openHomeKpiModal(type){
    const modal = byId('home-vcc-modal');
    const titleEl = byId('home-vcc-modal-title');
    const subEl = byId('home-vcc-modal-sub');
    if (!modal || !titleEl || !subEl) return;

    const config = getHomeKpiModalConfig(type);
    titleEl.textContent = config.title || 'Détail du jour';
    subEl.textContent = config.sub || '';
    HOME_KPI_MODAL_ACTIVE_CARD_ID = config.anchorId || 'kpi-vcc-card';

    const host = byId('home-vcc-list');
    if (host && (!Array.isArray(config.entries) || !config.entries.length)) {
      host.innerHTML = `<div class="home-vcc-empty">${escapeHtml(config.empty || 'Aucune donnée.')}</div>`;
    } else {
      renderHomeVccModalList(config.entries || []);
    }

    modal.hidden = false;
    positionHomeKpiModal(HOME_KPI_MODAL_ACTIVE_CARD_ID);
    ['kpi-departures-card','kpi-arrivals-card','kpi-vcc-card','kpi-preferences-card','kpi-baby-card','kpi-sofa-card','kpi-stayovers-card'].forEach(id => byId(id)?.setAttribute('aria-expanded', id === HOME_KPI_MODAL_ACTIVE_CARD_ID ? 'true' : 'false'));
  }

  function closeHomeKpiModal(){
    const modal = byId('home-vcc-modal');
    if (!modal) return;
    modal.hidden = true;
    ['kpi-departures-card','kpi-arrivals-card','kpi-vcc-card','kpi-preferences-card','kpi-baby-card','kpi-sofa-card','kpi-stayovers-card'].forEach(id => byId(id)?.setAttribute('aria-expanded', 'false'));
    HOME_KPI_MODAL_ACTIVE_CARD_ID = '';
  }

  function setHomeKpiValue(id, value){
    const el = byId(id);
    if (!el) return;
    const n = Number(value);
    el.textContent = Number.isFinite(n) ? String(n) : '0';
  }

  window.addEventListener('resize', ()=>{ if (!byId('home-vcc-modal')?.hidden) positionHomeKpiModal(HOME_KPI_MODAL_ACTIVE_CARD_ID); });

  function renderHomeKpiMetrics(metrics = {}){
    window.__AAR_HOME_KPI_METRICS = {
      arrivals: Number(metrics.arrivals || 0),
      departures: Number(metrics.departures || 0),
      stayovers: Number(metrics.stayovers || 0),
      babies: Number(metrics.babies || 0),
      sofas: Number(metrics.sofas || 0),
      vcc: Number(metrics.vcc || 0),
      preferences: Number(metrics.preferences || 0)
    };

    setHomeKpiValue('kpi-arrivals-count', window.__AAR_HOME_KPI_METRICS.arrivals);
    setHomeKpiValue('kpi-departures-count', window.__AAR_HOME_KPI_METRICS.departures);
    setHomeKpiValue('kpi-stayovers-count', window.__AAR_HOME_KPI_METRICS.stayovers);
    setHomeKpiValue('kpi-baby-count', window.__AAR_HOME_KPI_METRICS.babies);
    setHomeKpiValue('kpi-sofa-count', window.__AAR_HOME_KPI_METRICS.sofas);
    setHomeKpiValue('kpi-vcc-count', window.__AAR_HOME_KPI_METRICS.vcc);
    setHomeKpiValue('kpi-preferences-count', window.__AAR_HOME_KPI_METRICS.preferences);
  }

  function extractTodayPreferenceCountFromOverviewDom(){
    return extractTodayPreferenceEntriesFromOverviewDom().length;
  }

  function refreshTodayPreferencesKpi(options = {}){
    const { forceOverviewRefresh = false } = options || {};
    const applyCount = () => {
      const count = extractTodayPreferenceCountFromOverviewDom();
      if (count == null) return;
      const metrics = { ...(window.__AAR_HOME_KPI_METRICS || {}) };
      metrics.preferences = Number(count || 0);
      renderHomeKpiMetrics(metrics);
    };

    if (forceOverviewRefresh && window.OVERVIEW && typeof window.OVERVIEW.refresh === 'function') {
      try {
        window.OVERVIEW.refresh(false);
      } catch (err) {
        console.warn('overview refresh for KPI failed:', err);
      }
    }

    requestAnimationFrame(() => {
      applyCount();
      setTimeout(applyCount, 60);
      setTimeout(applyCount, 180);
    });
  }

  function attachOverviewKpiObserver(){
    const host = byId('overview-results');
    if (!host || host.__aarKpiObserverAttached) return;

    const observer = new MutationObserver(() => {
      refreshTodayPreferencesKpi();
    });

    observer.observe(host, { childList: true, subtree: true, characterData: true });
    host.__aarKpiObserverAttached = true;
  }


  const INDIV_DAY_CONTROL = {};

  function resetIndivDayControlStore(){
    Object.keys(INDIV_DAY_CONTROL).forEach(k => delete INDIV_DAY_CONTROL[k]);
  }

  function ensureIndivDayControl(dateKey, label){
    if(!INDIV_DAY_CONTROL[dateKey]){
      INDIV_DAY_CONTROL[dateKey] = {
        label: label || dateKey || 'Jour',
        baby: [],
        comm: []
      };
    } else if (label && !INDIV_DAY_CONTROL[dateKey].label) {
      INDIV_DAY_CONTROL[dateKey].label = label;
    }
    return INDIV_DAY_CONTROL[dateKey];
  }

  function cleanProofText(raw){
    return String(raw || '')
      .replace(/<br\s*\/?>(\s*)/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(str){
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  function escapeRegex(str){
    return String(str || '').replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  }

  function normalizeKeywordToken(str){
    return stripAccentsLower(String(str || ''))
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function accentInsensitiveCharPattern(ch){
    const map = {
      a: '[aàáâãäåāăą]',
      c: '[cçćĉċč]',
      e: '[eèéêëēĕėęě]',
      i: '[iìíîïĩīĭįı]',
      n: '[nñńņňŋ]',
      o: '[oòóôõöøōŏőœ]',
      s: '[sśŝşš]',
      u: '[uùúûüũūŭůűų]',
      y: '[yýÿŷ]',
      z: '[zźżž]'
    };
    return map[ch] || escapeRegex(ch);
  }

  function buildKeywordHighlightPattern(token){
    const normalized = normalizeKeywordToken(token);
    if (!normalized) return '';

    return normalized
      .split(' ')
      .filter(Boolean)
      .map(part => part.split('').map(accentInsensitiveCharPattern).join(''))
      .join('[^\p{L}\p{N}]*');
  }

  function highlightControlProof(proof, type){
    const raw = String(proof || '');
    if (!raw) return '';

    const safe = escapeHtml(raw);
    const sourceKeywords = type === 'baby'
      ? (Array.isArray(RULES.keywords?.baby) ? RULES.keywords.baby : [])
      : (Array.isArray(RULES.keywords?.comm) ? RULES.keywords.comm : []);

    const patterns = Array.from(new Set(
      sourceKeywords
        .map(buildKeywordHighlightPattern)
        .filter(Boolean)
    )).sort((a, b) => b.length - a.length);

    if (!patterns.length) return safe;

    const cssClass = type === 'baby' ? 'kw-baby' : 'kw-comm';
    const regex = new RegExp(`(${patterns.join('|')})`, 'giu');

    return safe.replace(regex, match => `<span class="${cssClass}">${match}</span>`);
  }

  function shortenProofAroundKeyword(text, keywords, radius = 220){
    const source = cleanProofText(text);
    if(!source) return '';
    const lower = stripAccentsLower(source);
    const list = (Array.isArray(keywords) ? keywords : []).map(x => stripAccentsLower(x).trim()).filter(Boolean);
    let idx = -1;
    let matched = '';
    for(const k of list){
      idx = lower.indexOf(k);
      if(idx >= 0){ matched = source.slice(idx, idx + k.length); break; }
    }
    if(idx < 0) return source.length > radius * 2 ?source.slice(0, radius * 2).trim() + '…' : source;
    const start = Math.max(0, idx - radius);
    const end = Math.min(source.length, idx + matched.length + radius);
    let snippet = source.slice(start, end).trim();
    if(start > 0) snippet = '…' + snippet;
    if(end < source.length) snippet = snippet + '…';
    return snippet;
  }

  function pushIndivDayControlEvidence(dateKey, dateLabel, type, name, rawText, keywords){
    const store = ensureIndivDayControl(dateKey, dateLabel);
    const bucket = type === 'baby' ? store.baby : store.comm;
    const proof = shortenProofAroundKeyword(rawText, keywords);
    const normName = String(name || '').trim();
    const sig = `${normName}__${proof}`;
    if(bucket.some(x => x.sig === sig)) return;
    bucket.push({ sig, name: normName, proof });
  }

  function renderIndivDayControlSection(title, items, type){
    if(!items.length){
      return `<div class="indiv-control-section"><div class="indiv-control-section-title">${escapeHtml(title)}</div><div class="indiv-control-empty">Aucune détection.</div></div>`;
    }
    const body = items.map(item => `
      <div class="indiv-control-entry">
        <div class="indiv-control-name">${escapeHtml(item.name)}</div>
        <div class="indiv-control-proof">${highlightControlProof(item.proof, type)}</div>
      </div>
    `).join('');
    return `<div class="indiv-control-section"><div class="indiv-control-section-title">${escapeHtml(title)} (${items.length})</div>${body}</div>`;
  }

  
  function openIndivDayControl(dateKey){
    const panel = document.querySelector(`.indiv-day-panel[data-day-key="${dateKey}"]`);
    const body = panel?.querySelector('.indiv-day-panel-body');
    const data = INDIV_DAY_CONTROL[dateKey];
    if(!panel || !body) return;

    body.innerHTML = data ? [
      renderIndivDayControlSection('LIT BEBE', data.baby || [], 'baby'),
      renderIndivDayControlSection('COMMUNIQUANTE', data.comm || [], 'comm')
    ].join('') : '<div class="indiv-control-empty">Aucune donnee.</div>';

    const isOpen = panel.classList.contains('is-open');
    panel.classList.toggle('is-open', !isOpen);

    const btn = document.querySelector(`.day-control-btn[data-day-key="${dateKey}"]`);
    if(btn) btn.textContent = panel.classList.contains('is-open') ?'−' : '+';
  }

  function closeIndivDayControl(dateKey){
    if(dateKey){
      const panel = document.querySelector(`.indiv-day-panel[data-day-key="${dateKey}"]`);
      const btn = document.querySelector(`.day-control-btn[data-day-key="${dateKey}"]`);
      if(panel) panel.classList.remove('is-open');
      if(btn) btn.textContent = '+';
      return;
    }
    document.querySelectorAll('.indiv-day-panel.is-open').forEach(panel => panel.classList.remove('is-open'));
    document.querySelectorAll('.day-control-btn').forEach(btn => { btn.textContent = '+'; });
  }

  function getReservationControlMemory(){
    if (window.__AAR_RESERVATION_CONTROL?.items) return window.__AAR_RESERVATION_CONTROL;
    try {
      const payload = JSON.parse(localStorage.getItem(LS_RESERVATION_CONTROL) || 'null');
      return payload && Array.isArray(payload.items) ? payload : { items: [], count: 0 };
    } catch {
      return { items: [], count: 0 };
    }
  }

  function cleanBoostText(value){
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function priorityBoostRank(value){
    const v = String(value || '').toLowerCase();
    if (v === 'high') return 0;
    if (v === 'medium') return 1;
    return 2;
  }

  function getLunaConfirmationMapsForDate(dateKey){
    const payload = getReservationControlMemory();
    const baby = new Map();
    const comm = new Map();
    (payload.items || [])
      .filter(item => String(item.arrivalDate || '') === String(dateKey || ''))
      .forEach(item => {
        const name = formatNameVCC(item.guestName || '');
        if (!name) return;
        const key = stripAccentsLower(name);
        (Array.isArray(item.aiItems) ? item.aiItems : []).forEach(ai => {
          const status = String(ai.comparisonStatus || '').toLowerCase();
          if (status !== 'confirmed') return;
          const controlType = stripAccentsLower(ai.controlType || ai.control || ai.type || '');
          const text = stripAccentsLower([
            ai.result,
            ai.reservationControl,
            ai.quote,
            ai.kind,
            controlType
          ].filter(Boolean).join(' '));
          if (controlType === 'baby_bed') baby.set(key, true);
          if (controlType === 'communicating_room') {
            comm.set(key, true);
          }
        });
      });
    return { baby, comm };
  }

  function getIndivBoostRowsForDate(dateKey){
    const payload = getReservationControlMemory();
    return (payload.items || [])
      .filter(item => String(item.arrivalDate || '') === String(dateKey || ''))
      .flatMap(item => (Array.isArray(item.aiItems) ? item.aiItems : []).map(ai => {
        const quote = cleanBoostText(ai.quote || ai.sourceComment || ai.evidence || '');
        const result = cleanBoostText(ai.result || ai.summary || ai.recommendedAction || ai.intelligentAnalysis || '');
        return {
          guestName: item.guestName || 'Client',
          room: [item.roomType || '', item.roomNumber ?`Ch. ${item.roomNumber}` : ''].filter(Boolean).join(' · '),
          quote,
          result,
          priority: ai.priority || 'medium'
        };
      }))
      .filter(row => row.quote || row.result)
      .sort((a, b) => priorityBoostRank(a.priority) - priorityBoostRank(b.priority) || a.guestName.localeCompare(b.guestName, 'fr'));
  }

  function renderIndivBoostColumn(dateKey){
    const rows = getIndivBoostRowsForDate(dateKey);
    if (!rows.length) {
      return `
        <div class="indiv-boost-day">
          <div class="indiv-boost-day-title">BOOST</div>
          <div class="indiv-boost-empty">Aucune information utile inscrite pour cette journée.</div>
        </div>
      `;
    }
    return `
      <div class="indiv-boost-day">
        <div class="indiv-boost-day-title">BOOST - ${rows.length} info${rows.length > 1 ?'s' : ''} utile${rows.length > 1 ?'s' : ''}</div>
        <div class="indiv-boost-list">
          ${rows.map(row => `
            <div class="indiv-boost-item">
              <div class="indiv-boost-item-head">
                <strong>${escapeHtml(row.guestName)}</strong>
                ${row.room ? `<span>${escapeHtml(row.room)}</span>` : ''}
              </div>
              ${row.quote ?`<p>"${escapeHtml(row.quote).slice(0, 180)}"</p>` : ''}
              ${row.result ? `<small>${escapeHtml(row.result).slice(0, 220)}</small>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function getStoredReservationControlPayload(){
    if (window.__AAR_RESERVATION_CONTROL?.items) return window.__AAR_RESERVATION_CONTROL;
    const payload = safeJsonParse(localStorage.getItem(LS_RESERVATION_CONTROL) || 'null', null);
    if (payload && Array.isArray(payload.items)) {
      window.__AAR_RESERVATION_CONTROL = payload;
      return payload;
    }
    return null;
  }

  function getStoredGroupRows(){
    if (Array.isArray(window.GROUPS_SOURCE) && window.GROUPS_SOURCE.length) return window.GROUPS_SOURCE;
    const rows = safeJsonParse(localStorage.getItem(LS_GROUPS_COMPACT) || '[]', []);
    if (Array.isArray(rows) && rows.length) {
      if (rows.some(row => row && ('__text' in row || '__first' in row))) {
        localStorage.removeItem(LS_GROUPS_COMPACT);
        window.GROUPS_SOURCE = [];
        return [];
      }
      window.GROUPS_SOURCE = rows;
      return rows;
    }
    return [];
  }

  function getGroupCommentMemoryWindow(){
    const start = getDashboardActiveDateObj();
    const end = addDaysUtc(start, 30);
    return {
      startKey: toIsoDateUtc(start),
      endKey: toIsoDateUtc(end)
    };
  }

  function compactGroupRowsForStorage(rows){
    const windowInfo = getGroupCommentMemoryWindow();
    const truncate = (value, max = 600) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      return text.length > max ?text.slice(0, max).trim() + '…' : text;
    };
    const hasTrueTwin = (row) => /\bvrai(?:e)?\s*twin\b/i.test([
      pick(row, ['Message','MESSAGE','message']),
      pick(row, ['message_html','MESSAGE_HTML']),
      row?.TRUE_TWIN,
      row?.trueTwin
    ].filter(Boolean).join(' '));
    return (Array.isArray(rows) ? rows : [])
      .filter(row => String(pick(row, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim())
      .map((row, idx) => {
        const dateObj = parseFolsDateCell(pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || '');
        const key = dateObj ? toIsoDateUtc(dateObj) : '';
        const keepComments = !!key && key >= windowInfo.startKey && key <= windowInfo.endKey;
        return {
          GUES_ID: String(pick(row, ['GUES_ID','NUM_RESA','RESERVATION','ID']) || `group_${idx + 1}`),
          GUES_GROUPNAME: String(pick(row, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim(),
          PSER_DATE: String(pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''),
          PSER_DATFIN: String(pick(row, ['PSER_DATFIN','Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || ''),
          ROOM_TYPE: String(pick(row, ['ROOM_TYPE','ROOMTYPE','TYPE_CHB','TYPE CHB','ROOM']) || ''),
          NB_OCC_AD: String(pick(row, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0'),
          NB_OCC_CH: String(pick(row, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0'),
          NB_RESA: String(pick(row, ['NB_RESA','NB RESA','NBR_RESA','NB_ROOMS','ROOMS']) || '1'),
          TRUE_TWIN: hasTrueTwin(row) ? '1' : '',
          Message: keepComments ? truncate(pick(row, ['Message','MESSAGE','message']), 600) : '',
          message_html: keepComments ? truncate(pick(row, ['message_html','MESSAGE_HTML']), 600) : ''
        };
      });
  }

  function persistCompactGroupRows(rows){
    const compact = compactGroupRowsForStorage(rows);
    window.GROUPS_SOURCE = compact;
    invalidateHotelMemoryRowsCache();
    try {
      localStorage.setItem(LS_GROUPS_COMPACT, JSON.stringify(compact));
    } catch (err) {
      console.warn('groups compact cache skipped:', err);
    }
    return compact;
  }

  let HOTEL_MEMORY_ROWS_CACHE = null;
  function invalidateHotelMemoryRowsCache(){
    HOTEL_MEMORY_ROWS_CACHE = null;
  }
  window.__AAR_INVALIDATE_HOTEL_MEMORY_ROWS = invalidateHotelMemoryRowsCache;

  function getHotelMemoryRows(){
    const liveRows = (Array.isArray(window.__AAR_LAST_FOLS_ROWS) && window.__AAR_LAST_FOLS_ROWS.length)
      ? window.__AAR_LAST_FOLS_ROWS
      : (Array.isArray(LAST_FOLS_ROWS) && LAST_FOLS_ROWS.length)
        ? LAST_FOLS_ROWS
        : [];
    if (liveRows.length) return liveRows;
    return [];
  }

  function refreshIndivFusedView(){
    const out = byId('output-indiv');
    const rows = getHotelMemoryRows();
    if (rows.length) renderArrivalsFOLS_fromRows(rows);
    else if (out) out.innerHTML = '<p class="muted">Aucun import FOLS chargé pour l’instant.</p>';
  }
  window.__AAR_REFRESH_INDIV_FUSED_VIEW = refreshIndivFusedView;

  /* ---------- RENDER ARRIVALS ---------- */
  function renderArrivalsFOLS_fromRows(rows){
    const out = byId('output-indiv'); if(!out) return;
    out.innerHTML = '';
    resetIndivDayControlStore();

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

        if (gname) return;

        const nameRaw = String(
          pick(r, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) ||
          splitCSV(r.__first || '', ';')[0] || ''
        );

        const name = recoucheDisplayLastName(nameRaw);
        if(!name) return;

        const adu = parseInt(
          pick(r, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0'
        ) || 0;
        const enf = parseInt(
          pick(r, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0'
        ) || 0;

        const keywordHaystack = cleanKeywordHaystack(r.__text || '');
        let comment = keywordHaystack
          .replace(/["*()]/g,' ')
          .replace(/s\/intern[:\s-]*/g, ' ')
          .replace(/[^\p{L}\p{N}\s\+]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();

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
            name_counts: {},
            '2_sofa': [],
            '1_sofa': [],
            'lit_bebe': [],
            'lit_bebe_plus1_sofa': [],
            sofa_type_counts: {},
            'comm': [],
            'dayuse': [],
            'early': []
          };
        }

        grouped[dateKey].total_resa += 1;
        grouped[dateKey].name_counts[name] = (grouped[dateKey].name_counts[name] || 0) + 1;

        const sofaKey = `${adu}A+${enf}E`;
        const sofa = (RULES.sofa && RULES.sofa[sofaKey]) || '0';
        if (sofa === '1') grouped[dateKey]['1_sofa'].push(name);
        if (sofa === '2') grouped[dateKey]['2_sofa'].push(name);
        if (sofa === '1' || sofa === '2') {
          const sofaRoomType = getSofaRoomTypeDisplay(
            getInventoryCategoryFromRow(r) ||
            pick(r, ['ROOM_TYPE','ROOMTYPE','TYPE_CHB','TYPE CHB','ROOM CAT','ROOM CATEGORY','ROOM_CLASS','ROOMCLASS','CATEGORY','CATEGORIE','CAT','CAT_CHB','CAT CHB','CLASS','CHB_TYPE','CHB TYPE','TYPO_CHB','TYPO CHB','TYPCOD']) || ''
          );
          if (sofaRoomType) {
            grouped[dateKey].sofa_type_counts[sofaRoomType] = Number(grouped[dateKey].sofa_type_counts[sofaRoomType] || 0) + 1;
          }
        }

        const babyFlag = Number(r.__bf || 0) > 0 || hasBabyRequest(r.__text || '');
        if (babyFlag) {
          grouped[dateKey]['lit_bebe'].push(name);
          pushIndivDayControlEvidence(dateKey, dateLabel, 'baby', name, r.__text || '', RULES.keywords?.baby || []);
          if ((adu + enf) === 4) grouped[dateKey]['lit_bebe_plus1_sofa'].push(name);
        }
        const commFlag = Number(r.__cf || 0) > 0 || (rx.comm && rx.comm.test(keywordHaystack));
        if (commFlag) {
          grouped[dateKey]['comm'].push(name);
          pushIndivDayControlEvidence(dateKey, dateLabel, 'comm', name, r.__text || '', RULES.keywords?.comm || []);
        }
        const dayuseFlag = Number(r.__df || 0) > 0 || (rx.dayuse && rx.dayuse.test(comment));
        const earlyFlag = Number(r.__ef || 0) > 0 || (rx.early && rx.early.test(comment));
        if (dayuseFlag) grouped[dateKey]['dayuse'].push(name);
        if (earlyFlag) grouped[dateKey]['early'].push(name);
      }catch(err){
        console.warn('Ligne ignorée (parse error):', err);
      }
    });

    const keys = Object.keys(grouped).sort();
    if (!keys.length){
      out.innerHTML = '<p class="muted">Aucune donnée valide détectée.</p>';
      updateSofaKpiHover({ counts: {} });
      return;
    }

    window.__AAR_INDIVIDUAL_FIRST_DATE_KEY = keys[0];

    const todayKey = toIsoDateUtc(getDashboardActiveDateObj());
    const trueRecoucheByDate = buildTrueRecoucheByDate(rows);
    for(let i=0;i<keys.length;i++){
      const k=keys[i];
      grouped[k].recouche = trueRecoucheByDate.get(k) || [];
    }

    const todayGroup = grouped[todayKey] || null;
    const departureCountToday = rows.reduce((sum, r) => {
      const gname = String(pick(r, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim();
      if (gname) return sum;
      const departure = parseFolsDateCell(
        pick(r, ['Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || ''
      );
      return sum + ((departure && toIsoDateUtc(departure) === todayKey) ? 1 : 0);
    }, 0);

 const babyCountToday = todayGroup ? (todayGroup['lit_bebe'] || []).length : 0;
const sofaCountToday = todayGroup
  ? ((todayGroup['1_sofa'] || []).length + (todayGroup['2_sofa'] || []).length)
  : 0;

    const babyEntriesToday = todayGroup
      ? (todayGroup['lit_bebe'] || []).map(name => ({
          name: formatNameVCC(name),
          meta: (todayGroup['lit_bebe_plus1_sofa'] || []).includes(name) ?'Lit bébé + sofa' : 'Lit bébé'
        }))
      : [];

    const sofaSummaryToday = {
      counts: todayGroup && todayGroup.sofa_type_counts ? { ...todayGroup.sofa_type_counts } : {}
    };

    const sofaEntriesToday = todayGroup
      ? [
          ...(todayGroup['1_sofa'] || []).map(name => ({ name: formatNameVCC(name), meta: '1 sofa' })),
          ...(todayGroup['2_sofa'] || []).map(name => ({ name: formatNameVCC(name), meta: '2 sofas' }))
        ]
      : [];

    const stayoverEntriesToday = ((trueRecoucheByDate.get(todayKey) || [])).map(name => ({
      name: formatNameVCC(name),
      meta: 'Recouche'
    }));

    const arrivalEntriesToday = getKpiArrivalDetailEntries(rows, todayKey);
    const departureEntriesToday = getKpiDepartureDetailEntries(rows, todayKey);

    window.__AAR_HOME_KPI_DETAILS = {
      arrivals: arrivalEntriesToday,
      departures: departureEntriesToday,
      babies: babyEntriesToday,
      sofas: sofaEntriesToday,
      sofas_summary: sofaSummaryToday,
      stayovers: stayoverEntriesToday
    };
    updateSofaKpiHover(null);

    renderHomeKpiMetrics({
      arrivals: todayGroup ? Number(todayGroup.total_resa || 0) : 0,
      departures: departureCountToday,
      stayovers: (trueRecoucheByDate.get(todayKey) || []).length,
      babies: babyCountToday,
      sofas: sofaCountToday,
      vcc: collectHomeVccEntries(rows).length,
      preferences: (window.__AAR_HOME_KPI_METRICS && Number(window.__AAR_HOME_KPI_METRICS.preferences)) || 0
    });
    renderHomeNextDays(rows);
    refreshTodayPreferencesKpi({ forceOverviewRefresh: false });
    refreshInventoryPressureCard(rows);

    const displayLimit = window.__AAR_INDIV_SHOW_ALL_DAYS ? keys.length : 30;
    const visibleKeys = keys.slice(0, displayLimit);

    visibleKeys.forEach(k=>{
      const data=grouped[k];

      function duplicateSameNameLine(mapObj){
        return Object.entries(mapObj || {})
          .filter(([, c]) => Number(c) > 1)
          .sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0]), 'fr'))
          .map(([name, c]) => `${c}# ${formatNameVCC(name)}`);
      }

      function countCategoryMap(list){
        const counts = new Map();
        for (const n of (list || [])) {
          const key = String(n || '').trim();
          if (!key) continue;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        return counts;
      }

      function formatCategoryMap(counts){
        return Array.from(counts.entries())
          .sort((a,b)=>String(a[0]).localeCompare(String(b[0]), 'fr'))
          .map(([name, c]) => c > 1 ? `${formatNameVCC(name)} (${c})` : formatNameVCC(name));
      }

      function formatCommunicatingList(list, confirmations = new Map()){
        return (Array.isArray(list) ? list : [])
          .map(x => {
            const name = formatNameVCC(String(x || '').trim());
            return confirmations.has(stripAccentsLower(name)) ? `${name} ✓` : name;
          })
          .filter(Boolean)
          .join(' / ');
      }

      function renderLunaConfirmedText(text){
        return escapeHtml(text).replace(/✓/g, '<span class="luna-confirm-badge">&#10003;</span>');
      }

      const sofa1Counts = countCategoryMap(data['1_sofa']);
      const sofa2Counts = countCategoryMap(data['2_sofa']);
      const babyCounts = countCategoryMap(data['lit_bebe']);
      const babyPlusOneSet = new Set((data['lit_bebe_plus1_sofa'] || []).map(x => String(x || '').trim()).filter(Boolean));
      const lunaConfirmations = getLunaConfirmationMapsForDate(k);

      babyPlusOneSet.forEach(name => {
        sofa1Counts.delete(name);
        sofa2Counts.delete(name);
      });

      const view = {
        ...data,
        duplicate_same_name: duplicateSameNameLine(data.name_counts),
        '1_sofa': formatCategoryMap(sofa1Counts),
        '2_sofa': formatCategoryMap(sofa2Counts),
        'lit_bebe': Array.from(babyCounts.entries())
          .sort((a,b)=>String(a[0]).localeCompare(String(b[0]), 'fr'))
          .map(([name, c]) => {
            const displayName = formatNameVCC(name);
            const confirmed = lunaConfirmations.baby.has(stripAccentsLower(displayName));
            let label = c > 1 ? `${displayName}${confirmed ? ' ✓' : ''} (${c})` : `${displayName}${confirmed ? ' ✓' : ''}`;
            if (babyPlusOneSet.has(name)) label += ' (+1 SOFA)';
            return label;
          })
      };

      const blk=document.createElement('div');
      blk.className='day-block indiv-fused-day';

      const headWrap=document.createElement('div');
      headWrap.className='day-header-wrap';

      const h=document.createElement('div');
      h.className='day-header';
      const n = data.total_resa || 0;
      h.textContent = `${data.label} (${n} arrivee${n>1?'s':''})`;

      const dayBtn=document.createElement('button');
      dayBtn.type='button';
      dayBtn.className='day-control-btn';
      dayBtn.dataset.dayKey = k;
      dayBtn.textContent='+';
      dayBtn.title='Contrôle du jour';
      dayBtn.addEventListener('click', ()=> openIndivDayControl(k));

      headWrap.append(h, dayBtn);

      const ul=document.createElement('div');

      if (data.recouche?.length){
        const p=document.createElement('div');
        p.textContent=`RECOUCHE : ${data.recouche.join(', ')}`;
        ul.appendChild(p);
      }

      ['1_sofa','2_sofa','lit_bebe','comm','dayuse','early'].forEach(cat=>{
        const arr = (cat === '1_sofa' || cat === '2_sofa' || cat === 'lit_bebe') ? view[cat] : data[cat];
        if (arr && arr.length){
          const p=document.createElement('div');
          const label=
            cat==='lit_bebe' ?'LIT BEBE' :
            cat==='comm'     ?'COMMUNIQUANTE' :
            cat==='dayuse'   ?'DAY USE' :
            cat==='early'    ?'ARRIVEE PRIORITAIRE' :
            cat==='2_sofa'   ?'2 SOFA' : '1 SOFA';
          if (cat === 'lit_bebe') {
            p.innerHTML = `${escapeHtml(label)} : ${renderLunaConfirmedText(arr.join(', '))}`;
          } else if (cat === 'comm') {
            p.innerHTML = `${escapeHtml(label)} : ${renderLunaConfirmedText(formatCommunicatingList(arr, lunaConfirmations.comm))}`;
          } else {
            p.textContent = `${label} : ${arr.join(', ')}`;
          }
          ul.appendChild(p);
        }
      });

      if (view.duplicate_same_name?.length){
        const p=document.createElement('div');
        p.textContent=`👥 ${view.duplicate_same_name.join(', ')}`;
        ul.appendChild(p);
      }

      const panel=document.createElement('div');
      panel.className='indiv-day-panel';
      panel.dataset.dayKey = k;
      panel.innerHTML = '<div class="indiv-day-panel-body"></div>';

      const leftCol=document.createElement('div');
      leftCol.className='indiv-oris-col';
      leftCol.append(headWrap, ul, panel);

      const rightCol=document.createElement('div');
      rightCol.className='indiv-boost-col';
      rightCol.innerHTML = renderIndivBoostColumn(k);

      blk.append(leftCol, rightCol);
      out.appendChild(blk);
    });

    if (!window.__AAR_INDIV_SHOW_ALL_DAYS && keys.length > displayLimit) {
      const moreWrap = document.createElement('div');
      moreWrap.className = 'indiv-show-more-wrap';
      const moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'indiv-show-more-btn';
      moreBtn.textContent = `Afficher ${keys.length - displayLimit} jours supplementaires`;
      moreBtn.addEventListener('click', () => {
        window.__AAR_INDIV_SHOW_ALL_DAYS = true;
        refreshIndivFusedView();
      });
      moreWrap.appendChild(moreBtn);
      out.appendChild(moreWrap);
    } else if (window.__AAR_INDIV_SHOW_ALL_DAYS && keys.length > 30) {
      const lessWrap = document.createElement('div');
      lessWrap.className = 'indiv-show-more-wrap';
      const lessBtn = document.createElement('button');
      lessBtn.type = 'button';
      lessBtn.className = 'indiv-show-more-btn';
      lessBtn.textContent = 'Replier a 30 jours';
      lessBtn.addEventListener('click', () => {
        window.__AAR_INDIV_SHOW_ALL_DAYS = false;
        refreshIndivFusedView();
      });
      lessWrap.appendChild(lessBtn);
      out.appendChild(lessWrap);
    }
  }

  /* =========================================================
     VCC (depuis Arrivals FOLS)
     ========================================================= */
  function vccHasArrhesOrPrepay(s){
    const t = stripAccentsLower(String(s||''));
    return t.includes('arrhes') || t.includes('prepay');
  }
  function vccNormalizeNameToken(name){
    return stripAccentsLower(String(name || ''))
      .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function vccExtractName(row){
    const nameRaw = String(
      pick(row, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME','GUES_FULLNAME','GUES FULLNAME']) ||
      splitCSV(row.__first || '', ';')[0] || ''
    ).trim();

    if (!nameRaw) return '';

    const parts = nameRaw
      .split(/\s+-\s+/)
      .map(x => x.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    if (!parts.length) return nameRaw.replace(/\s+/g,' ').trim();

    const unique = [];
    const seen = new Set();
    parts.forEach(part => {
      const sig = vccNormalizeNameToken(part);
      if (!sig || seen.has(sig)) return;
      seen.add(sig);
      unique.push(part);
    });

    return (unique[0] || parts[0] || nameRaw).replace(/\s+/g,' ').trim();
  }
  function vccExtractDate(row){
    const d = parseFolsDateCell(
      pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
    );
    if (!d || isNaN(d)) return '';
    const dd = String(d.getUTCDate()).padStart(2,'0');
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    return `${dd}/${mm}`;
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

    const rows = getHotelMemoryRows();
    if(!rows.length){
      out.innerHTML = '<p class="muted">Aucun export Arrivals FOLS chargé. Importe ton CSV dans l’onglet Home.</p>';
      status && (status.textContent = '–');
      if(copyBtn) copyBtn.onclick = ()=>toast('Aucune liste à copier');
      return;
    }

    const entries = [];
    const seen = new Set();
    for(const r of rows){
      const { rate, guaranty } = vccGetRateAndGuaranty(r);
      if(!rate || !VCC_TARGET_RATES.has(String(rate).toUpperCase())) continue;
      if(vccHasArrhesOrPrepay(guaranty)) continue;

      const name = vccExtractName(r);
      if(!name) continue;
      const date = vccExtractDate(r);
      const sig = `${vccNormalizeNameToken(name)}__${date}`;
      if (seen.has(sig)) continue;
      seen.add(sig);

      const sortDate = date
        ? (()=>{
            const [dd, mm] = date.split('/');
            return Number(`${mm}${dd}`);
          })()
        : 9999;

      entries.push({
        name: formatVccLastNameFirstName(name),
        date,
        sortDate
      });
    }

    entries.sort((a,b)=>{
      if (a.sortDate !== b.sortDate) return a.sortDate - b.sortDate;
      return String(a.name || '').localeCompare(String(b.name || ''), 'fr');
    });

    const lines = entries.map(x => x.date ?`${x.date} — ${x.name}` : x.name);
    status && (status.textContent = `${entries.length} client(s)`);

    if(!entries.length){
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
    ta.value = lines.join('\n');
    container.appendChild(ta);

    out.innerHTML='';
    out.appendChild(container);

    if(copyBtn){
      copyBtn.onclick = ()=>{
        navigator.clipboard.writeText(lines.join('\n'));
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
  const sourcesStrip    = byId('sources-strip');
  const dropZoneSources = byId('drop-zone-sources');

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

  const fileInputSources = document.createElement('input');
  fileInputSources.type = 'file';
  fileInputSources.accept = '.csv,.txt,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  fileInputSources.multiple = false;

  function routeHomeSourceFile(file){
    if (!file) return;
    const name = String(file.name || '').toLowerCase();
    const type = String(file.type || '').toLowerCase();

    if (name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('spreadsheet') || type.includes('excel')) {
      handleAcdcFile(file);
      return;
    }

    if (name.endsWith('.csv') || name.endsWith('.txt') || type.includes('csv') || type.startsWith('text/')) {
      handleIndivFile(file);
      return;
    }

    toast('?? Format non reconnu. D?pose un FOLS CSV ou un ACDC XLSX.');
  }

  function bindHomeSourcesDropzone(){
    if (!sourcesStrip) return;

    const openPicker = () => fileInputSources.click();
    const setActive = (isActive) => sourcesStrip.classList.toggle('is-drag-active', !!isActive);

    sourcesStrip.addEventListener('click', (e) => {
      const isButton = e.target?.closest?.('#drop-zone-sources');
      if (isButton) return;
      openPicker();
    });

    sourcesStrip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPicker();
      }
    });

    dropZoneSources?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPicker();
    });

    ['dragenter', 'dragover'].forEach(evt => {
      sourcesStrip.addEventListener(evt, (e) => {
        e.preventDefault();
        setActive(true);
      });
    });

    ['dragleave', 'dragend'].forEach(evt => {
      sourcesStrip.addEventListener(evt, () => setActive(false));
    });

    sourcesStrip.addEventListener('drop', (e) => {
      e.preventDefault();
      setActive(false);
      const file = (e.dataTransfer?.files || [])[0];
      routeHomeSourceFile(file);
    });

    fileInputSources.addEventListener('change', (e) => {
      const file = (e.target.files || [])[0];
      routeHomeSourceFile(file);
      fileInputSources.value = '';
    });
  }

  bindHomeSourcesDropzone();

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
      const text = String(e.target?.result || '');
      const nowTs = new Date().toISOString();

      try {
        // 1) INDIV + VCC
        const result = processCsvText(text) || {};
        const normalizedText = String(result.csvText || text || '');
        const rowsCount = Array.isArray(result.rows) ? result.rows.length : 0;

        localStorage.setItem(LS_IMPORT_DATE_INDIV, nowTs);
        try {
          localStorage.setItem(LS_ARRIVALS_CSV, normalizedText);
        } catch (storageErr) {
          console.warn('FOLS CSV cache skipped:', storageErr);
          localStorage.removeItem(LS_ARRIVALS_CSV);
        }
        renderImportDates();
        STATE.arrivals_csv = normalizedText;

        // 2) GROUPES
        processGroupsFromRows(result.rows);
        STATE.groups_csv = normalizedText;

        // 3) GRAPH (local only)
        processHomeGraphFromRaw(normalizedText, result.rows);

        // 4) REMOTE SNAPSHOTS (only dedicated sources)
        try {
          await ghSaveSnapshotPath(window.GH_PATHS.portfolio, {
            version: 1,
            type: "portfolio",
            updated_at: nowTs,
            source: "portfolio_combined",
            hotel_id: "novotel_collegien",
            payload: {
              portfolio_csv: ''
            },
            meta: {
              import_label: "Portefeuille FOLS",
              imported_by: "manual",
              row_count_estimate: rowsCount,
              storage_policy: "raw_csv_not_persisted_comments_limited_to_reservation_control_window"
            }
          }, "indiv import");
        } catch (err) {
          console.warn("save indiv failed:", err);
        }

        toast(`📂 Portefeuille chargé → ${rowsCount} lignes`);
      } catch (err) {
        console.error('FOLS import failed:', err);
        toast(`?? Import FOLS impossible${err?.message ?' : ' + err.message : ''}`);
      }
    };
    reader.onerror = () => {
      toast('?? Lecture du fichier FOLS impossible');
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleGroupFile(file) {
    console.warn('handleGroupFile appelé alors que le mode portefeuille unique est actif.');
  }

  function formatShortFrDayLabel(dateObj){
    if (!(dateObj instanceof Date) || isNaN(dateObj)) return '';
    const days = ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'];
    const dd = String(dateObj.getUTCDate()).padStart(2,'0');
    const mm = String(dateObj.getUTCMonth()+1).padStart(2,'0');
    return `${days[dateObj.getUTCDay()]} ${dd}/${mm}`;
  }

  function normalizeGroupLabel(raw){
    return stripAccentsLower(String(raw || ''))
      .replace(/[^a-z0-9\s-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function buildHomeNextDays(rows){
    const todayUtc = getDashboardActiveDateObj();
    const endUtc = addDaysUtc(todayUtc, 10);
    const map = new Map();
    const groupAgg = new Map();

    function ensureDay(dateObj){
      const key = toIsoDateUtc(dateObj);
      if(!map.has(key)){
        map.set(key, {
          key,
          label: formatShortFrDayLabel(dateObj),
          indivArrivals: 0,
          departures: 0,
          groupCount: 0,
          groupRooms: 0,
          sofaCount: 0,
          sofaTypeCounts: {},
          totalRooms: 0,
          _groups: new Set()
        });
      }
      return map.get(key);
    }

    // Toujours afficher une fenêtre complète commençant aujourd'hui,
    // y compris lorsque certaines journées ne contiennent aucun mouvement.
    for(let offset = 0; offset < 10; offset++){
      ensureDay(addDaysUtc(todayUtc, offset));
    }

    for(const row of (Array.isArray(rows) ? rows : [])){
      const arrival = parseFolsDateCell(
        pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
      );
      const departure = parseFolsDateCell(
        pick(row, ['Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']) || ''
      );
      const gnameRaw = String(pick(row, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim();
      const gname = normalizeGroupLabel(gnameRaw);

      if(gname){
        const nbResa = parseInt(
          pick(row, ['NB_RESA','NB RESA','NBR_RESA','NB_ROOMS','ROOMS']) || '1',
          10
        ) || 1;

        if(!groupAgg.has(gname)){
          groupAgg.set(gname, {
            arrival: arrival || null,
            rooms: 0
          });
        }

        const grp = groupAgg.get(gname);
        grp.rooms += nbResa;

        if(arrival){
          if(!grp.arrival || arrival < grp.arrival) grp.arrival = arrival;
        }
      } else if(arrival && arrival >= todayUtc && arrival < endUtc){
        const day = ensureDay(arrival);
        day.indivArrivals += 1;

        const adu = parseInt(
          pick(row, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0',
          10
        ) || 0;
        const enf = parseInt(
          pick(row, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0',
          10
        ) || 0;
        const sofaKey = `${adu}A+${enf}E`;
        const sofa = (RULES.sofa && RULES.sofa[sofaKey]) || '0';

        if (sofa === '1' || sofa === '2') {
          day.sofaCount += 1;
          const roomType = getSofaRoomTypeDisplay(getInventoryCategoryFromRow(row) || pick(row, ['ROOM_TYPE','ROOMTYPE','ROOM']) || '');
          if (roomType) {
            day.sofaTypeCounts[roomType] = Number(day.sofaTypeCounts[roomType] || 0) + 1;
          }
        }
      }

      if(departure && departure >= todayUtc && departure < endUtc){
        const day = ensureDay(departure);
        day.departures += 1;
      }
    }

    for(const [gname, grp] of groupAgg.entries()){
      if(!grp.arrival || !(grp.arrival >= todayUtc && grp.arrival < endUtc)) continue;
      const day = ensureDay(grp.arrival);
      day.groupRooms += grp.rooms;
      day._groups.add(gname);
    }

    return Array.from(map.values())
      .sort((a,b)=>a.key.localeCompare(b.key))
      .map(day => {
        day.totalRooms = day.indivArrivals + day.groupRooms;
        return {
          key: day.key,
          label: day.label,
          indivArrivals: day.indivArrivals,
          departures: day.departures,
          groupCount: day._groups.size,
          groupRooms: day.groupRooms,
          sofaCount: day.sofaCount,
          sofaTypeCounts: { ...(day.sofaTypeCounts || {}) },
          totalRooms: day.totalRooms
        };
      })
      .slice(0,10);
  }

  function renderHomeNextDays(rows){
    const host = byId('home-next-days');
    if(!host) return;
    const days = buildHomeNextDays(rows);
    host.innerHTML = '';

    if(!days.length){
      host.innerHTML = '<div class="home-next-days-empty">Aucune donnée à venir.</div>';
      return;
    }

    const table = document.createElement('div');
    table.className = 'home-next-days-table';

    const head = document.createElement('div');
    head.className = 'home-next-days-head';
    ['Date','Départs','Arrivées','Groupes','Total','Sofa'].forEach(label => {
      const cell = document.createElement('div');
      cell.textContent = label;
      head.appendChild(cell);
    });
    table.appendChild(head);

    days.forEach(day => {
      const row = document.createElement('div');
      row.className = 'home-next-days-row';

      const date = document.createElement('div');
      date.className = 'home-next-days-date';
      date.textContent = day.label;

      const arrivals = document.createElement('div');
      arrivals.className = 'home-next-days-cell';
      arrivals.innerHTML = `<span class="home-next-days-badge">${day.indivArrivals}</span>`;

      const departures = document.createElement('div');
      departures.className = 'home-next-days-cell';
      departures.innerHTML = `<span class="home-next-days-badge is-departures">${day.departures}</span>`;

      const groups = document.createElement('div');
      groups.className = 'home-next-days-cell';
      groups.innerHTML = `<span class="home-next-days-badge is-groups">${day.groupCount}</span><span class="home-next-days-group-sub">(${day.groupRooms})</span>`;

      const sofas = document.createElement('div');
      sofas.className = 'home-next-days-cell';
      const sofaWrap = document.createElement('span');
      sofaWrap.className = 'home-next-days-sofa-wrap';
      const sofaBadge = document.createElement('span');
      sofaBadge.className = 'home-next-days-badge is-sofas';
      sofaBadge.textContent = String(day.sofaCount || 0);
      sofaWrap.appendChild(sofaBadge);
      const sofaTooltip = document.createElement('span');
      sofaTooltip.className = 'home-next-days-sofa-tooltip';
      sofaTooltip.textContent = buildSofaTooltipText(day.sofaTypeCounts || {});
      sofaWrap.appendChild(sofaTooltip);
      if (day.sofaCount > 0) {
        sofaWrap.removeAttribute('title');
      }
      sofas.appendChild(sofaWrap);

      const total = document.createElement('div');
      total.className = 'home-next-days-cell';
      total.innerHTML = `<span class="home-next-days-badge is-total">${day.totalRooms}</span>`;

      row.append(date, departures, arrivals, groups, total, sofas);
      table.appendChild(row);
    });

    host.appendChild(table);
  }

  function getFirstImportArrivalDateKey(rows){
    const keys = (Array.isArray(rows) ? rows : [])
      .map(row => parseFolsDateCell(pick(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE'])))
      .filter(Boolean)
      .map(toIsoDateUtc)
      .filter(Boolean)
      .sort();
    return keys[0] || '';
  }

  function processCsvText(csvText, options = {}){
    const normalizedCsvText = String(csvText || '').replace(/^﻿/, '');
    const {header, blocks} = parseCsvHeaderAndBlocks(normalizedCsvText);
    const rows = buildRowsFromBlocks(header, blocks);
    const importBaseDateKey = getFirstImportArrivalDateKey(rows);
    if (importBaseDateKey) {
      window.__AAR_RESERVATION_CONTROL_BASE_DATE_KEY = importBaseDateKey;
      window.__AAR_INDIVIDUAL_FIRST_DATE_KEY = importBaseDateKey;
    }
    invalidateHotelMemoryRowsCache();
    LAST_FOLS_ROWS = rows;
    window.__AAR_LAST_FOLS_ROWS = rows;
    invalidateAssignmentWatchIndex();
    if (!options.skipReservationControl) {
      window.RESERVATION_CONTROL?.processRows?.(rows);
    }
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
    refreshInventoryPressureCard(rows);
    return { rows, csvText: normalizedCsvText };
  }

  /* =========================================================
     GITHUB STORAGE (via proxy Vercel)
     ========================================================= */
  function ghEnabled() {
    return !!(window.GH_OWNER && window.GH_REPO && window.GH_PATHS && window.GH_PATHS.portfolio && window.GH_PATHS.acdc);
  }

  async function ghGetContent() {
    throw new Error("Deprecated: use ghGetContentPath");
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
      console.error("? Erreur GitHub:", data);
      throw new Error("Erreur sauvegarde GitHub");
    }
    return data;
  }

  async function ghSaveSnapshot(obj, message) {
    // Deprecated: use ghSaveSnapshotPath with dedicated snapshot files.
    return null;
  }

  async function ghSaveState(message){
    // Deprecated: cross-PC sync is now limited to dedicated portfolio/acdc snapshots only.
    return null;
  }

  async function ghLoadAndHydrateState(){
    if (!ghEnabled()) return;

    const loaded = { portfolio:false, acdc:false };

    try {
      const metaP = await ghGetContentPath(window.GH_PATHS.portfolio);
      const pdata = safeJsonParse((metaP?.content || '').trim(), null);
      const portfolioCsv = '';
      if (String(portfolioCsv).trim()) {
        const ts = pdata.updated_at || pdata.ts || pdata.import_date || new Date().toISOString();
        STATE.arrivals_csv = String(portfolioCsv);
        localStorage.removeItem(LS_ARRIVALS_CSV);
        localStorage.setItem(LS_IMPORT_DATE_INDIV, ts);
        const result = processCsvText(STATE.arrivals_csv) || {};
        processGroupsFromRows(result.rows);
        processHomeGraphFromRaw(STATE.arrivals_csv, result.rows);
        renderImportDates();
        toast("Portefeuille restaure");
        loaded.portfolio = true;
      }
    } catch (err) {
      console.warn("Lecture GitHub portefeuille impossible:", err);
    }

    try {
      const metaA = await ghGetContentPath(window.GH_PATHS.acdc);
      const adata = safeJsonParse((metaA?.content || '').trim(), null);
      const alerts =
        Array.isArray(adata?.payload?.alerts) ? adata.payload.alerts :
        (Array.isArray(adata?.alerts) ? adata.alerts : []);
      const sofaCandidates =
        Array.isArray(adata?.payload?.sofa_candidates) ? adata.payload.sofa_candidates :
        (Array.isArray(adata?.sofa_candidates) ? adata.sofa_candidates :
        (Array.isArray(adata?.sofaCandidates) ? adata.sofaCandidates : []));
      if (alerts.length || sofaCandidates.length) {
        const ts = adata.updated_at || adata.ts || adata.import_date || new Date().toISOString();
        localStorage.setItem(LS_ACDC_ALERTS, JSON.stringify(alerts));
        localStorage.setItem(LS_ACDC_SOFA, JSON.stringify(sofaCandidates));
        localStorage.setItem(LS_IMPORT_DATE_ACDC, ts);
        renderImportDates();
        renderAcdcEvaluationAlerts(alerts);
        try {
          renderAcdcSofaAlerts(enrichAcdcSofaCandidates(sofaCandidates, getHotelMemoryRows()));
        } catch(_) {
          renderAcdcSofaAlerts(sofaCandidates);
        }
        const statusEl = byId('acdc-import-status');
        if (statusEl) {
          statusEl.textContent = `ACDC restaure - ${alerts.length} alerte(s) - ${sofaCandidates.length} sofa`;
        }
        toast("ACDC restaure");
        loaded.acdc = true;
      }
    } catch (err) {
      console.warn("Lecture GitHub ACDC impossible:", err);
    }

    return loaded;
  }

  async function updateGhStatus() {
    const el = document.getElementById("gh-date-text");
    if (!el || !ghEnabled()) return;

    try {
      const metas = [];
      for (const path of [window.GH_PATHS.portfolio, window.GH_PATHS.acdc]) {
        try {
          const meta = await ghGetContentPath(path);
          const data = safeJsonParse(meta?.content || '{}', {});
          const ts = data.updated_at || data.ts || data.import_date || data.updatedAt || null;
          if (ts) metas.push(ts);
        } catch (_) {}
      }
      if (!metas.length) {
        el.textContent = "Aucune donnée";
        el.style.color = "#c97a00";
        return;
      }
      const ts = metas.sort().slice(-1)[0];
      const local = new Date(ts).toLocaleString("fr-FR", { dateStyle:"medium", timeStyle:"short" });
      el.textContent = `Données distantes • ${local}`;
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
    renderImportDates();
    renderHomeKpiMetrics({ arrivals: 0, departures: 0, stayovers: 0, babies: 0, sofas: 0, vcc: 0, preferences: 0 });
    attachOverviewKpiObserver();
    refreshTodayPreferencesKpi({ forceOverviewRefresh: false });

    const legacyHomeStats = String(localStorage.getItem(LS_HOME_STATS_SOURCE) || '').trim();
    if (legacyHomeStats && !legacyHomeStats.startsWith('{')) {
      localStorage.removeItem(LS_HOME_STATS_SOURCE);
    }
    const localArrivalsCsv = localStorage.getItem(LS_ARRIVALS_CSV) || '';
    if (localArrivalsCsv.trim()) {
      setTimeout(() => {
        STATE.arrivals_csv = STATE.arrivals_csv || localArrivalsCsv;
        const result = processCsvText(localArrivalsCsv, { skipReservationControl: true }) || {};
        processGroupsFromRows(result.rows);
        processHomeGraphFromRaw(localArrivalsCsv, result.rows);
        toast("💾 Portefeuille restauré (local)");
      }, 500);
    }

    const localAcdcAlerts = safeJsonParse(localStorage.getItem(LS_ACDC_ALERTS) || 'null', []);
    const localAcdcSofa = safeJsonParse(localStorage.getItem(LS_ACDC_SOFA) || 'null', []);
    if ((Array.isArray(localAcdcAlerts) && localAcdcAlerts.length) || (Array.isArray(localAcdcSofa) && localAcdcSofa.length)) {
      const statusEl = byId('acdc-import-status');
      if (statusEl) {
        statusEl.textContent = `ACDC local • ${localAcdcAlerts.length} alerte(s) • ${localAcdcSofa.length} sofa`;
      }
    }

    try {
      if (false && ghEnabled()) {
        await ghLoadAndHydrateState();
        await updateGhStatus();
        refreshTodayPreferencesKpi({ forceOverviewRefresh: true });
      }
    } catch (err) {
      console.warn("?? Init interrompue:", err);
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
  window.AAR.getDashboardActiveDateObj = getDashboardActiveDateObj;
  window.openIndivDayControl = openIndivDayControl;
  window.closeIndivDayControl = closeIndivDayControl;


  /* =========================================================
     HOME — CALENDRIER VACANCES SCOLAIRES (ZONES A / B / C)
     Sources officielles : education.gouv.fr + service-public.fr
     ========================================================= */
  const VAC_ZONE_META = {
    A: { label: 'Zone A', subtitle: 'Besançon / Bordeaux / Clermont-Ferrand / Dijon / Grenoble / Limoges / Lyon / Poitiers' },
    B: { label: 'Zone B', subtitle: 'Aix-Marseille / Amiens / Caen / Lille / Nancy-Metz / Nantes / Nice / Orléans-Tours / Reims / Rennes / Rouen / Strasbourg' },
    C: { label: 'Zone C', subtitle: 'Paris / Créteil / Montpellier / Toulouse / Versailles' }
  };

  const SCHOOL_HOLIDAYS_BY_ZONE = {
    A: [
      { label: 'Toussaint 2025', start: '2025-10-18', end: '2025-11-02' },
      { label: 'Noël 2025',      start: '2025-12-20', end: '2026-01-04' },
      { label: 'Hiver 2026',     start: '2026-02-07', end: '2026-02-22' },
      { label: 'Printemps 2026', start: '2026-04-04', end: '2026-04-19' },
      { label: 'Été 2026',       start: '2026-07-04', end: '2026-08-31' },
      { label: 'Toussaint 2026', start: '2026-10-17', end: '2026-11-01' },
      { label: 'Noël 2026',      start: '2026-12-19', end: '2027-01-03' },
      { label: 'Hiver 2027',     start: '2027-02-13', end: '2027-02-28' },
      { label: 'Printemps 2027', start: '2027-04-10', end: '2027-04-25' },
      { label: 'Été 2027',       start: '2027-07-03', end: '2027-08-31' }
    ],
    B: [
      { label: 'Toussaint 2025', start: '2025-10-18', end: '2025-11-02' },
      { label: 'Noël 2025',      start: '2025-12-20', end: '2026-01-04' },
      { label: 'Hiver 2026',     start: '2026-02-14', end: '2026-03-01' },
      { label: 'Printemps 2026', start: '2026-04-11', end: '2026-04-26' },
      { label: 'Été 2026',       start: '2026-07-04', end: '2026-08-31' },
      { label: 'Toussaint 2026', start: '2026-10-17', end: '2026-11-01' },
      { label: 'Noël 2026',      start: '2026-12-19', end: '2027-01-03' },
      { label: 'Hiver 2027',     start: '2027-02-20', end: '2027-03-07' },
      { label: 'Printemps 2027', start: '2027-04-17', end: '2027-05-02' },
      { label: 'Été 2027',       start: '2027-07-03', end: '2027-08-31' }
    ],
    C: [
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
    ]
  };

  const VAC_MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const VAC_DAYS_FR = ['lu','ma','me','je','ve','sa','di'];
  const LS_VAC_ZONE = 'aar_vac_zone_v1';
  let VAC_CURRENT = null;
  let VAC_ACTIVE_ZONE = (localStorage.getItem(LS_VAC_ZONE) || 'C').toUpperCase();
  if(!VAC_ZONE_META[VAC_ACTIVE_ZONE]) VAC_ACTIVE_ZONE = 'C';

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

  function formatVacDate(iso){
    const d = parseISODateLocal(iso);
    return d ? `${d.getDate()} ${VAC_MONTHS_FR[d.getMonth()]}` : iso;
  }

  function setVacationZone(zone){
    if(!VAC_ZONE_META[zone]) return;
    VAC_ACTIVE_ZONE = zone;
    localStorage.setItem(LS_VAC_ZONE, zone);
    renderVacationCalendar(VAC_CURRENT || new Date());
  }

  function getHolidayForZone(iso, zone){
    return (SCHOOL_HOLIDAYS_BY_ZONE[zone] || []).find(p => iso >= p.start && iso <= p.end) || null;
  }

  function getHolidayState(iso, activeZone){
    const active = getHolidayForZone(iso, activeZone);
    return { active };
  }

  function monthHolidayText(dateObj, activeZone){
    const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const end = new Date(dateObj.getFullYear(), dateObj.getMonth()+1, 0);
    const startIso = isoLocal(start);
    const endIso = isoLocal(end);

    const activeHits = (SCHOOL_HOLIDAYS_BY_ZONE[activeZone] || [])
      .filter(p => !(p.end < startIso || p.start > endIso))
      .map(p => `${p.label} : ${formatVacDate(p.start)} → ${formatVacDate(p.end)}`);

    if(!activeHits.length) return 'Aucune vacance scolaire ce mois-ci';
    return `<span class="vac-cal-legend-line"><span class="vac-cal-legend-dot vac-zone-${activeZone.toLowerCase()}"></span><strong>${VAC_ZONE_META[activeZone].label}</strong> : ${activeHits.join(' • ')}</span>`;
  }

  function renderVacationZoneSwitch(){
    const mount = byId('vac-zone-switch');
    if(!mount) return;
    mount.innerHTML = Object.keys(VAC_ZONE_META).map(zone => {
      const active = zone === VAC_ACTIVE_ZONE ? ' is-active' : '';
      return `<button type="button" class="vac-zone-btn vac-zone-${zone.toLowerCase()}${active}" data-zone="${zone}" aria-pressed="${zone === VAC_ACTIVE_ZONE ? 'true' : 'false'}">${VAC_ZONE_META[zone].label}</button>`;
    }).join('');
    mount.querySelectorAll('[data-zone]').forEach(btn => {
      btn.addEventListener('click', ()=> setVacationZone(btn.getAttribute('data-zone')));
    });
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
      btn.textContent = collapsed ?'+' : '−';
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.setAttribute('title', collapsed ?'Déployer' : 'Réduire');
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
    const title = byId('vac-calendar-title');
    const subtitle = byId('vac-calendar-subtitle');
    if(!mount || !legend || !monthLabel) return;

    const base = monthStart(targetDate || new Date());
    VAC_CURRENT = base;
    renderVacationZoneSwitch();

    const currentMonthText = `${VAC_MONTHS_FR[base.getMonth()]} ${base.getFullYear()}`;
    monthLabel.textContent = '';
    monthLabel.style.display = 'none';
    if(title) title.textContent = `📅 Vacances scolaires — ${VAC_ZONE_META[VAC_ACTIVE_ZONE].label}`;
    if(subtitle) subtitle.textContent = VAC_ZONE_META[VAC_ACTIVE_ZONE].subtitle;

    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const last = new Date(base.getFullYear(), base.getMonth()+1, 0);
    const jsDay = first.getDay();
    const mondayOffset = (jsDay + 6) % 7;
    const startGrid = new Date(first);
    startGrid.setDate(first.getDate() - mondayOffset);

    let html = '<div class="vac-cal-head">'
      + '<button type="button" id="vac-cal-prev" class="vac-cal-nav">‹</button>'
      + `<div class="vac-cal-month">${currentMonthText}</div>`
      + '<button type="button" id="vac-cal-next" class="vac-cal-nav">›</button>'
      + '</div>';
    html += '<div class="vac-cal-grid">';
    html += VAC_DAYS_FR.map(d => `<div class="vac-cal-dow">${d}</div>`).join('');

    const todayIso = isoLocal(new Date());
    const activeDashboardIso = isoLocal(getDashboardActiveDateObj() || new Date());
    const daysInMonth = last.getDate();
    const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

    for(let i=0;i<totalCells;i++){
      const cur = new Date(startGrid);
      cur.setDate(startGrid.getDate() + i);
      const iso = isoLocal(cur);
      const state = getHolidayState(iso, VAC_ACTIVE_ZONE);
      const classes = ['vac-cal-cell'];
      if(cur.getMonth() !== base.getMonth()) classes.push('is-out');
      if(iso === todayIso) classes.push('is-today');
      if(iso === activeDashboardIso) classes.push('is-selected');
      if(state.active) classes.push('is-vac-active', `vac-zone-${VAC_ACTIVE_ZONE.toLowerCase()}`);
      const titleParts = [iso, 'Cliquer pour ouvrir ce jour dans le dashboard'];
      if(state.active) titleParts.unshift(`${VAC_ZONE_META[VAC_ACTIVE_ZONE].label} — ${state.active.label}`);
      html += `<button type="button" class="${classes.join(' ')}" data-iso="${iso}" title="${titleParts.join(' | ')}">${cur.getDate()}</button>`;
    }

    html += '</div>';
    mount.innerHTML = html;
    legend.innerHTML = monthHolidayText(base, VAC_ACTIVE_ZONE);

    byId('vac-cal-prev')?.addEventListener('click', ()=> renderVacationCalendar(addMonths(base, -1)));
    byId('vac-cal-next')?.addEventListener('click', ()=> renderVacationCalendar(addMonths(base, 1)));
    mount.querySelectorAll('.vac-cal-cell[data-iso]').forEach(cell => {
      cell.addEventListener('click', () => {
        const iso = cell.getAttribute('data-iso') || '';
        if(!iso) return;
        const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if(!match) return;
        const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
        if(Number.isNaN(next.getTime())) return;
        setDashboardActiveDate(next);
        renderVacationCalendar(base);
      });
    });
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
        btn.textContent = mode === 'night' ? 'Day' : 'Night';
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


/* ===== ARRIVALS GRAPH MODEBAR DISABLE ===== */
document.addEventListener('DOMContentLoaded', () => {
  const hideModebars = () => {
    document.querySelectorAll('.home-graph-card .modebar, .home-graph-card .modebar-container').forEach(el => {
      el.style.display = 'none';
    });
  };
  hideModebars();
  setTimeout(hideModebars, 200);
  setTimeout(hideModebars, 800);
});


/* ===== HOME ARRIVALS CHART COLORS -> MATCH PREVISIONNEL ===== */
(function(){
  const ARRIVALS_COLOR = '#183b66';
  const GROUPS_COLOR = '#9a4d00';

  function applyHomeArrivalsChartColors(){
    const gd = document.getElementById('home-arrivals-chart');
    if (!gd || !window.Plotly || !Array.isArray(gd.data) || !gd.data.length) return;

    const traceIndexes = [];
    const markerColors = [];

    gd.data.forEach((trace, idx) => {
      const name = String(trace?.name || '').toLowerCase();
      if (name.includes('group')) {
        traceIndexes.push(idx);
        markerColors.push(GROUPS_COLOR);
      } else if (name.includes('individ') || name.includes('arriv')) {
        traceIndexes.push(idx);
        markerColors.push(ARRIVALS_COLOR);
      }
    });

    if (!traceIndexes.length) return;

    try {
      for (let i = 0; i < traceIndexes.length; i++) {
        window.Plotly.restyle(gd, { 'marker.color': markerColors[i], 'line.color': markerColors[i] }, [traceIndexes[i]]);
      }
    } catch (err) {
      console.warn('home arrivals color sync failed:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyHomeArrivalsChartColors();
    setTimeout(applyHomeArrivalsChartColors, 250);
    setTimeout(applyHomeArrivalsChartColors, 900);
    setTimeout(applyHomeArrivalsChartColors, 1800);
    setTimeout(applyHomeArrivalsChartColors, 3200);
  });

  window.applyHomeArrivalsChartColors = applyHomeArrivalsChartColors;
})();


/* ===== HOME ARRIVALS CHART UI CLEANUP ===== */
(function(){
  function cleanupHomeArrivalsChartUi(){
    const root = document.getElementById('home-arrivals-chart');
    if (!root) return;

    const svgTexts = root.querySelectorAll('svg text');
    svgTexts.forEach(node => {
      const txt = String(node.textContent || '').trim().toLowerCase();
      if (txt === 'auto') {
        const button = node.closest('.button') || node.parentNode;
        if (button && button.style) button.style.display = 'none';
      }
    });

    root.querySelectorAll('.rangeselector .button').forEach(btn => {
      const txt = String(btn.textContent || '').trim().toLowerCase();
      if (txt === 'auto') btn.style.display = 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    cleanupHomeArrivalsChartUi();
    const root = document.getElementById('home-arrivals-chart');
    if (!root) return;
    const obs = new MutationObserver(() => cleanupHomeArrivalsChartUi());
    obs.observe(root, { childList: true, subtree: true });
    setTimeout(cleanupHomeArrivalsChartUi, 150);
    setTimeout(cleanupHomeArrivalsChartUi, 600);
    setTimeout(cleanupHomeArrivalsChartUi, 1400);
  });

  window.cleanupHomeArrivalsChartUi = cleanupHomeArrivalsChartUi;
})();
