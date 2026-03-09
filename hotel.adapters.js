(function(){
  const LS_RULES = 'aar_soiree_rules_v2';
  const LS_HOME_STATS_SOURCE = 'aar_home_arrivals_source_v1';
  const LS_ACDC_ALERTS = 'aar_acdc_alerts_v1';
  const LS_ACDC_SOFA = 'aar_acdc_sofa_v1';
  const LS_INVENTORY = 'aar_inventory_v3_compact';
  const LS_TARIFS = 'aar_tarifs_v1';
  const LS_HOME_CHECK_DB = 'aar_home_check_db_v3';
  const LS_HOME_CHECK_CURRENT_DATE = 'aar_home_check_current_date_v1';
  const DD_BASE = 'gdv_reconcile_v6_merge_import_stable_ids_k4_totalttc';
  const DD_COMPANY_SELECTED = 'dd_company_selected_v1';

  function safeJsonParse(raw, fallback){
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  function str(v){ return String(v == null ? '' : v).trim(); }
  function num(v, fallback){
    if (typeof v === 'string') {
      const normalized = v.replace(/\s/g,'').replace(',', '.');
      const n = Number(normalized);
      return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function todayIsoLocal(){
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }
  function toIsoDate(v){
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad2(v.getMonth()+1)}-${pad2(v.getDate())}`;
    if (typeof v === 'number') {
      const base = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(base.getTime() + v * 86400000);
      return isNaN(d) ? '' : `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
    }
    const s = str(v);
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return '';
  }
  function splitCSV(line, delim=';'){
    const out=[]; let cur=''; let q=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i], nxt=line[i+1];
      if(ch==='"'){
        if(q && nxt==='"'){ cur+='"'; i++; }
        else q=!q;
      }else if(ch===delim && !q){ out.push(cur); cur=''; }
      else cur+=ch;
    }
    out.push(cur);
    return out.map(s=>str(s).replace(/^"|"$/g,''));
  }
  function pick(row, aliases){
    const keys = Object.keys(row || {});
    for (const alias of aliases || []) {
      const safe = String(alias).replace(/\s+/g,'\\s*').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const rx = new RegExp('^' + safe + '$', 'i');
      const key = keys.find(k => rx.test(k));
      if (key && row[key] !== undefined && str(row[key]) !== '') return row[key];
    }
    return '';
  }
  function slug(s){
    return str(s)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'x';
  }

  function parseHomeSource(rawText){
    const text = str(rawText);
    if (!text) return [];
    const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(Boolean);
    const headerIdx = lines.findIndex(line => (line.match(/;/g) || []).length >= 8);
    if (headerIdx < 0 || !lines[headerIdx]) return [];
    const header = splitCSV(lines[headerIdx]);
    const rows = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = splitCSV(lines[i]);
      if (cols.length < Math.max(3, header.length / 2)) continue;
      const row = {};
      header.forEach((h, idx) => { row[h || `col_${idx}`] = cols[idx] ?? ''; });
      rows.push(row);
    }
    return rows;
  }

  function adaptFolsRows(rows){
    const list = Array.isArray(rows) ? rows : [];
    return list.map((row, idx) => {
      const id = str(pick(row, ['NUM_CHAMBRE','NUM_RESA','RESERVATION','N°RESA','ID'])) || `fols_${idx+1}`;
      const guestName = str(pick(row, ['GUEST_NAME','CLIENT','NOM_CLIENT','NOM','NAME']));
      const company = str(pick(row, ['COMPANY','SOCIETE','SOCIÉTÉ']));
      const groupName = str(pick(row, ['GUES_GROUPNAME','GROUP_NAME','GROUPNAME']));
      const arrivalDate = toIsoDate(pick(row, ['DATE_ARR','ARRIVAL_DATE','PSER_DATE']));
      const departureDate = toIsoDate(pick(row, ['DATE_DEP','DEPARTURE_DATE','PSER_DATFIN']));
      const roomNumber = str(pick(row, ['ROOM','ROOM_NO','CHAMBRE','NUM_CHAMBRE']));
      const roomType = str(pick(row, ['ROOM_TYPE','ROOMTYPE','TYPE_CH']));
      const adults = num(pick(row, ['NB_OCC_AD','ADULTS','ADU']), 0);
      const children = num(pick(row, ['NB_OCC_CH','CHILDREN','CHD','ENFANTS']), 0);
      const status = str(pick(row, ['STATUS','ETAT','ÉTAT']));
      const rateCode = str(pick(row, ['RATE_CODE','RATE','TARIF']));
      const nights = num(pick(row, ['NIGHTS','NB_NUITS','NUITS']), 0);
      const balance = num(pick(row, ['BALANCE','SOLDE','RESTE_A_PAYER','RESTE À PAYER']), 0);
      const notes = str(pick(row, ['MESSAGE','NOTES','COMMENTAIRE','COMMENT']));
      return {
        id, guestName, company, groupName, arrivalDate, departureDate,
        roomNumber, roomType, adults, children, nights, status, rateCode, balance, notes,
        raw: row
      };
    }).filter(r => r.guestName || r.groupName || r.roomNumber || r.arrivalDate);
  }

  function rowHasTrueTwin(r){
    const hay = `${pick(r, ['Message','MESSAGE','message'])} ${pick(r, ['message_html','MESSAGE_HTML'])}`;
    return /\bvrai(?:e)?\s*twin\b/i.test(String(hay || ''));
  }

  function adaptGroupRows(rows){
    const list = Array.isArray(rows) ? rows : [];
    const map = new Map();
    list.forEach((row) => {
      const name = str(pick(row, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']));
      if (!name) return;
      const current = map.get(name) || {
        id: slug(name),
        groupName: name,
        arrivalDate: '',
        departureDate: '',
        rooms: 0,
        adults: 0,
        children: 0,
        roomTypes: {},
        nonSplit: false,
        trueTwinRooms: 0
      };
      const arr = toIsoDate(pick(row, ['PSER_DATE','DATE_ARR','ARRIVAL_DATE']));
      const dep = toIsoDate(pick(row, ['PSER_DATFIN','DATE_DEP','DEPARTURE_DATE']));
      const roomType = str(pick(row, ['ROOM_TYPE','ROOMTYPE','ROOM']));
      const rooms = num(pick(row, ['NB_RESA','NB RESA','NBR_RESA','NB_ROOMS','ROOMS']), 1);
      current.rooms += rooms;
      current.adults += num(pick(row, ['NB_OCC_AD','ADULTS','ADU']), 0);
      current.children += num(pick(row, ['NB_OCC_CH','CHILDREN','CHD']), 0);
      if (roomType) current.roomTypes[roomType] = (current.roomTypes[roomType] || 0) + rooms;
      if (rooms > 1) current.nonSplit = true;
      if (rowHasTrueTwin(row)) current.trueTwinRooms += rooms;
      if (arr && (!current.arrivalDate || arr < current.arrivalDate)) current.arrivalDate = arr;
      if (dep && (!current.departureDate || dep > current.departureDate)) current.departureDate = dep;
      map.set(name, current);
    });
    return Array.from(map.values());
  }

  function loadRules(){
    const rules = safeJsonParse(localStorage.getItem(LS_RULES) || 'null', null) || {};
    return rules;
  }

  function buildKeywordMap(){
    const rules = loadRules();
    const kw = rules?.keywords || {};
    return {
      baby: Array.isArray(kw.baby) ? kw.baby : ['lit bb','lit bebe','lit bébé','baby','cot','crib'],
      comm: Array.isArray(kw.comm) ? kw.comm : ['comm','connecte','connecté','connected','communic'],
      dayuse: Array.isArray(kw.dayuse) ? kw.dayuse : ['day use','dayuse'],
      early: Array.isArray(kw.early) ? kw.early : ['early','prioritaire','11h','checkin','check-in','arrivee prioritaire'],
      elevator: ['ascenseur','lift','elevator'],
      bath: ['baignoire','bath','tub']
    };
  }

  function adaptPreferences(homeRows){
    const list = Array.isArray(homeRows) ? homeRows : [];
    const keywords = buildKeywordMap();
    const out = [];
    list.forEach((row, idx) => {
      const text = [
        pick(row, ['MESSAGE','Message','message']),
        pick(row, ['MESSAGE_HTML','message_html']),
        pick(row, ['NOTES','Notes','COMMENTAIRE'])
      ].map(str).filter(Boolean).join(' | ');
      if (!text) return;
      const textNorm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const date = toIsoDate(pick(row, ['DATE_ARR','ARRIVAL_DATE','PSER_DATE']));
      const guestName = str(pick(row, ['GUEST_NAME','CLIENT','NOM_CLIENT','NOM','NAME']));
      const roomNumber = str(pick(row, ['ROOM','ROOM_NO','CHAMBRE','NUM_CHAMBRE']));
      const checks = [
        ['baby', 'Lit bébé / baby', keywords.baby],
        ['comm', 'Communicante', keywords.comm],
        ['dayuse', 'Day use', keywords.dayuse],
        ['early', 'Early check-in', keywords.early],
        ['elevator', 'Ascenseur', keywords.elevator],
        ['bath', 'Baignoire', keywords.bath]
      ];
      checks.forEach(([kind, label, tokens]) => {
        if (tokens.some(token => textNorm.includes(String(token).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
          out.push({
            id: `pref_${kind}_${idx}_${out.length+1}`,
            date,
            guestName,
            roomNumber,
            kind,
            label,
            text
          });
        }
      });
    });
    return out;
  }

  function adaptInventory(){
    const sections = safeJsonParse(localStorage.getItem(LS_INVENTORY) || 'null', []);
    return Array.isArray(sections) ? sections : [];
  }

  function adaptAcdcAlerts(){
    const alerts = safeJsonParse(localStorage.getItem(LS_ACDC_ALERTS) || 'null', []);
    return Array.isArray(alerts) ? alerts : [];
  }

  function adaptAcdcSofa(){
    const alerts = safeJsonParse(localStorage.getItem(LS_ACDC_SOFA) || 'null', []);
    return Array.isArray(alerts) ? alerts : [];
  }

  function adaptChecklist(){
    const db = safeJsonParse(localStorage.getItem(LS_HOME_CHECK_DB) || 'null', { days:{} }) || { days:{} };
    const dateKey = localStorage.getItem(LS_HOME_CHECK_CURRENT_DATE) || todayIsoLocal();
    const day = db?.days?.[dateKey] || null;
    return { dateKey, day, db };
  }

  function adaptTariffs(){
    const rows = safeJsonParse(localStorage.getItem(LS_TARIFS) || 'null', []);
    return Array.isArray(rows) ? rows : [];
  }

  function adaptDdState(){
    const companyId = localStorage.getItem(DD_COMPANY_SELECTED) || 'accor_default';
    const key = `${DD_BASE}::${companyId}`;
    const state = safeJsonParse(localStorage.getItem(key) || 'null', null);
    if (!state || typeof state !== 'object') return { companyId, key, lines: [], history: [], raw: null };
    return {
      companyId,
      key,
      lines: Array.isArray(state.lines) ? state.lines : [],
      history: Array.isArray(state.history) ? state.history : [],
      usedByDay: state.usedByDay && typeof state.usedByDay === 'object' ? state.usedByDay : {},
      raw: state
    };
  }

  window.HOTELAI_ADAPTERS = {
    constants: {
      LS_RULES, LS_HOME_STATS_SOURCE, LS_ACDC_ALERTS, LS_ACDC_SOFA, LS_INVENTORY, LS_TARIFS, LS_HOME_CHECK_DB, LS_HOME_CHECK_CURRENT_DATE
    },
    utils: { safeJsonParse, str, num, toIsoDate, pick, splitCSV, todayIsoLocal },
    parseHomeSource,
    adaptFolsRows,
    adaptGroupRows,
    adaptPreferences,
    adaptInventory,
    adaptAcdcAlerts,
    adaptAcdcSofa,
    adaptChecklist,
    adaptTariffs,
    adaptDdState,
    loadRules
  };
})();
