(function(){
  const LS_IMPORT_DATE_INDIV = 'aar_import_date_indiv_v1';
  const RC_STORAGE_KEY = 'aar_reservation_control_v3';
  const LS_RULES = 'aar_soiree_rules_v2';
  const LS_HOME_CHECK_DB = 'aar_home_check_db_v3';
  const LS_HOME_CHECK_CURRENT_DATE = 'aar_home_check_current_date_v1';
  const BOOKING_ROWS_KEY = 'oris_booking_list_compact_v1';
  const BOOKING_IMPORT_DATE_KEY = 'oris_booking_list_import_date_v1';
  let activeOpsTab = 'checklist';
  const OPS_TABS = new Set(['checklist', 'vcc', 'forecast', 'assignment']);

  function byId(id){ return document.getElementById(id); }
  function esc(value){
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  function safeJsonParse(raw, fallback){
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function isoLocal(date){
    return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
  }
  function getDashboardChecklistDateKey(){
    const dashboardDate = window.AAR?.getDashboardActiveDateObj?.();
    const key = dashboardDate instanceof Date && !Number.isNaN(dashboardDate.getTime())
      ? isoLocal(dashboardDate)
      : (localStorage.getItem(LS_HOME_CHECK_CURRENT_DATE) || isoLocal(new Date()));
    localStorage.setItem(LS_HOME_CHECK_CURRENT_DATE, key);
    return key;
  }
  function dateFromKey(key){
    const m = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  function addDays(date, days){
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + Number(days || 0));
    return d;
  }
  function formatDateLong(date){
    const d = date instanceof Date && !isNaN(date) ? date : new Date();
    const label = d.toLocaleDateString('fr-FR', {
      weekday:'long',
      day:'numeric',
      month:'long',
      year:'numeric'
    });
    return label.charAt(0).toLocaleUpperCase('fr-FR') + label.slice(1);
  }
  function formatDateFromKey(key){
    return formatDateLong(dateFromKey(key) || new Date());
  }
  function formatImport(ts){
    if (!ts) return 'Aucun import chargé';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return 'Import chargé';
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return `${sameDay ? 'Aujourd’hui' : d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`;
  }
  function getReservationControlPayload(){
    if (window.__AAR_RESERVATION_CONTROL?.items) return window.__AAR_RESERVATION_CONTROL;
    const parsed = safeJsonParse(localStorage.getItem(RC_STORAGE_KEY) || 'null', null);
    return parsed && typeof parsed === 'object' ? parsed : { items: [], count: 0 };
  }
  function getAssistantData(){
    const rc = getReservationControlPayload();
    const importDate = localStorage.getItem(LS_IMPORT_DATE_INDIV) || '';
    forceDailyPeriod();
    const dayKey = String(window.__AAR_RESERVATION_CONTROL_BASE_DATE_KEY || rc.boostBaseDate || rc.commentWindowStart || rc.windowStart || (rc.items || [])[0]?.arrivalDate || isoLocal(new Date())).trim();
    const day = dateFromKey(dayKey) || new Date();
    const dayItems = (rc.items || []).filter(item => String(item.arrivalDate || '') === dayKey);
    const dayAiItems = dayItems.flatMap(item =>
      (Array.isArray(item.aiItems) ? item.aiItems : []).map(ai => ({ item, ai }))
    );
    const hasBoostCandidates = dayItems.some(item => {
      if (item.groupName || /^grp\s*-?$/i.test(String(item.roomNumber || '').trim())) return false;
      const comments = item.comments || {};
      return !!(comments.message || comments.preferences || comments.todo || comments.roomPref || comments.arrivalHour || comments.sourceText || comments.combined);
    });
    return {
      rc, importDate, hasBoostCandidates, day, dayKey, dayItems, dayAiItems,
      bookingImportDate: localStorage.getItem(BOOKING_IMPORT_DATE_KEY) || '',
      // Compatibilité avec l'ancien assistant/pet : ces noms pointent maintenant vers la journée Daily.
      tomorrow: day,
      tomorrowKey: dayKey,
      tomorrowItems: dayItems,
      tomorrowAiItems: dayAiItems
    };
  }
  function normalizeBookingName(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function bookingDateKey(value){
    const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  }
  function parseBookingCsv(text){
    const source = String(text || '').replace(/^\uFEFF/, '');
    const delimiter = (source.split(/\r?\n/, 1)[0].match(/;/g) || []).length >= (source.split(/\r?\n/, 1)[0].match(/,/g) || []).length ? ';' : ',';
    const table = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (char === '"') {
        if (quoted && source[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(cell); cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && source[i + 1] === '\n') i += 1;
        row.push(cell); cell = '';
        if (row.some(value => String(value).trim())) table.push(row);
        row = [];
      } else cell += char;
    }
    row.push(cell);
    if (row.some(value => String(value).trim())) table.push(row);
    if (!table.length) return [];
    const headers = table[0].map(value => String(value || '').trim());
    const index = name => headers.findIndex(header => header.toUpperCase() === name.toUpperCase());
    const at = (values, name) => String(values[index(name)] ?? '').trim();
    if (index('BOOK_NUM') < 0 || index('arrival_Date') < 0 || index('Dep_Date') < 0) {
      throw new Error('Ce fichier ne correspond pas au Booking List attendu.');
    }
    const compact = table.slice(1).map(values => ({
      guestId: at(values, 'Guest_Num'),
      name: [at(values, 'Guest_Name'), at(values, 'Guest_FirstName')].filter(Boolean).join(' ').trim().toUpperCase(),
      nameKey: normalizeBookingName([at(values, 'Guest_Name'), at(values, 'Guest_FirstName')].filter(Boolean).join(' ')),
      booking: at(values, 'BOOK_NUM'),
      arrival: bookingDateKey(at(values, 'arrival_Date')),
      departure: bookingDateKey(at(values, 'Dep_Date')),
      roomType: at(values, 'Room_Type').toUpperCase(),
      guestType: at(values, 'Guest_Typ'),
      roomCount: at(values, 'ROOM_NB')
    })).filter(item => item.booking && item.arrival && item.departure && item.nameKey);
    const unique = new Map();
    compact.forEach(item => unique.set([item.booking, item.arrival, item.departure, item.nameKey, item.roomType].join('|'), item));
    return Array.from(unique.values());
  }
  function bookingRecoucheLines(dayKey){
    const rows = safeJsonParse(localStorage.getItem(BOOKING_ROWS_KEY) || '[]', []);
    if (!Array.isArray(rows) || !rows.length) return [];
    const eligible = rows.filter(item => /^ind/i.test(String(item.guestType || '').trim()) && String(item.roomCount || '') === '1');
    const transitions = new Map();
    eligible.forEach(item => {
      const key = item.nameKey;
      if (item.departure === dayKey) {
        if (!transitions.has(key)) transitions.set(key, { ends:[], starts:[] });
        transitions.get(key).ends.push(item);
      }
      if (item.arrival === dayKey) {
        if (!transitions.has(key)) transitions.set(key, { ends:[], starts:[] });
        transitions.get(key).starts.push(item);
      }
    });
    const confirmed = [], warnings = [];
    transitions.forEach(group => {
      const collapseBookings = items => {
        const bookings = new Map();
        items.forEach(item => {
          if (!bookings.has(item.booking)) {
            bookings.set(item.booking, {
              ...item,
              roomTypes: new Set(),
              guestIds: new Set()
            });
          }
          const booking = bookings.get(item.booking);
          if (item.roomType) booking.roomTypes.add(item.roomType);
          if (item.guestId) booking.guestIds.add(item.guestId);
        });
        return Array.from(bookings.values());
      };
      const ends = collapseBookings(group.ends);
      const starts = collapseBookings(group.starts);
      const pairs = [];
      ends.forEach(before => starts.forEach(after => {
        if (before.booking !== after.booking) pairs.push({ before, after });
      }));
      if (!pairs.length) return;
      const hasMultipleRoomMatches = pairs.some(({ before, after }) =>
        before.roomTypes.size > 1 || after.roomTypes.size > 1
      );
      if (pairs.length !== 1 || hasMultipleRoomMatches) {
        const name = pairs[0]?.before?.name || pairs[0]?.after?.name || 'CLIENT';
        warnings.push(`[[ORIS_RED_START]]${name}[[ORIS_RED_END]]`);
        return;
      }
      const { before, after } = pairs[0];
      const beforeType = Array.from(before.roomTypes)[0] || before.roomType || '-';
      const afterType = Array.from(after.roomTypes)[0] || after.roomType || '-';
      const typeChange = beforeType !== afterType;
      const detail = `${before.name} (${before.booking} ${beforeType} → ${after.booking} ${afterType})`;
      confirmed.push(typeChange ? `[[ORIS_ORANGE_START]]${detail}[[ORIS_ORANGE_END]]` : detail);
    });
    const result = [];
    if (confirmed.length) result.push({ label:'RECOUCHE', names:confirmed.sort((a,b) => a.localeCompare(b, 'fr')) });
    if (warnings.length) result.push({ label:'RECOUCHE À CONTRÔLER', names:warnings.sort((a,b) => a.localeCompare(b, 'fr')) });
    return result;
  }
  function statusLine(data){
    if (!data.importDate) return 'Import FOLS requis avant toute action.';
    if (!data.rc?.count) return 'Import chargé, mais la mémoire réservations n’est pas encore préparée.';
    if (!data.dayItems.length) return 'Aucune réservation chargée pour cette journée.';
    if (!data.dayAiItems.length) return 'Analyse Luna 1j à lancer pour lire les commentaires utiles.';
    return 'Analyse Luna prête pour cette journée.';
  }
  function priorityRank(value){
    const v = String(value || '').toLowerCase();
    if (v === 'high') return 0;
    if (v === 'medium') return 1;
    return 2;
  }
  function forceDailyPeriod(){
    document.querySelectorAll('[data-reservation-control-period]').forEach(btn => {
      const isDaily = btn.getAttribute('data-reservation-control-period') === 'daily';
      btn.classList.toggle('is-active', isDaily);
    });
    const badge = byId('reservation-control-active-period');
    if (badge) badge.textContent = 'Daily';
  }
  function cleanAiResult(ai){
    const result = String(ai?.result || ai?.summary || ai?.recommendedAction || '').replace(/\s+/g, ' ').trim();
    if (!ai?.sofaRuleStale) return result;
    return ['À revérifier après modification des règles sofa.', result].filter(Boolean).join(' ');
  }
  function cleanAiQuote(ai){
    return String(ai?.quote || ai?.sourceComment || ai?.evidence || '').replace(/\s+/g, ' ').trim();
  }
  function isControlAudit(ai){
    const kind = String(ai?.kind || '').trim();
    const type = String(ai?.controlType || ai?.control || '').trim();
    return kind === 'control_audit' || type === 'baby_bed' || type === 'communicating_room';
  }
  function buildDayLunaRows(data){
    return data.dayAiItems
      .filter(({ ai }) => !isControlAudit(ai))
      .map(({ item, ai }) => ({
        guestName: item.guestName || 'Client',
        room: [item.roomType || '', item.roomNumber ? `Ch. ${item.roomNumber}` : ''].filter(Boolean).join(' · '),
        quote: cleanAiQuote(ai),
        result: cleanAiResult(ai),
        priority: ai.priority || 'medium'
      }))
      .filter(row => row.quote || row.result)
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.guestName.localeCompare(b.guestName, 'fr'));
  }
  function buildTomorrowControlRows(data){
    return buildDayLunaRows(data);
  }
  function assistantControlName(item){
    const raw = String(item?.guestName || '').trim();
    if (!raw) return 'CLIENT';
    const parts = raw.split(/\s+/).filter(Boolean);
    const family = [];
    for (const part of parts) {
      const normalized = part.replace(/[’']/g, '');
      if (/^[A-ZÀ-ÖØ-ÞĀ-ſ-]+$/.test(normalized) || /^(DE|DU|DES|LE|LA|LES|VAN|VON|DEN|DER)$/i.test(normalized)) {
        family.push(part.toUpperCase());
        continue;
      }
      break;
    }
    return (family.length ? family.join(' ') : parts[0]).toUpperCase();
  }
  function pushControlLine(map, label, value){
    const name = String(value || '').trim();
    if (!name) return;
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(name);
  }
  function assistantMultiRoomEntryKey(item, index){
    return String(item?.reservationLineKey || item?.id || item?.folsReservationId || `assistant_${Number(index || 0) + 1}`);
  }
  function buildAssistantMultiRoomCoverage(items){
    if (typeof window.ORIS_SOFA_ENGINE?.buildMultiRoomCoverage !== 'function') return new Map();
    const entries = (Array.isArray(items) ? items : []).map((item, index) => {
      const rawDossierId = String(item?.folsReservationId || item?.reservationId || '').trim();
      const dossierId = /^fols_\d+$/i.test(rawDossierId) ? '' : rawDossierId;
      return {
        entryKey: assistantMultiRoomEntryKey(item, index),
        dossierId,
        arrivalDate: String(item?.arrivalDate || '').trim(),
        departureDate: String(item?.departureDate || '').trim(),
        reference: String(item?.guaranty || '').trim(),
        guestName: String(item?.guestName || '').trim(),
        roomType: String(item?.roomType || '').trim(),
        adults: Number(item?.adults || 0),
        children: Number(item?.children || 0),
        eligible: !String(item?.groupName || '').trim()
      };
    });
    const coverage = window.ORIS_SOFA_ENGINE.buildMultiRoomCoverage(entries);
    return coverage instanceof Map ? coverage : new Map();
  }
  function buildDayControlsFromItems(items){
    const map = new Map();
    const sourceItems = Array.isArray(items) ? items : [];
    const multiRoomCoverage = buildAssistantMultiRoomCoverage(sourceItems);
    sourceItems.forEach((item, index) => {
      const control = item?.reservationControl || {};
      const name = assistantControlName(item);
      const entryKey = assistantMultiRoomEntryKey(item, index);
      const sofaCalculation = window.ORIS_SOFA_ENGINE?.calculate?.({
        adults: item?.adults,
        children: item?.children,
        babyDetected: !!control.babyDetected,
        roomType: item?.roomType,
        multiRoomContext: multiRoomCoverage.get(entryKey) || null
      }) || {
        sofaNeed: Number(control.sofaNeed || 0),
        babyPlusOneSofaRule: !!control.babyPlusOneSofaRule,
        babySofaNeed: Number(control.babySofaNeed || 0),
        hasAlert: false,
        alertLevel: '',
        alertReason: ''
      };
      const sofaNeed = Number(sofaCalculation.sofaNeed || 0);
      const babySofaNeed = Number(sofaCalculation.babySofaNeed || 0);
      // Une réservation avec lit bébé reste exclusivement dans LIT BÉBÉ.
      // Son besoin sofa ne sera réinjecté qu'après validation manuelle (nom barré).
      if (sofaNeed === 1 && !control.babyDetected) pushControlLine(map, '1 SOFA', name);
      if (sofaNeed >= 2 && !control.babyDetected) pushControlLine(map, '2 SOFAS', `${name}${sofaNeed > 2 ? ` (${sofaNeed})` : ''}`);
      if (control.babyDetected) {
        const babySofaSuffix = babySofaNeed > 0 ? ` (+${babySofaNeed} SOFA${babySofaNeed > 1 ? 'S' : ''})` : '';
        const technicalId = encodeURIComponent(assistantMultiRoomEntryKey(item, index));
        pushControlLine(map, 'LIT BÉBÉ', `${name}${babySofaSuffix}[[ORIS_BABY_ID:${technicalId}]]`);
      }
      if (sofaCalculation.hasAlert) {
        const marker = sofaCalculation.alertLevel === 'critical' ? 'RED' : 'ORANGE';
        const reason = String(sofaCalculation.alertReason || '').trim();
        const alertLabel = sofaCalculation.alertCode === 'room_sofa_capacity'
          ? 'SOFA À VÉRIFIER'
          : 'CAPACITÉ CHAMBRE';
        pushControlLine(map, alertLabel, `[[ORIS_${marker}_START]]${name}${reason ? ` (${reason})` : ''}[[ORIS_${marker}_END]]`);
      }
      if (control.communicatingDetected) pushControlLine(map, 'COMMUNIQUANTE', name);
      if (control.dayUseDetected) pushControlLine(map, 'DAY USE', name);
    });
    return Array.from(map.entries()).map(([label, names]) => ({ label, names: Array.from(new Set(names)) }));
  }
  function summarizeDayControls(data){
    const summary = window.__AAR_INDIV_DAY_SUMMARY?.[data.dayKey];
    if (summary && Array.isArray(summary.lines)) {
      const lines = summary.lines.map(line => ({ ...line, names:Array.isArray(line?.names) ? [...line.names] : [] }));
      const itemBabyLine = buildDayControlsFromItems(data.dayItems)
        .find(line => assistantControlDetailType(line.label) === 'baby');
      const index = lines.findIndex(line => assistantControlDetailType(line.label) === 'baby');
      if (itemBabyLine && index >= 0) lines[index] = itemBabyLine;
      else if (itemBabyLine) lines.push(itemBabyLine);
      return lines;
    }
    return buildDayControlsFromItems(data.dayItems);
  }
  function cleanControlText(value){
    return String(value || '')
      .replace(/\[\[ORIS_BABY_ID:[^\]]+\]\]/g, '')
      .replace(/\s*\[\[LUNA_OK\]\]/g, ' ✓')
      .replace(/\s*\[\[LUNA_KO\]\]/g, ' ✕')
      .replace(/\s*\[\[LUNA_Q\]\]/g, ' ?');
  }
  function renderControlName(value){
    const cleaned = cleanControlText(value);
    return esc(cleaned)
      .replace(/\[\[ORIS_RED_START\]\]/g, '<span class="assistant-control-name-warning">')
      .replace(/\[\[ORIS_RED_END\]\]/g, '</span>')
      .replace(/\[\[ORIS_ORANGE_START\]\]/g, '<span class="assistant-control-name-capacity-warning">')
      .replace(/\[\[ORIS_ORANGE_END\]\]/g, '</span>')
      .replace(/✓/g, '<span class="assistant-luna-confirm is-ok">✓</span>')
      .replace(/✕/g, '<span class="assistant-luna-confirm is-ko">✕</span>');
  }
  function assistantControlDetailType(label){
    const normalized = String(label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (normalized === 'LIT BEBE') return 'baby';
    if (normalized === 'COMMUNIQUANTE' || normalized === 'COMMUNICANTE') return 'comm';
    return '';
  }
  const ASSISTANT_BABY_SOFA_DONE_KEY = 'oris_assistant_baby_sofa_done_v1';
  function loadAssistantBabySofaDone(){
    const parsed = safeJsonParse(localStorage.getItem(ASSISTANT_BABY_SOFA_DONE_KEY) || '{}', {});
    return parsed && typeof parsed === 'object' ? parsed : {};
  }
  function assistantBabyEntry(value){
    const raw = String(value || '');
    const technicalMatch = raw.match(/\[\[ORIS_BABY_ID:([^\]]+)\]\]/);
    const text = cleanControlText(raw).trim();
    const match = text.match(/^(.*?)\s*\(\+(\d+)\s+SOFAS?\)\s*$/i);
    return {
      raw: value,
      name: (match?.[1] || text).trim(),
      reservationId: technicalMatch ? decodeURIComponent(technicalMatch[1]) : '',
      // Un lit bébé barré est remplacé par un sofa, dans la limite physique
      // maximale de deux sofas.
      sofaNeed: match ? Math.min(2, Math.max(1, Number(match[2] || 0) + 1)) : 1
    };
  }
  function assistantBabyDoneId(dayKey, value){
    const entry = assistantBabyEntry(value);
    return `${String(dayKey || '')}::${entry.reservationId || entry.name.toLocaleUpperCase('fr')}`;
  }
  function legacyAssistantBabyDoneId(dayKey, value){
    return `${String(dayKey || '')}::${assistantBabyEntry(value).name.toLocaleUpperCase('fr')}`;
  }
  function assistantBabyIsDone(dayKey, value){
    const done = loadAssistantBabySofaDone();
    const entry = assistantBabyEntry(value);
    const doneId = assistantBabyDoneId(dayKey, value);
    if (entry.reservationId && done[doneId]) return true;
    const legacyId = legacyAssistantBabyDoneId(dayKey, value);
    if (!done[legacyId] || !entry.reservationId) return false;
    const matches = (window.__AAR_RESERVATION_CONTROL?.items || []).filter(item =>
      String(item?.arrivalDate || '') === String(dayKey || '') &&
      !!item?.reservationControl?.babyDetected &&
      assistantControlName(item).toLocaleUpperCase('fr') === entry.name.toLocaleUpperCase('fr')
    );
    if (matches.length !== 1) return false;
    done[doneId] = true;
    delete done[legacyId];
    localStorage.setItem(ASSISTANT_BABY_SOFA_DONE_KEY, JSON.stringify(done));
    return true;
  }
  function applyAssistantBabySofaDone(lines, dayKey){
    const done = loadAssistantBabySofaDone();
    const touchedSofaLines = new Set();
    const result = (Array.isArray(lines) ? lines : []).map(line => ({
      ...line,
      names: Array.isArray(line?.names) ? [...line.names] : []
    }));
    const babyLine = result.find(line => assistantControlDetailType(line.label) === 'baby');
    if (!babyLine) return result;
    babyLine.names.forEach(value => {
      if (!assistantBabyIsDone(dayKey, value)) return;
      const entry = assistantBabyEntry(value);
      const label = entry.sofaNeed >= 2 ? '2 SOFAS' : '1 SOFA';
      let sofaLine = result.find(line => String(line.label || '').toUpperCase() === label);
      if (!sofaLine) {
        sofaLine = { label, names: [] };
        const babyIndex = result.indexOf(babyLine);
        result.splice(Math.max(0, babyIndex), 0, sofaLine);
      }
      const sofaName = entry.sofaNeed > 2 ? `${entry.name} (${entry.sofaNeed})` : entry.name;
      if (!sofaLine.names.includes(sofaName)) sofaLine.names.push(sofaName);
      touchedSofaLines.add(sofaLine);
    });
    touchedSofaLines.forEach(line => {
      line.names.sort((a, b) => String(a).localeCompare(String(b), 'fr', {
        sensitivity: 'base',
        numeric: true
      }));
    });
    const controlLineRank = label => {
      const normalized = String(label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (normalized === 'RECOUCHE') return 0;
      if (normalized === '1 SOFA') return 10;
      if (normalized === '2 SOFA' || normalized === '2 SOFAS') return 20;
      if (normalized === 'LIT BEBE') return 30;
      if (normalized === 'COMMUNIQUANTE' || normalized === 'COMMUNICANTE') return 40;
      if (normalized === 'SOFA A VERIFIER') return 50;
      if (normalized === 'CAPACITE CHAMBRE') return 60;
      if (normalized === 'CHAMBRES MULTIPLES') return 70;
      return 80;
    };
    result.sort((a, b) => controlLineRank(a.label) - controlLineRank(b.label));
    return result;
  }
  function renderAssistantBabyName(value, dayKey){
    const doneId = assistantBabyDoneId(dayKey, value);
    const isDone = assistantBabyIsDone(dayKey, value);
    return `<button type="button" class="assistant-baby-toggle${isDone ? ' is-done' : ''}" data-assistant-baby-toggle="${esc(doneId)}" aria-pressed="${isDone}" title="${isDone ? 'Annuler et retirer de la liste sofa' : 'Lit bébé traité : ajouter à la liste sofa'}">${renderControlName(value)}</button>`;
  }
  function normalizeChecklistItems(list, prefix){
    return (Array.isArray(list) ? list : []).map((item, idx) => {
      if (typeof item === 'string') return { id: `${prefix}_${idx}`, text: item };
      return {
        id: String(item?.id || `${prefix}_${idx}`).trim(),
        text: String(item?.text || '').trim()
      };
    }).filter(x => x.text);
  }
  function loadOpsChecklistRules(){
    const parsed = safeJsonParse(localStorage.getItem(LS_RULES) || 'null', {});
    return {
      morning: normalizeChecklistItems(parsed?.checklists?.morning, 'm'),
      evening: normalizeChecklistItems(parsed?.checklists?.evening, 'e')
    };
  }
  function loadOpsChecklistDb(){
    const parsed = safeJsonParse(localStorage.getItem(LS_HOME_CHECK_DB) || 'null', null);
    return parsed && typeof parsed === 'object' && parsed.days ? parsed : { days: {} };
  }
  function saveOpsChecklistDb(db){
    localStorage.setItem(LS_HOME_CHECK_DB, JSON.stringify(db));
    window.AAR?.scheduleSaveState?.('assistant checklist update');
    window.TODO?.refreshHomeChecklist?.();
  }
  function updateOpsChecklistCounters(host){
    const root = host?.querySelector?.('.assistant-ops-check-grid');
    if (!root) return;
    root.querySelectorAll('.assistant-ops-check-column').forEach(column => {
      const total = column.querySelectorAll('[data-assistant-check-id]').length;
      const done = column.querySelectorAll('[data-assistant-check-id]:checked').length;
      const counter = column.querySelector('.assistant-ops-check-head span');
      if (counter) counter.textContent = `${done} / ${total}`;
    });
  }
  function ensureOpsChecklistDay(db, dateKey){
    if (!db.days || typeof db.days !== 'object') db.days = {};
    if (!db.days[dateKey]) {
      db.days[dateKey] = {
        morningFixedDone: {},
        eveningFixedDone: {},
        morningExtra: [],
        eveningExtra: []
      };
    }
    const day = db.days[dateKey];
    day.morningFixedDone = day.morningFixedDone && typeof day.morningFixedDone === 'object' ? day.morningFixedDone : {};
    day.eveningFixedDone = day.eveningFixedDone && typeof day.eveningFixedDone === 'object' ? day.eveningFixedDone : {};
    day.morningExtra = Array.isArray(day.morningExtra) ? day.morningExtra : [];
    day.eveningExtra = Array.isArray(day.eveningExtra) ? day.eveningExtra : [];
    return day;
  }
  function buildOpsChecklist(data){
    const dateKey = getDashboardChecklistDateKey();
    const official = window.TODO?.getHomeChecklistModel?.(dateKey);
    if (official && official.morning && official.evening && official.day && official.db) return official;
    const rules = loadOpsChecklistRules();
    const db = loadOpsChecklistDb();
    const day = ensureOpsChecklistDay(db, dateKey);
    const buildSide = (side, title, items, doneMap, extras) => {
      const fixed = items.map(item => ({
        id: item.id,
        text: item.text,
        done: !!doneMap[item.id],
        fixed: true,
        side
      }));
      const extra = (extras || []).map((item, idx) => ({
        id: String(item?.id || `extra_${idx}`),
        text: String(item?.text || '').trim(),
        done: !!item?.done,
        fixed: false,
        side
      })).filter(x => x.text);
      const all = [...fixed, ...extra];
      return {
        side,
        title,
        items: all,
        done: all.filter(x => x.done).length,
        total: all.length
      };
    };
    return {
      dateKey,
      db,
      day,
      morning: buildSide('morning', 'Matin', rules.morning, day.morningFixedDone, day.morningExtra),
      evening: buildSide('evening', 'Soir', rules.evening, day.eveningFixedDone, day.eveningExtra)
    };
  }
  function renderOpsChecklist(data){
    const model = buildOpsChecklist(data);
    const renderSide = side => `
      <div class="assistant-ops-check-column">
        <button type="button" class="assistant-ops-check-head" data-assistant-check-reset="${esc(side.side)}" title="Réinitialiser toutes les cases">
          <strong>${esc(side.title)}</strong>
          <span>${esc(side.done)} / ${esc(side.total)}</span>
        </button>
        <div class="assistant-ops-check-list">
          ${side.items.length ? side.items.map(item => `
            <label class="assistant-ops-check-item">
              <input type="checkbox"
                ${item.done ? 'checked' : ''}
                data-assistant-check-side="${esc(item.side)}"
                data-assistant-check-id="${esc(item.id)}"
                data-assistant-check-fixed="${item.fixed ? '1' : '0'}" />
              <span>${esc(item.text)}</span>
            </label>
          `).join('') : '<div class="assistant-empty-soft">Aucune tâche.</div>'}
        </div>
      </div>
    `;
    return `
      <div class="assistant-ops-check-grid">
        ${renderSide(model.morning)}
        ${renderSide(model.evening)}
      </div>
    `;
  }
  function renderOpsVcc(){
    const entries = typeof window.__AAR_GET_VCC_MISSING_ENTRIES === 'function'
      ? window.__AAR_GET_VCC_MISSING_ENTRIES()
      : [];
    if (!entries.length) {
      return '<div class="assistant-empty-soft">Aucune VCC à signaler.</div>';
    }
    return `
      <div class="assistant-ops-vcc-list">
        ${entries.map(item => `
          <div class="assistant-ops-vcc-item">
            <span>${esc(item.date || '—')}</span>
            <strong>${esc(item.name || 'Client')}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }
  function renderOpsForecast(){
    const days = typeof window.__AAR_GET_OCCUPANCY_FORECAST === 'function'
      ? window.__AAR_GET_OCCUPANCY_FORECAST()
      : [];
    if (!days.length) {
      return '<div class="assistant-empty-soft">Aucun prévisionnel disponible.</div>';
    }
    return `
      <div class="assistant-ops-forecast-list">
        <div class="assistant-ops-forecast-head">
          <span>Date</span>
          <span>Dép.</span>
          <span>Arr.</span>
          <span>Grp.</span>
          <span>Total</span>
          <span>Sofa</span>
        </div>
        ${days.slice(0, 10).map(day => `
          <div class="assistant-ops-forecast-item">
            <strong>${esc(day.label || day.key || 'Date')}</strong>
            <button type="button" class="assistant-ops-pill is-departures" data-forecast-detail="departures" data-forecast-date="${esc(day.key)}">${esc(day.departures || 0)}</button>
            <button type="button" class="assistant-ops-pill" data-forecast-detail="arrivals" data-forecast-date="${esc(day.key)}">${esc(day.indivArrivals || 0)}</button>
            <button type="button" class="assistant-ops-pill is-groups" data-forecast-detail="groups" data-forecast-date="${esc(day.key)}">${esc(day.groupCount || 0)}${Number(day.groupRooms || 0) ? ` <small>(${esc(day.groupRooms)})</small>` : ''}</button>
            <button type="button" class="assistant-ops-pill is-total" data-forecast-detail="total" data-forecast-date="${esc(day.key)}">${esc(day.totalRooms || 0)}</button>
            <button type="button" class="assistant-ops-pill is-sofa${Number(day.criticalAlertCount || 0) ? ' is-critical' : Number(day.capacityAlertCount || 0) ? ' is-capacity-warning' : ''}" data-forecast-detail="sofas" data-forecast-date="${esc(day.key)}">${esc(day.sofaCount || 0)}</button>
          </div>
        `).join('')}
      </div>
    `;
  }
  function renderOpsAssignment(){
    const alerts = typeof window.__AAR_GET_ASSIGNMENT_WATCH_ALERTS === 'function'
      ? window.__AAR_GET_ASSIGNMENT_WATCH_ALERTS()
      : [];
    if (!alerts.length) {
      return '<div class="assistant-empty-soft">Aucune attribution à vérifier.</div>';
    }
    return `
      <div class="assistant-ops-assignment-list">
        ${alerts.slice(0, 10).map(alert => {
          const meta = alert?.meta || {};
          const details = Array.isArray(meta.details) ? meta.details : [];
          return `
            <div class="assistant-ops-assignment-item">
              <div>
                <strong>${esc(meta.name || alert?.text || 'Attribution')}</strong>
                ${meta.expected ? `<span>Attendu : ${esc(meta.expected)}</span>` : ''}
              </div>
              ${details.length ? `
                <ul>
                  ${details.slice(0, 4).map(d => `<li>${esc(d.date || 'Date ?')} · détecté : ${esc(d.detected || 'N/A')}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        }).join('')}
        ${alerts.length > 10 ? `<div class="assistant-ops-more">+ ${esc(alerts.length - 10)} autre(s) attribution(s)</div>` : ''}
      </div>
    `;
  }
  function renderOpsBody(tab, data){
    if (tab === 'vcc') return renderOpsVcc(data);
    if (tab === 'forecast') return renderOpsForecast(data);
    if (tab === 'assignment') return renderOpsAssignment(data);
    return renderOpsChecklist(data);
  }
  function renderOpsPanel(data){
    const tab = OPS_TABS.has(activeOpsTab) ? activeOpsTab : 'checklist';
    return `
      <section class="assistant-ops-card">
        <div class="assistant-ops-tabs" role="tablist" aria-label="Exploitation">
          <button type="button" class="${tab === 'checklist' ? 'is-active' : ''}" data-assistant-ops-tab="checklist">Checklist</button>
          <button type="button" class="${tab === 'vcc' ? 'is-active' : ''}" data-assistant-ops-tab="vcc">VCC</button>
          <button type="button" class="${tab === 'forecast' ? 'is-active' : ''}" data-assistant-ops-tab="forecast">Prévisionnel</button>
          <button type="button" class="${tab === 'assignment' ? 'is-active' : ''}" data-assistant-ops-tab="assignment">Attribution</button>
        </div>
        <div class="assistant-ops-body">
          ${renderOpsBody(tab, data)}
        </div>
      </section>
    `;
  }
  function render(container){
    const host = container || byId('assistant-output');
    if (!host) return;
    const data = getAssistantData();
    const importText = formatImport(data.importDate);
    const boostReady = !!data.hasBoostCandidates;
    const boostText = data.dayAiItems.length
      ? 'Analyse déjà prête'
      : boostReady
        ? 'Lire les commentaires utiles'
        : data.importDate
          ? 'Aucun commentaire a envoyer'
          : 'Import FOLS requis';
    const lunaRows = buildDayLunaRows(data);
    const controlLines = applyAssistantBabySofaDone(summarizeDayControls(data), data.dayKey);
    controlLines.push(...bookingRecoucheLines(data.dayKey));
    const controlHtml = controlLines.length
      ? controlLines.map(line => {
        const detailType = assistantControlDetailType(line.label);
        const namesSeparator = detailType === 'comm' ? ' / ' : ', ';
        return `
        <div class="assistant-daily-line">
          <div class="assistant-daily-line-head">
            <strong>${esc(line.label)}</strong>
            ${detailType ? `<button type="button" class="assistant-control-detail-btn" data-assistant-control-detail="${detailType}" data-assistant-control-date="${esc(data.dayKey)}" aria-label="Voir le détail ${esc(line.label)}" aria-haspopup="dialog">+</button>` : ''}
          </div>
          <span>${line.names.map(name => detailType === 'baby' ? renderAssistantBabyName(name, data.dayKey) : renderControlName(name)).join(namesSeparator)}</span>
        </div>
      `;
      }).join('')
      : '<div class="assistant-empty-soft">Aucun contrôle automatique particulier.</div>';
    const hasCapacityAlerts = controlLines.some(line =>
      (Array.isArray(line?.names) ? line.names : []).some(name => /\[\[ORIS_(?:RED|ORANGE)_START\]\]/.test(String(name || '')))
    );
    const capacityLegend = hasCapacityAlerts
      ? '<div class="assistant-capacity-legend"><span class="is-capacity">Orange : capacité de la chambre dépassée</span><span class="is-critical">Rouge : 5 occupants ou plus</span></div>'
      : '';
    const lunaHtml = lunaRows.length
      ? lunaRows.map(row => `
        <article class="assistant-luna-card">
          <div class="assistant-luna-head">
            <strong>${esc(row.guestName)}</strong>
            ${row.room ? `<span>${esc(row.room)}</span>` : ''}
          </div>
          ${row.quote ? `<p>“${esc(row.quote)}”</p>` : ''}
          ${row.result ? `<small>${esc(row.result)}</small>` : ''}
        </article>
      `).join('')
      : '<div class="assistant-empty-soft">Aucune information utile inscrite pour cette journée.</div>';

    host.innerHTML = `
      <section class="assistant-shell">
        <div class="assistant-topbar">
          <div class="assistant-back-group">
            <button type="button" class="assistant-dashboard-button" id="assistant-back-core">Dashboard</button>
          </div>
          <button type="button" class="assistant-date-pill">${esc(formatDateFromKey(data.dayKey))}</button>
        </div>

        <section class="assistant-main assistant-main-daily">
          <div class="assistant-left">
            <div class="assistant-hello">
              <p class="assistant-eyebrow">Mode assistant</p>
              <h1>Bonjour 👋</h1>
              <p>Vue claire de la journée : contrôles automatiques à gauche, lecture Luna des commentaires utiles à droite.</p>
            </div>

            <div class="assistant-boost-card">
              <div class="assistant-imports-group">
                <div class="assistant-import-state assistant-import-dropzone" id="assistant-fols-import" role="button" tabindex="0" aria-label="Importer ou déposer le fichier FOLS CSV">
                  <span class="assistant-db-icon">◎</span>
                  <div>
                    <strong>Import FOLS</strong>
                    <small class="${data.importDate ? 'is-green' : 'is-warn'}">${esc(importText)}</small>
                  </div>
                </div>
                <div class="assistant-import-state assistant-import-dropzone" id="assistant-booking-import" role="button" tabindex="0" aria-label="Importer ou déposer le Booking List CSV">
                  <span class="assistant-db-icon">↔</span>
                  <div>
                    <strong>Booking List</strong>
                    <small class="${data.bookingImportDate ? 'is-green' : 'is-warn'}">${esc(formatImport(data.bookingImportDate))}</small>
                  </div>
                </div>
              </div>
              <div class="assistant-boost-separator"></div>
              <button type="button" class="assistant-boost-button" id="assistant-boost" ${boostReady ? '' : 'disabled'}>
                <span>☾</span>
                <strong>Analyse Luna</strong>
                <small>${esc(boostText)}</small>
              </button>
            </div>

            ${renderOpsPanel(data)}

          </div>

          <div class="assistant-day-board">
            <section class="assistant-daily-panel">
              <div class="assistant-daily-title">
                <span>Contrôles automatiques</span>
                <em>${esc(data.dayItems.length)} arrivée(s)</em>
              </div>
              ${controlHtml}
              ${capacityLegend}
            </section>

            <section class="assistant-daily-panel assistant-daily-panel-luna">
              <div class="assistant-daily-title">
                <span>Commentaires utiles Luna</span>
                <em>${esc(lunaRows.length)} info(s)</em>
              </div>
              ${lunaHtml}
            </section>
          </div>

          <aside class="assistant-right assistant-right-compact">
            <div class="assistant-bot assistant-bot-small" aria-hidden="true">
              <div class="assistant-bot-antenna"></div>
              <div class="assistant-bot-head"><span></span><span></span></div>
              <div class="assistant-bot-body">N</div>
            </div>
            <h2>1 jour seulement</h2>
            <p>Pour garder une lecture précise, l’assistant lance uniquement l’analyse de la journée affichée.</p>
            <div class="assistant-simulation-box assistant-simulation-box-small" id="assistant-simulation">
              <div class="assistant-simulation-empty">
                <strong>${esc(lunaRows.length ? 'Prêt' : 'À analyser')}</strong>
                <span>${esc(lunaRows.length ? 'Les commentaires utiles sont affichés.' : 'Clique sur Analyse Luna pour lire cette journée.')}</span>
              </div>
            </div>
          </aside>
        </section>
      </section>
    `;

    bind(host);
  }
  function bind(host){
    host.querySelector('#assistant-back-core')?.addEventListener('click', () => {
      document.body.classList.remove('assistant-mode');
      document.getElementById('tab-home')?.click();
    });
    host.querySelectorAll('[data-assistant-ops-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-assistant-ops-tab');
        activeOpsTab = OPS_TABS.has(next) ? next : 'checklist';
        render(host);
      });
    });
    host.querySelectorAll('[data-forecast-detail]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-forecast-detail') || '';
        const dateKey = btn.getAttribute('data-forecast-date') || '';
        if (typeof window.__AAR_OPEN_HOME_KPI_DETAIL === 'function') {
          window.__AAR_OPEN_HOME_KPI_DETAIL(type, dateKey, btn);
        }
      });
    });
    host.querySelectorAll('[data-assistant-control-detail]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-assistant-control-detail') || '';
        const dateKey = btn.getAttribute('data-assistant-control-date') || '';
        if (typeof window.__AAR_OPEN_ASSISTANT_CONTROL_DETAIL === 'function') {
          window.__AAR_OPEN_ASSISTANT_CONTROL_DETAIL(type, dateKey, btn);
        }
      });
    });
    host.querySelectorAll('[data-assistant-baby-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-assistant-baby-toggle') || '';
        if (!id) return;
        const done = loadAssistantBabySofaDone();
        if (done[id]) delete done[id];
        else done[id] = true;
        localStorage.setItem(ASSISTANT_BABY_SOFA_DONE_KEY, JSON.stringify(done));
        window.AAR?.scheduleSaveState?.('assistant baby bed sofa toggle');
        render(host);
      });
    });
    host.querySelectorAll('[data-assistant-check-id]').forEach(cb => {
      cb.addEventListener('change', () => {
        const data = getAssistantData();
        const model = buildOpsChecklist(data);
        const side = cb.getAttribute('data-assistant-check-side') === 'evening' ? 'evening' : 'morning';
        const id = String(cb.getAttribute('data-assistant-check-id') || '');
        const isFixed = cb.getAttribute('data-assistant-check-fixed') === '1';
        const day = model.day;
        if (isFixed) {
          const target = side === 'evening' ? day.eveningFixedDone : day.morningFixedDone;
          target[id] = cb.checked;
        } else {
          const arr = side === 'evening' ? day.eveningExtra : day.morningExtra;
          const item = arr.find(x => String(x?.id || '') === id);
          if (item) item.done = cb.checked;
        }
        saveOpsChecklistDb(model.db);
        updateOpsChecklistCounters(host);
      });
    });
    host.querySelectorAll('[data-assistant-check-reset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const side = btn.getAttribute('data-assistant-check-reset') === 'evening' ? 'evening' : 'morning';
        const data = getAssistantData();
        const model = buildOpsChecklist(data);
        if (side === 'evening') {
          model.day.eveningFixedDone = {};
          model.day.eveningExtra.forEach(item => { item.done = false; });
        } else {
          model.day.morningFixedDone = {};
          model.day.morningExtra.forEach(item => { item.done = false; });
        }
        saveOpsChecklistDb(model.db);
        render(host);
      });
    });
    const assistantImport = host.querySelector('#assistant-fols-import');
    const openImport = () => window.ORIS_OPEN_FOLS_IMPORT?.();
    const setImportDrag = (active) => assistantImport?.classList.toggle('is-dragover', !!active);
    assistantImport?.addEventListener('click', openImport);
    assistantImport?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openImport();
      }
    });
    ['dragenter', 'dragover'].forEach(evt => {
      assistantImport?.addEventListener(evt, e => {
        e.preventDefault();
        setImportDrag(true);
      });
    });
    ['dragleave', 'dragend'].forEach(evt => {
      assistantImport?.addEventListener(evt, () => setImportDrag(false));
    });
    assistantImport?.addEventListener('drop', e => {
      e.preventDefault();
      setImportDrag(false);
      const file = (e.dataTransfer?.files || [])[0];
      window.ORIS_IMPORT_SOURCE_FILE?.(file);
    });
    const bookingImport = host.querySelector('#assistant-booking-import');
    const bookingInput = document.createElement('input');
    bookingInput.type = 'file';
    bookingInput.accept = '.csv,.txt,text/csv,text/plain';
    const importBookingFile = file => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const rows = parseBookingCsv(event.target?.result || '');
          localStorage.setItem(BOOKING_ROWS_KEY, JSON.stringify(rows));
          localStorage.setItem(BOOKING_IMPORT_DATE_KEY, new Date().toISOString());
          window.AAR?.scheduleSaveState?.('booking list import');
          window.AAR?.toast?.(`Booking List chargé : ${rows.length} réservation(s)`);
          render(host);
        } catch (error) {
          window.AAR?.toast?.(`Import Booking List impossible : ${error?.message || 'fichier invalide'}`);
        }
      };
      reader.onerror = () => window.AAR?.toast?.('Lecture du Booking List impossible');
      reader.readAsText(file, 'utf-8');
    };
    const openBookingImport = () => bookingInput.click();
    bookingInput.addEventListener('change', () => {
      importBookingFile(bookingInput.files?.[0]);
      bookingInput.value = '';
    });
    bookingImport?.addEventListener('click', openBookingImport);
    bookingImport?.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openBookingImport(); }
    });
    ['dragenter', 'dragover'].forEach(type => bookingImport?.addEventListener(type, event => {
      event.preventDefault(); bookingImport.classList.add('is-dragover');
    }));
    ['dragleave', 'dragend'].forEach(type => bookingImport?.addEventListener(type, () => bookingImport.classList.remove('is-dragover')));
    bookingImport?.addEventListener('drop', event => {
      event.preventDefault(); bookingImport.classList.remove('is-dragover');
      importBookingFile(event.dataTransfer?.files?.[0]);
    });
    host.querySelector('#assistant-boost')?.addEventListener('click', async () => {
      const status = host.querySelector('#assistant-status-line');
      if (window.RESERVATION_CONTROL?.isBoostInFlight?.()) return;
      if (!window.RESERVATION_CONTROL?.runBoost) {
        if (status) status.textContent = 'Analyse Luna indisponible : moteur Réservation non chargé.';
        return;
      }
      forceDailyPeriod();
      await window.RESERVATION_CONTROL.runBoost({ statusEl: status });
      render(host);
    });
  }

  function initFloatingPet(){
    if (document.getElementById('oris-pet-widget')) return;
    const pet = document.createElement('div');
    pet.id = 'oris-pet-widget';
    pet.className = 'oris-pet-widget';
    pet.innerHTML = `
      <div class="oris-pet-panel" id="oris-pet-panel" aria-live="polite">
        <div class="oris-pet-panel-head">
          <div>
            <strong>ORIS Assistant</strong>
            <span>Dialogue guidé par cluster</span>
          </div>
          <button type="button" id="oris-pet-close" aria-label="Réduire ORIS">×</button>
        </div>
        <div class="oris-pet-scope">
          <button type="button" class="is-active" data-oris-pet-scope="reservations_tomorrow">Journée</button>
          <button type="button" data-oris-pet-scope="groups_30">Groupes 30j</button>
          <button type="button" data-oris-pet-scope="boost_memory">Analyse Luna</button>
        </div>
        <div class="oris-pet-messages" id="oris-pet-messages">
          <div class="oris-pet-message is-oris">
            Choisis un périmètre, puis pose une question. Pour l’instant je simule la logique : aucun appel IA réel.
          </div>
        </div>
        <div class="oris-pet-input-row">
          <input id="oris-pet-input" type="text" placeholder="Question sur le périmètre choisi..." />
          <button type="button" id="oris-pet-send" aria-label="Envoyer">↑</button>
        </div>
      </div>

      <div class="oris-pet-toast-stack" id="oris-pet-toast-stack" aria-live="polite"></div>

      <div class="oris-pet-avatar" aria-hidden="true">
        <div class="oris-pet-head"><span></span><span></span></div>
        <div class="oris-pet-body">›</div>
      </div>
      <button type="button" class="oris-pet-toggle" id="oris-pet-toggle" aria-label="Ouvrir ORIS Assistant">⌃</button>
    `;
    document.body.appendChild(pet);
    bindFloatingPet(pet);
  }

  function activePetScope(root){
    return root.querySelector('[data-oris-pet-scope].is-active')?.dataset?.orisPetScope || 'reservations_tomorrow';
  }

  function scopeLabel(scope){
    if (scope === 'groups_30') return 'Groupes 30 jours';
    if (scope === 'boost_memory') return 'Analyse Luna';
    return 'Journée affichée';
  }

  function appendPetMessage(root, kind, text){
    const host = root.querySelector('#oris-pet-messages');
    if (!host) return;
    const msg = document.createElement('div');
    msg.className = `oris-pet-message is-${kind}`;
    msg.textContent = text;
    host.appendChild(msg);
    host.scrollTop = host.scrollHeight;
  }

  function notify(text, options = {}){
    const root = document.getElementById('oris-pet-widget');
    if (!root) return false;
    const message = String(text || '').trim();
    if (!message) return true;
    appendPetMessage(root, 'oris', message);
    pushPetToast(root, message);
    if (options.open) root.classList.add('is-open');
    pulsePet(root);
    return true;
  }

  function notifyPersistent(key, text, options = {}){
    const root = document.getElementById('oris-pet-widget');
    if (!root) return false;
    const message = String(text || '').trim();
    const toastKey = String(key || '').trim();
    if (!message || !toastKey) return true;
    appendPetMessage(root, 'oris', message);
    upsertPetToast(root, toastKey, message, { persistent: true });
    if (options.open) root.classList.add('is-open');
    pulsePet(root);
    return true;
  }

  function resolveNotification(key, text, options = {}){
    const root = document.getElementById('oris-pet-widget');
    if (!root) return false;
    const message = String(text || '').trim();
    const toastKey = String(key || '').trim();
    if (!message || !toastKey) return true;
    appendPetMessage(root, 'oris', message);
    upsertPetToast(root, toastKey, message, { persistent: false, resolve: true });
    if (options.open) root.classList.add('is-open');
    pulsePet(root);
    return true;
  }
  function clearNotification(key){
    const root = document.getElementById('oris-pet-widget');
    if (!root) return false;
    const toastKey = String(key || '').trim();
    if (!toastKey) return true;
    const map = ensurePetToastMap(root);
    const toast = map.get(toastKey);
    if (toast) {
      clearTimeout(toast.__orisPetLeaveTimer);
      clearTimeout(toast.__orisPetRemoveTimer);
      toast.remove();
      map.delete(toastKey);
    }
    return true;
  }

  function pulsePet(root){
    root.classList.add('has-notification');
    clearTimeout(root.__orisPetNotifyTimer);
    root.__orisPetNotifyTimer = setTimeout(() => {
      root.classList.remove('has-notification');
    }, 6400);
  }

  function ensurePetToastMap(root){
    if (!root.__orisPetToasts) root.__orisPetToasts = new Map();
    return root.__orisPetToasts;
  }

  function trimPetToastStack(stack){
    while (stack.children.length > 3) {
      const children = Array.from(stack.children);
      const removable = children.reverse().find(node => !node.classList.contains('is-persistent')) || stack.lastElementChild;
      removable?.remove();
    }
  }

  function schedulePetToastRemoval(root, toast, delay = 10400){
    clearTimeout(toast.__orisPetLeaveTimer);
    clearTimeout(toast.__orisPetRemoveTimer);
    toast.__orisPetLeaveTimer = setTimeout(() => toast.classList.add('is-leaving'), delay);
    toast.__orisPetRemoveTimer = setTimeout(() => {
      const map = ensurePetToastMap(root);
      const key = toast.dataset.orisPetToastKey;
      if (key && map.get(key) === toast) map.delete(key);
      toast.remove();
    }, delay + 700);
  }

  function upsertPetToast(root, key, text, options = {}){
    const stack = root.querySelector('#oris-pet-toast-stack');
    if (!stack) return null;
    const map = ensurePetToastMap(root);
    let toast = map.get(key);
    if (!toast || !toast.isConnected) {
      toast = document.createElement('div');
      toast.className = 'oris-pet-toast';
      toast.dataset.orisPetToastKey = key;
      stack.prepend(toast);
      map.set(key, toast);
    } else if (toast.parentElement === stack) {
      stack.prepend(toast);
    }
    toast.textContent = text;
    toast.classList.remove('is-leaving');
    toast.classList.toggle('is-persistent', !!options.persistent);
    toast.classList.toggle('is-resolved', !!options.resolve);
    clearTimeout(toast.__orisPetLeaveTimer);
    clearTimeout(toast.__orisPetRemoveTimer);
    if (!options.persistent) {
      schedulePetToastRemoval(root, toast, options.resolve ? 8400 : 10400);
    }
    trimPetToastStack(stack);
    return toast;
  }

  function pushPetToast(root, text){
    const stack = root.querySelector('#oris-pet-toast-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'oris-pet-toast';
    toast.textContent = text;
    stack.prepend(toast);
    trimPetToastStack(stack);
    schedulePetToastRemoval(root, toast);
  }

  function simulatePetAnswer(scope, question){
    const data = getAssistantData();
    const label = scopeLabel(scope);
    if (!question.trim()) return `Je suis sur le périmètre ${label}. Pose une question courte.`;
    if (!data.importDate) return 'Je ne peux pas répondre : aucun import FOLS n’est chargé dans Hotel IA.';
    if (scope === 'reservations_tomorrow') {
      const rows = buildTomorrowControlRows(data);
      if (!data.tomorrowItems.length) return `Périmètre ${label} : aucune réservation trouvée dans Hotel IA.`;
      if (!rows.length) return `Périmètre ${label} : ${data.tomorrowItems.length} réservation(s) chargée(s), mais aucune information Luna utile. Lance Analyse Luna avant la synthèse.`;
      return `Périmètre ${label} : ${rows.length} dossier(s) utile(s) sont prêts dans Analyse Luna.`;
    }
    if (scope === 'groups_30') {
      const groups = data.runtime?.entities?.groups || [];
      return `Périmètre ${label} : ${groups.length} groupe(s) connu(s) dans Hotel IA. Prochaine étape : créer le cluster 30 jours avant d’envoyer la question à l’IA.`;
    }
    return `Périmètre ${label} : ORIS utiliserait les résultats Analyse Luna déjà inscrits dans Hotel IA, sans relire tout le CSV.`;
  }

  function bindFloatingPet(root){
    const toggle = root.querySelector('#oris-pet-toggle');
    const close = root.querySelector('#oris-pet-close');
    const input = root.querySelector('#oris-pet-input');
    const send = root.querySelector('#oris-pet-send');
    const setOpen = (open) => {
      root.classList.toggle('is-open', !!open);
      if (open) setTimeout(() => input?.focus(), 0);
    };
    toggle?.addEventListener('click', () => setOpen(!root.classList.contains('is-open')));
    close?.addEventListener('click', () => setOpen(false));
    root.querySelectorAll('[data-oris-pet-scope]').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('[data-oris-pet-scope]').forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        appendPetMessage(root, 'oris', `Périmètre sélectionné : ${scopeLabel(activePetScope(root))}.`);
      });
    });
    const submit = () => {
      const question = String(input?.value || '').trim();
      if (!question) return;
      appendPetMessage(root, 'user', question);
      input.value = '';
      appendPetMessage(root, 'oris', simulatePetAnswer(activePetScope(root), question));
    };
    send?.addEventListener('click', submit);
    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') submit();
    });
  }

  function refresh(){
    const host = byId('assistant-output');
    if (host && document.body.classList.contains('assistant-mode')) {
      render(host);
    }
  }

  window.ORIS_ASSISTANT = { render, refresh, initFloatingPet, notify, notifyPersistent, resolveNotification, clearNotification };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingPet);
  } else {
    initFloatingPet();
  }
})();
