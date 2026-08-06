(function(){
  const LS_RESERVATION_CONTROL = 'aar_reservation_control_v3';
  const LS_LUNA_PREPARATION_PACK = 'aar_luna_preparation_pack_v1';
  const LS_RESERVATION_CONTROL_OLD_KEYS = ['aar_reservation_control_v1', 'aar_reservation_control_v2'];
  const LS_RULES = 'aar_soiree_rules_v2';
  const MULTI_ROOM_COVERAGE_VERSION = 1;
  const SHARED_DEFAULT_KEYWORDS = window.ORIS_DEFAULT_KEYWORDS || {};

  const DEFAULT_RULES = {
    keywords: {
      baby: Array.isArray(SHARED_DEFAULT_KEYWORDS.baby) ? SHARED_DEFAULT_KEYWORDS.baby.slice() : [],
      comm: Array.isArray(SHARED_DEFAULT_KEYWORDS.comm) ? SHARED_DEFAULT_KEYWORDS.comm.slice() : [],
      dayuse: Array.isArray(SHARED_DEFAULT_KEYWORDS.dayuse) ? SHARED_DEFAULT_KEYWORDS.dayuse.slice() : ['day use','dayuse'],
      early: Array.isArray(SHARED_DEFAULT_KEYWORDS.early) ? SHARED_DEFAULT_KEYWORDS.early.slice() : []
    },
    baby_exclude: ['bébé?','bébé ?','bb?','bb ?'],
    sofa: window.ORIS_SOFA_ENGINE?.normalizeRuleMap?.({}) || {}
  };

  const LLM_SYSTEM_PROMPT = [
    "Tu es Luna, une IA d'audit operationnel pour une reception d'hotel.",
    "Tu travailles uniquement a partir des donnees fournies et tu n inventes aucun contexte.",
    '',
    '1. SOURCE DE VERITE',
    '- comments.message est l unique commentaire a comprendre et l unique source autorisee pour etablir une demande, une preference, une contrainte, un incident ou une action.',
    '- reservationId et validationTargetId sont des identifiants techniques a recopier exactement.',
    '- guestName, arrivalDate, roomType, roomNumber et occupants sont du contexte technique. Ils ne prouvent jamais une demande.',
    '- reservationControl, localFacts et automaticControls sont des faits ou calculs locaux. Ils ne remplacent jamais le sens de comments.message.',
    '- Ne deduis rien d une absence, d un nom, d un type de chambre, d un numero de chambre ou d une occupation.',
    '',
    '2. GRILLE DE DECISION A APPLIQUER AVANT TOUTE ANALYSE',
    'TOUJOURS RETOURNER UNE OPERATION_NOTE',
    '- Une demande explicite qui necessite une preparation ou une action concrete.',
    '- Une preference explicite qui influence l attribution de chambre : baignoire, etage, emplacement, ascenseur, calme, chambres proches ou autre contrainte comparable.',
    '- Une contrainte explicite qui influence la reception, l attribution, la gouvernante, la maintenance, l accessibilite ou la logistique.',
    '- Une plainte, un incident, un risque, une sensibilite particuliere ou une decision humaine necessaire.',
    '- Un horaire uniquement s il change une action : arrivee tres tot, arrivee apres 23h00, chambre demandee prete, transport, groupe ou horaire atypique.',
    '- Une information explicite qui contredit ou nuance un fait local et exige une verification.',
    '',
    'TOUJOURS IGNORER',
    '- Une information descriptive sans action concrete pour l hotel.',
    '- Une heure d arrivee seule entre 12h00 et 23h00.',
    '- Un day use standard de 10h00 a 16h00 sans demande particuliere ni horaire different.',
    '- Une description standard de chambre ou de couchage sans demande ni ecart operationnel.',
    '- Le parking standard ou gratuit sans vehicule special, bus, car, camion, chauffeur ou livraison.',
    '- Un message purement technique de synchronisation, disponibilite ou fermeture sans demande client ni action reception explicite.',
    '- Une information standard de paiement, garantie, pre-paiement, enregistrement en ligne ou non-fumeur sans anomalie ni action particuliere.',
    '- Un texte commercial ou automatique sans demande explicite ni consequence operationnelle.',
    '',
    'CAS AMBIGU',
    '- Retourne une operation_note avec comparisonStatus="unclear" uniquement si une verification humaine est reellement necessaire.',
    '- Si aucune action ni verification n est necessaire, ignore le commentaire.',
    '- Des situations comparables doivent recevoir des decisions comparables.',
    '',
    '3. CONTROLES OBLIGATOIRES',
    '- validationTargets contient les controles locaux qui exigent tous un verdict Luna.',
    '- Retourne exactement un control_audit pour chaque validationTarget, jamais zero et jamais plusieurs.',
    '- Ne cree jamais de control_audit absent de validationTargets.',
    '- Recopie exactement reservationId, validationTargetId et controlType.',
    '- Lis orisDisplayedLine pour identifier le controle et evidenceCandidate avec comments.message pour juger son sens.',
    '- La presence d un mot declencheur ne constitue pas une confirmation.',
    '- baby_bed est confirmed seulement si le commentaire exprime reellement un besoin de couchage ou d equipement pour bebe ou enfant en bas age.',
    '- communicating_room est confirmed seulement si le commentaire exprime reellement un besoin de chambres liees, rapprochees, coordonnees ou organisees ensemble.',
    '- confirmed : comments.message valide clairement le controle.',
    '- conflict : comments.message contredit le controle, ne le valide pas, ou revele un faux positif.',
    '- unclear : le texte est illisible, tronque, contradictoire sans resolution ou impossible a interpreter.',
    '',
    '4. TRAITEMENT DU SOFA',
    '- sofaNeed est un calcul local fourni. Ne le recalcule jamais.',
    '- Ne retourne rien si comments.message confirme seulement le meme besoin que sofaNeed.',
    '- Retourne une operation_note de type sofa si comments.message demande explicitement un besoin different, le nuance ou le contredit.',
    '',
    '5. METHODE OBLIGATOIRE',
    '1. Prends connaissance de toute la grille de decision avant de lire les reservations.',
    '2. Pour chaque reservation, lis comments.message dans son ensemble.',
    '3. Traite d abord chacun de ses validationTargets.',
    '4. Identifie ensuite chaque intention operationnelle distincte et applique strictement la grille.',
    '5. Retourne au maximum une operation_note par intention distincte.',
    '6. Avant de produire le JSON, verifie que toutes les demandes explicites comparables ont recu la meme decision.',
    '7. Verifie que chaque validationTarget possede exactement un control_audit.',
    '8. Conserve l ordre des reservations recues : controlAudits d abord, operationNotes ensuite.',
    '',
    '6. REGROUPEMENT',
    '- Ne retourne jamais deux fois la meme information pour la meme reservation.',
    '- Pour un meme client ou dossier multi-chambres, regroupe une consigne commune identique en un seul item.',
    '- Conserve des items distincts lorsque les intentions ou les actions sont reellement differentes.',
    '',
    '7. PREUVES ET STYLE',
    '- quote est une citation exacte, courte et non reformulee de comments.message ou de evidenceCandidate.',
    '- result est une seule phrase courte, naturelle et directement exploitable par la reception.',
    '- Utilise une formulation metier stable : "Preparation : ...", "Attribution : ...", "Reception : ...", "Logistique : ..." ou "A verifier : ...".',
    '- Ne decris pas ton raisonnement et n explique pas le bruit ignore.',
    '',
    '8. FORMAT JSON OBLIGATOIRE',
    '- Retourne uniquement un objet JSON valide.',
    '- Racine exacte : {"controlAudits":[],"operationNotes":[]}.',
    '- controlAudits contient uniquement les reponses aux validationTargets.',
    '- operationNotes contient uniquement les informations retenues par la grille de decision.',
    '- Ne place jamais le meme item dans les deux listes.',
    '- Champs obligatoires : reservationId, validationTargetId, priority, kind, controlType, comparisonStatus, quote, reservationControl, result, confidence.',
    '- Dans controlAudits : kind="control_audit", validationTargetId obligatoire, controlType="baby_bed" ou "communicating_room", comparisonStatus="confirmed", "conflict" ou "unclear".',
    '- Dans operationNotes : kind="operation_note", validationTargetId vide, controlType="sofa", "room_preference", "arrival_time", "day_use" ou "other", comparisonStatus="new_info", "conflict" ou "unclear".',
    '- priority et confidence valent uniquement "low", "medium" ou "high".',
    '- Si rien n est retenu et aucun validationTarget n existe, retourne {"controlAudits":[],"operationNotes":[]}.'
  ].join('\n');

  const LLM_RESPONSE_SCHEMA = {
    controlAudits: [
      {
        reservationId: 'string',
        validationTargetId: 'string',
        priority: 'low|medium|high',
        kind: 'control_audit',
        controlType: 'baby_bed|communicating_room',
        comparisonStatus: 'confirmed|conflict|unclear',
        quote: 'citation courte exacte du commentaire, sans guillemets ajoutes',
        reservationControl: 'resume court du controle local audite si utile',
        result: 'phrase naturelle courte, ex: Preparation : lit bebe. / A verifier : la demande ne valide pas le controle.',
        confidence: 'low|medium|high'
      }
    ],
    operationNotes: [
      {
        reservationId: 'string',
        validationTargetId: 'string',
        priority: 'low|medium|high',
        kind: 'operation_note',
        controlType: 'sofa|room_preference|arrival_time|day_use|other',
        comparisonStatus: 'new_info|conflict|unclear',
        quote: 'citation courte exacte du commentaire, sans guillemets ajoutes',
        reservationControl: 'resume court du contexte local si utile',
        result: 'phrase naturelle courte, ex: Attribution : chambres proches demandees. / Reception : arrivee prevue a 21h30.',
        confidence: 'low|medium|high'
      }
    ]
  };

  const byId = (id)=>document.getElementById(id);
  let boostInFlight = false;
  function isBoostInFlight(){
    return !!boostInFlight;
  }
  function setBoostInFlight(value){
    boostInFlight = !!value;
    document.querySelectorAll('#reservation-control-ai-start, #assistant-boost').forEach(btn => {
      if (!btn) return;
      const canSwapText = btn.id === 'reservation-control-ai-start';
      if (canSwapText && !btn.dataset.boostIdleText) btn.dataset.boostIdleText = btn.textContent || 'Analyse Luna';
      btn.classList.toggle('is-boost-running', boostInFlight);
      btn.setAttribute('aria-busy', boostInFlight ? 'true' : 'false');
      if (boostInFlight) {
        btn.disabled = true;
        if (canSwapText) btn.textContent = 'Analyse Luna...';
      } else if (canSwapText) {
        btn.textContent = btn.dataset.boostIdleText || 'Analyse Luna';
      }
    });
  }
  const safeJsonParse = (raw, fallback)=>{
    try { return JSON.parse(raw); } catch { return fallback; }
  };
  LS_RESERVATION_CONTROL_OLD_KEYS.forEach(key => {
    try { localStorage.removeItem(key); } catch {}
  });
  try {
    const storedPayload = JSON.parse(localStorage.getItem(LS_RESERVATION_CONTROL) || 'null');
    let changed = false;
    if (storedPayload && Array.isArray(storedPayload.items)) {
      storedPayload.items = storedPayload.items.map(item => {
        if (!item?.comments || !Object.prototype.hasOwnProperty.call(item.comments, 'messageHtml')) return item;
        const { messageHtml: _removedMessageHtml, ...comments } = item.comments;
        changed = true;
        return { ...item, comments };
      });
      if (changed) localStorage.setItem(LS_RESERVATION_CONTROL, JSON.stringify(storedPayload));
    }
  } catch {}
  const escapeHtml = (value)=>String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const cleanText = (value)=>String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const stripAccentsLower = (value)=>String(value || '')
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu,'');

  function pick(row, aliases){
    const keys = Object.keys(row || {});
    for (const alias of aliases || []) {
      const rx = new RegExp('^' + String(alias).replace(/\s+/g,'\\s*').replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$', 'i');
      const key = keys.find(k => rx.test(k));
      if (key && row[key] !== undefined && String(row[key]).trim() !== '') return row[key];
    }
    return '';
  }

  function parseFolsDateCell(value){
    if (value == null || value === '') return null;
    if (value instanceof Date && !isNaN(value)) return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    if (typeof value === 'number') {
      const base = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(base.getTime() + value * 86400000);
      return isNaN(d) ? null : d;
    }
    const s = String(value).trim();
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return null;
  }

  function toIsoDateUtc(date){
    return date instanceof Date && !isNaN(date) ? date.toISOString().slice(0,10) : '';
  }

  function addDaysUtc(date, days){
    if (!(date instanceof Date) || isNaN(date)) return null;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + Number(days || 0)));
  }

  function todayUtc(){
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  function dateFromKey(key){
    const m = String(key || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  function storedBoostBaseDate(){
    const explicitKey = String(window.__AAR_RESERVATION_CONTROL_BASE_DATE_KEY || window.__AAR_INDIVIDUAL_FIRST_DATE_KEY || '').trim();
    const explicitDate = dateFromKey(explicitKey);
    if (explicitDate) return explicitDate;
    try {
      const payload = safeJsonParse(localStorage.getItem(LS_RESERVATION_CONTROL) || 'null', null);
      const storedKey = payload?.boostBaseDate || payload?.commentWindowStart || payload?.windowStart || '';
      return dateFromKey(storedKey);
    } catch (err) {
      return null;
    }
  }

  function getBoostBaseDate(){
    const boostBase = storedBoostBaseDate();
    if (boostBase) return boostBase;
    if (window.AAR?.getDashboardActiveDateObj) {
      const d = window.AAR.getDashboardActiveDateObj();
      if (d instanceof Date && !isNaN(d)) return d;
    }
    return todayUtc();
  }

  function formatImportDate(ts){
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return d.toLocaleString('fr-FR', { dateStyle:'medium', timeStyle:'short' });
  }

  function capFirst(value){
    return String(value || '')
      .toLocaleLowerCase('fr-FR')
      .replace(/(^|[\s'’-])([\p{L}])/gu, (_, sep, ch) => `${sep}${ch.toLocaleUpperCase('fr-FR')}`)
      .trim();
  }

  function formatGuestName(raw){
    const source = String(raw || '').split(/\s+-\s+/)[0].replace(/\s+/g, ' ').trim();
    if (!source) return '';
    const tokens = source.split(/\s+/).filter(Boolean);
    if (tokens.length <= 1) return source.toLocaleUpperCase('fr-FR');
    const first = tokens.pop();
    return `${tokens.join(' ').toLocaleUpperCase('fr-FR')} ${capFirst(first)}`.trim();
  }

  function getFolsReservationBaseId(row, rowIndex = 0){
    const explicit = String(pick(row, ['GUES_ID','NUM_RESA','RESERVATION','ID']) || '').trim();
    return explicit || `fols_${Number(rowIndex || 0) + 1}`;
  }

  function getFolsExplicitDossierId(row){
    return String(pick(row, ['GUES_ID']) || '').trim();
  }

  function getFolsSourceRowIndex(row, rowIndex = 0){
    const parsed = parseInt(String(row?.__rowIndex || '').replace(/[^\d]/g, ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Number(rowIndex || 0) + 1;
  }

  function getFolsReservationLineKey(row, rowIndex = 0){
    return `${getFolsReservationBaseId(row, rowIndex)}__row_${getFolsSourceRowIndex(row, rowIndex)}`;
  }

  function getFolsValidationTargetId(row, rowIndex = 0, controlType = ''){
    return `${getFolsReservationLineKey(row, rowIndex)}::${String(controlType || '').trim()}`;
  }

  function sanitizeBabyKeywordList(list){
    return (Array.isArray(list) ? list : [])
      .map(x => String(x || '').trim())
      .filter(Boolean)
      .filter(x => stripAccentsLower(x) !== 'cot');
  }

  function loadRules(){
    const stored = safeJsonParse(localStorage.getItem(LS_RULES) || 'null', null) || {};
    const keywords = typeof window.ORIS_NORMALIZE_CORE_KEYWORDS === 'function'
      ? window.ORIS_NORMALIZE_CORE_KEYWORDS(stored.keywords || {})
      : { ...DEFAULT_RULES.keywords, dayuse: Array.isArray(stored.keywords?.dayuse) ? stored.keywords.dayuse.slice() : DEFAULT_RULES.keywords.dayuse.slice() };
    keywords.baby = sanitizeBabyKeywordList(keywords.baby);
    return {
      keywords,
      baby_exclude: Array.isArray(stored.baby_exclude) ? stored.baby_exclude : DEFAULT_RULES.baby_exclude,
      sofa: window.ORIS_SOFA_ENGINE?.normalizeRuleMap?.(stored.sofa) || { ...DEFAULT_RULES.sofa }
    };
  }

  function currentSofaRulesSignature(rules = loadRules()){
    return window.ORIS_SOFA_ENGINE?.getRuleSignature?.(rules?.sofa) || '';
  }

  function getReservationRoomType(row){
    const raw = String(pick(row, [
      'ROOM_TYPE','ROOMTYPE','TYPE_CHB','TYPE CHB','ROOM CAT','ROOM CATEGORY',
      'ROOM_CLASS','ROOMCLASS','CATEGORY','CATEGORIE','CAT','CAT_CHB','CAT CHB',
      'CLASS','CHB_TYPE','CHB TYPE','TYPO_CHB','TYPO CHB','TYPCOD'
    ]) || '').trim();
    return window.ORIS_SOFA_ENGINE?.normalizeRoomType?.(raw) || raw;
  }

  function cleanKeywordHaystack(value){
    return stripAccentsLower(cleanText(value))
      .replace(/["*()]/g,' ')
      .replace(/s\/intern[:\s-]*/g, ' ')
      .replace(/[^\p{L}\p{N}\s\+]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildKeywordRegex(list, mode = 'word'){
    const esc = s=>String(s || '').replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s*');
    const pattern = (list || []).map(esc).filter(Boolean).join('|');
    if (!pattern) return null;
    if (mode === 'substring') return new RegExp(`(${pattern})`, 'i');
    return new RegExp(`\\b(${pattern})\\b`, 'i');
  }

  function hasBabyRequest(text, rules){
    const raw = stripAccentsLower(text);
    const hasExclude = (rules.baby_exclude || []).some(k => {
      const token = stripAccentsLower(k).trim();
      return token && raw.includes(token);
    });
    if (hasExclude) return false;
    const clean = ` ${cleanKeywordHaystack(text)} `;
    return (rules.keywords.baby || []).some(k => {
      const token = cleanKeywordHaystack(k);
      return token && clean.includes(` ${token} `);
    });
  }

  function hasExplicitSofaComment(text){
    return /\bsofa\b|canap[ée]|lit\s+d['’ ]?appoint|couchage|convertible/i.test(String(text || ''));
  }

  function getDateKey(row, aliases){
    const d = parseFolsDateCell(pick(row, aliases));
    return d ? toIsoDateUtc(d) : '';
  }

  function normalizeMultiRoomContext(value){
    if (!value || typeof value !== 'object') return null;
    return {
      occupancyCovered: value.occupancyCovered === true,
      roomCount: Math.max(0, Number(value.roomCount || 0)),
      totalOccupants: Math.max(0, Number(value.totalOccupants || 0)),
      totalCapacity: Math.max(0, Number(value.totalCapacity || 0)),
      groupKey: String(value.groupKey || '')
    };
  }

  function buildMultiRoomControlMetadata(value){
    const context = normalizeMultiRoomContext(value);
    return {
      multiRoom: !!context && context.roomCount >= 2,
      multiRoomOccupancyCovered: !!context?.occupancyCovered,
      multiRoomRoomCount: Number(context?.roomCount || 0),
      multiRoomTotalOccupants: Number(context?.totalOccupants || 0),
      multiRoomTotalCapacity: Number(context?.totalCapacity || 0),
      multiRoomGroupKey: String(context?.groupKey || '')
    };
  }

  function hasMatchingMultiRoomMetadata(control, context){
    const expected = buildMultiRoomControlMetadata(context);
    const current = control && typeof control === 'object' ? control : {};
    return Object.entries(expected).every(([key, value]) => current[key] === value);
  }

  function buildMultiRoomCoverage(entries){
    if (typeof window.ORIS_SOFA_ENGINE?.buildMultiRoomCoverage !== 'function') return new Map();
    const coverage = window.ORIS_SOFA_ENGINE.buildMultiRoomCoverage(entries);
    return coverage instanceof Map ? coverage : new Map();
  }

  function buildMultiRoomEntryFromRow(row, rowIndex){
    if (!isIndividualReservationRow(row)) return null;
    const guestRaw = pick(row, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) || '';
    return {
      entryKey: getFolsReservationLineKey(row, rowIndex),
      dossierId: getFolsExplicitDossierId(row),
      arrivalDate: getDateKey(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']),
      departureDate: getDateKey(row, ['PSER_DATFIN','Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']),
      reference: String(pick(row, ['GUARANTY','GUARANTEE','GARANTIE','Guarantee']) || '').trim(),
      guestName: formatGuestName(guestRaw) || String(guestRaw || '').trim(),
      roomType: getReservationRoomType(row),
      adults: parseInt(pick(row, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0', 10) || 0,
      children: parseInt(pick(row, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0', 10) || 0,
      eligible: true
    };
  }

  function getStoredExplicitDossierId(item){
    const stored = String(item?.dossierId || '').trim();
    if (stored) return stored;
    const legacy = String(item?.folsReservationId || item?.reservationId || '').trim();
    return /^fols_\d+$/i.test(legacy) ? '' : legacy;
  }

  function buildMultiRoomEntryFromItem(item, itemIndex){
    const entryKey = String(item?.reservationLineKey || item?.id || `stored_${Number(itemIndex || 0) + 1}`).trim();
    return {
      entryKey,
      dossierId: getStoredExplicitDossierId(item),
      arrivalDate: String(item?.arrivalDate || '').trim(),
      departureDate: String(item?.departureDate || '').trim(),
      reference: String(item?.guaranty || '').trim(),
      guestName: String(item?.guestName || '').trim(),
      roomType: String(item?.roomType || '').trim(),
      adults: Number(item?.adults || 0),
      children: Number(item?.children || 0),
      eligible: !String(item?.groupName || '').trim()
    };
  }

  function getWindow(){
    const start = getBoostBaseDate();
    const end = addDaysUtc(start, 30);
    return { startKey: toIsoDateUtc(start), endKey: toIsoDateUtc(end) };
  }

  function inMainWindow(item, windowInfo = getWindow()){
    const key = String(item?.arrivalDate || '').trim();
    return !!key && key >= windowInfo.startKey && key <= windowInfo.endKey;
  }

  function activePeriod(){
    const active = document.querySelector('[data-reservation-control-period].is-active');
    return active?.getAttribute('data-reservation-control-period') || 'daily';
  }

  function inPeriod(item, period){
    const key = String(item?.arrivalDate || '').trim();
    if (!key) return false;
    const base = getBoostBaseDate();
    const baseKey = toIsoDateUtc(base);
    if (period === 'daily') return key === baseKey;
    if (period === 'weekly') return key >= baseKey && key <= toIsoDateUtc(addDaysUtc(base, 6));
    if (period === 'monthly') return key >= baseKey && key <= toIsoDateUtc(addDaysUtc(base, 30));
    return true;
  }

  function buildReservationControlSummary(control){
    const labels = [];
    if (control.babyPlusOneSofaRule) labels.push('Lit bébé + 1 sofa');
    else {
      if (control.babyDetected) labels.push('Lit bébé');
      if (control.sofaNeed) labels.push(`${control.sofaNeed} sofa${control.sofaNeed > 1 ? 's' : ''}`);
    }
    if (control.capacityAlert) labels.push('Capacité chambre à vérifier');
    if (control.communicatingDetected) labels.push('Communicante');
    if (control.dayUseDetected) labels.push('Day use');
    if (control.earlyDetected) labels.push('Arrivée prioritaire');
    if (control.bathDetected) labels.push('Baignoire');
    if (control.roomPref) labels.push(`Chambre ${control.roomPref}`);
    if (control.arrivalHour) labels.push(`Arrivée ${control.arrivalHour}`);
    return labels.join(' • ') || 'Aucun contrôle particulier';
  }

  function buildReservationControl(row, rules, rx, comments, adults, children, multiRoomContext = null){
    const messageText = comments.message || '';
    const haystack = cleanKeywordHaystack(messageText);
    const raw = stripAccentsLower(messageText);

    const baby = hasBabyRequest(messageText, rules);
    const comm = !!(rx.comm && rx.comm.test(haystack));
    const dayUse = !!(rx.dayuse && rx.dayuse.test(haystack));
    const early = !!(rx.early && rx.early.test(haystack));
    const bath = raw.includes('baignoire') || /\bbath\b|\btub\b/.test(raw);
    const explicitText = [comments.message, comments.todo].filter(Boolean).join(' | ');
    const elevatorExplicit = /\bascenseur\b|\belevator\b|\blift\b/i.test(explicitText);
    const roomType = getReservationRoomType(row);
    const sofaCalculation = window.ORIS_SOFA_ENGINE?.calculate?.({
      adults,
      children,
      babyDetected: baby,
      roomType,
      sofaRules: rules.sofa,
      multiRoomContext
    }) || {
      ruleNeed: 0,
      sofaNeed: 0,
      babyPlusOneSofaRule: false,
      sofaCapacity: 0,
      maxOccupants: 0,
      hasAlert: false,
      alertLevel: '',
      alertCode: '',
      alertReason: '',
      alertTechnicalReason: ''
    };
    const control = {
      babyDetected: baby,
      sofaNeed: Number(sofaCalculation.sofaNeed || 0),
      sofaRuleNeed: Number(sofaCalculation.ruleNeed || 0),
      babyPlusOneSofaRule: !!sofaCalculation.babyPlusOneSofaRule,
      sofaCapacity: Number(sofaCalculation.sofaCapacity || 0),
      maxOccupants: Number(sofaCalculation.maxOccupants || 0),
      capacityAlert: !!sofaCalculation.hasAlert,
      capacityAlertLevel: sofaCalculation.alertLevel || '',
      capacityAlertCode: sofaCalculation.alertCode || '',
      capacityAlertReason: sofaCalculation.alertReason || '',
      capacityAlertTechnicalReason: sofaCalculation.alertTechnicalReason || '',
      ...buildMultiRoomControlMetadata(multiRoomContext),
      communicatingDetected: comm,
      dayUseDetected: dayUse,
      earlyDetected: early,
      bathDetected: bath,
      elevatorExplicit,
      roomPref: comments.roomPref || '',
      arrivalHour: comments.arrivalHour || '',
      explicitSofaComment: hasExplicitSofaComment(messageText)
    };
    control.summary = buildReservationControlSummary(control);
    return control;
  }

  function buildAutomaticControls(control){
    const controls = [];
    const add = (name, value)=>controls.push({ control:name, value:String(value == null ? true : value) });
    if (control.babyDetected) add('baby_bed', true);
    if (control.communicatingDetected) add('communicating_room', true);
    if (control.dayUseDetected) add('day_use', true);
    if (control.earlyDetected) add('early_checkin', true);
    if (control.bathDetected) add('bath_preference', true);
    if (control.roomPref) add('room_preference', control.roomPref);
    if (control.arrivalHour) add('arrival_time', control.arrivalHour);
    if (control.explicitSofaComment) add('sofa_comment_compare', control.sofaNeed);
    return controls;
  }

  function isIndividualReservationRow(row){
    const groupName = String(pick(row, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim();
    if (groupName) return false;
    const roomNum = stripAccentsLower(String(pick(row, ['ROOM_NUM','ROOM','ROOM_NO','CHAMBRE','NUM_CHAMBRE']) || '')).replace(/[^a-z0-9]+/g, ' ').trim();
    if (roomNum === 'grp') return false;
    if (roomNum === 'ind') return true;
    return !roomNum.includes('grp');
  }

  function buildItems(rows){
    const rules = loadRules();
    const rx = {
      comm: buildKeywordRegex(rules.keywords.comm, 'substring'),
      dayuse: buildKeywordRegex(rules.keywords.dayuse),
      early: buildKeywordRegex(rules.keywords.early)
    };
    const sourceRows = Array.isArray(rows) ? rows : [];
    const multiRoomEntries = sourceRows
      .map((row, idx)=>buildMultiRoomEntryFromRow(row, idx))
      .filter(Boolean);
    const multiRoomCoverage = buildMultiRoomCoverage(multiRoomEntries);

    return sourceRows.map((row, idx)=>{
      const groupName = String(pick(row, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim();
      if (!isIndividualReservationRow(row)) return null;

      const guestRaw = pick(row, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) || '';
      const adults = parseInt(pick(row, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0', 10) || 0;
      const children = parseInt(pick(row, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0', 10) || 0;
      const message = cleanText(pick(row, ['Message','MESSAGE','message']));
      const preferences = cleanText(pick(row, ['GUES_PREF','PREFERENCES','PREF']));
      const todo = cleanText(pick(row, ['TO_DO_TO_SAY','TODO','TO DO TO SAY']));
      const roomPref = cleanText(pick(row, ['RoomNumPref','ROOM_NUM_PREF','ROOM PREF']));
      const arrivalHour = cleanText(pick(row, ['Arriv_Hour','ARRIV_HOUR','ARRIVAL_HOUR']));
      const sourceText = cleanText([message, preferences, todo, roomPref, arrivalHour].filter(Boolean).join(' | '));
      const combined = cleanText([message, preferences, todo, roomPref ? `Chambre ${roomPref}` : '', arrivalHour ? `Arrivée ${arrivalHour}` : '', sourceText].filter(Boolean).join(' | '));
      const hasRealCommentData = !!(message || preferences || todo || roomPref || arrivalHour);
      const comments = { message, preferences, todo, roomPref, arrivalHour, sourceText, combined };
      const folsReservationId = getFolsReservationBaseId(row, idx);
      const dossierId = getFolsExplicitDossierId(row);
      const sourceRowIndex = getFolsSourceRowIndex(row, idx);
      const reservationLineKey = getFolsReservationLineKey(row, idx);
      const multiRoomContext = multiRoomCoverage.get(reservationLineKey) || null;
      const control = buildReservationControl(row, rules, rx, comments, adults, children, multiRoomContext);
      const automaticControls = buildAutomaticControls(control);

      const item = {
        id: reservationLineKey,
        reservationId: folsReservationId,
        folsReservationId,
        dossierId,
        sourceRowIndex,
        reservationLineKey,
        guestName: formatGuestName(guestRaw) || String(guestRaw || '').trim() || 'Client sans nom',
        arrivalDate: getDateKey(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']),
        departureDate: getDateKey(row, ['PSER_DATFIN','Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']),
        roomType: getReservationRoomType(row),
        roomNumber: String(pick(row, ['ROOM_NUM','ROOM','ROOM_NO','CHAMBRE','NUM_CHAMBRE']) || '').trim(),
        rate: String(pick(row, ['RATE','TARIF','Rate']) || '').trim(),
        guaranty: String(pick(row, ['GUARANTY','GUARANTEE','GARANTIE','Guarantee']) || '').trim(),
        groupName,
        adults,
        children,
        comments,
        reservationControl: control,
        automaticControls,
        aiItems: [],
        hasCommentData: hasRealCommentData
      };
      item.alerts = buildAlerts(item);
      return item;
    }).filter(Boolean).filter(item => item.guestName || item.arrivalDate || item.hasCommentData);
  }

  function buildAlerts(item){
    const localAlerts = [];
    const control = item?.reservationControl || {};
    if (control.capacityAlert) {
      const warningLevel = control.capacityAlertLevel === 'critical' ? 'critical' : 'capacity';
      const roomType = window.ORIS_SOFA_ENGINE?.normalizeRoomType?.(item?.roomType) || String(item?.roomType || '').trim();
      const totalPax = Math.max(0, Number(item?.adults || 0)) + Math.max(0, Number(item?.children || 0));
      const capacityDisplay = roomType && totalPax
        ? `${roomType} avec ${totalPax} pax`
        : control.capacityAlertReason || 'Capacité chambre à vérifier';
      localAlerts.push({
        priority: warningLevel === 'critical' ? 'high' : 'medium',
        category: 'capacité chambre',
        quote: '',
        reservationControl: control.summary || '',
        result: capacityDisplay,
        comparisonStatus: 'local_control',
        confidence: 'high',
        warningLevel,
        local: true
      });
    }
    const aiAlerts = (item.aiItems || []).map(ai => ({
      priority: ai.priority || 'medium',
      category: ai.kind || 'controle',
      quote: ai.quote || '',
      reservationControl: ai.reservationControl || item.reservationControl?.summary || '',
      result: ai.result || '',
      comparisonStatus: ai.comparisonStatus || '',
      confidence: ai.confidence || 'medium',
      sofaRuleStale: !!ai.sofaRuleStale
    }));
    return [...localAlerts, ...aiAlerts];
  }

  function truncateForStorage(value, max = 1200){
    const text = cleanText(value || '');
    return text.length > max ? text.slice(0, max).trim() + '…' : text;
  }

  function compactItemForStorage(item){
    if (!item || typeof item !== 'object') return item;
    const comments = item.comments || {};
    return {
      ...item,
      comments: {
        message: truncateForStorage(comments.message, 1000),
        preferences: truncateForStorage(comments.preferences, 800),
        todo: truncateForStorage(comments.todo, 800),
        roomPref: truncateForStorage(comments.roomPref, 80),
        arrivalHour: truncateForStorage(comments.arrivalHour, 80),
        sourceText: truncateForStorage(comments.sourceText, 1600),
        combined: truncateForStorage([comments.message, comments.preferences, comments.todo, comments.sourceText].filter(Boolean).join(' | '), 2200)
      }
    };
  }

  function compactPayloadForStorage(payload){
    return {
      ...payload,
      items: (payload.items || []).map(compactItemForStorage)
    };
  }

  function stripStoredComments(item){
    return {
      ...item,
      comments: {
        message: '',
        preferences: '',
        todo: '',
        roomPref: '',
        arrivalHour: '',
        sourceText: '',
        combined: ''
      },
      hasCommentData: false,
      commentsRetained: false
    };
  }

  function persistPayload(payload){
    const compactPayload = compactPayloadForStorage(payload);
    try {
      localStorage.setItem(LS_RESERVATION_CONTROL, JSON.stringify(compactPayload));
      return true;
    } catch (err) {
      try {
        LS_RESERVATION_CONTROL_OLD_KEYS.forEach(key => localStorage.removeItem(key));
        localStorage.setItem(LS_RESERVATION_CONTROL, JSON.stringify({
          ...compactPayload,
          items: (compactPayload.items || []).map(item => ({
            ...item,
            comments: {
              message: truncateForStorage(item.comments?.message, 500),
              preferences: truncateForStorage(item.comments?.preferences, 400),
              todo: truncateForStorage(item.comments?.todo, 400),
              roomPref: item.comments?.roomPref || '',
              arrivalHour: item.comments?.arrivalHour || '',
              sourceText: '',
              combined: ''
            }
          }))
        }));
        return true;
      } catch (err2) {
        console.warn('Reservation Control cache skipped:', err2);
        return false;
      }
    }
  }

  function buildLunaPreparationPack(items){
    return (Array.isArray(items) ? items : []).flatMap(item => {
      const comments = compactLunaCommentFields(item.comments);
      const validationTargets = buildLunaValidationTargets(item, comments);
      return validationTargets.map(target => ({
        reservationId: item.id,
        folsReservationId: item.folsReservationId || item.reservationId || '',
        reservationLineKey: item.reservationLineKey || item.id || '',
        sourceRowIndex: item.sourceRowIndex || '',
        validationTargetId: target.validationTargetId || '',
        guestName: item.guestName,
        arrivalDate: item.arrivalDate,
        roomType: item.roomType,
        roomNumber: item.roomNumber,
        controlType: target.controlType,
        orisDisplayedLine: target.orisDisplayedLine || '',
        orisTriggerText: target.orisTriggerText || '',
        orisTriggerKeyword: target.orisTriggerKeyword || '',
        commentExtract: target.evidenceCandidate || '',
        evidenceCandidate: target.evidenceCandidate || ''
      }));
    });
  }

  function persistLunaPreparationPack(pack){
    const normalized = Array.isArray(pack) ? pack : [];
    window.__AAR_LUNA_PREPARATION_PACK = normalized;
    try {
      localStorage.setItem(LS_LUNA_PREPARATION_PACK, JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        count: normalized.length,
        items: normalized
      }));
    } catch (err) {
      console.warn('Luna preparation pack cache skipped:', err);
      try { localStorage.removeItem(LS_LUNA_PREPARATION_PACK); } catch (_) {}
    }
  }

  function processRows(rows){
    const allItems = buildItems(rows);
    const windowInfo = getWindow();
    const items = allItems.map(item => {
      const keepComments = inMainWindow(item, windowInfo);
      const baseItem = keepComments
        ? { ...item, commentsRetained: true }
        : stripStoredComments(item);
      return {
        ...baseItem,
        validationTargets: buildOrisValidationTargets(baseItem)
      };
    });
    const lunaPreparationPack = buildLunaPreparationPack(items);
    const payload = {
      version: 2,
      importedAt: new Date().toISOString(),
      boostBaseDate: windowInfo.startKey,
      windowStart: windowInfo.startKey,
      windowEnd: windowInfo.endKey,
      commentWindowStart: windowInfo.startKey,
      commentWindowEnd: windowInfo.endKey,
      retentionDays: 30,
      commentRetentionDays: 30,
      storagePolicy: 'structured_reservations_full_comments_limited_to_window',
      sofaRulesSignature: currentSofaRulesSignature(),
      multiRoomCoverageVersion: MULTI_ROOM_COVERAGE_VERSION,
      totalRows: allItems.length,
      count: items.length,
      commentsClearedOutsideWindow: items.filter(item => !item.commentsRetained).length,
      lunaPreparationPack,
      lunaPreparationCount: lunaPreparationPack.length,
      items
    };
    window.__AAR_RESERVATION_CONTROL = payload;
    persistLunaPreparationPack(payload.lunaPreparationPack || []);
    persistPayload(payload);
    window.__AAR_INVALIDATE_HOTEL_MEMORY_ROWS?.();
    window.HOTEL_RUNTIME?.buildRuntime?.();
    render();
    window.__AAR_REFRESH_INDIV_FUSED_VIEW?.();
    return payload;
  }

  function loadPayload(options = {}){
    if (!options.reloadFromStorage && window.__AAR_RESERVATION_CONTROL) return window.__AAR_RESERVATION_CONTROL;
    const payload = safeJsonParse(localStorage.getItem(LS_RESERVATION_CONTROL) || 'null', null);
    if (payload && Array.isArray(payload.items)) {
      window.__AAR_RESERVATION_CONTROL = payload;
      return payload;
    }
    return { version: 2, importedAt: '', count: 0, items: [] };
  }

  function refreshSofaRules(options = {}){
    const payload = loadPayload({ reloadFromStorage:!!options.reloadFromStorage });
    if (!Array.isArray(payload?.items) || !payload.items.length) return payload;
    const rules = loadRules();
    const sofaRulesSignature = currentSofaRulesSignature(rules);
    const sofaRulesChanged = payload.sofaRulesSignature !== sofaRulesSignature;
    const multiRoomEntries = payload.items.map((item, idx)=>buildMultiRoomEntryFromItem(item, idx));
    const multiRoomCoverage = buildMultiRoomCoverage(multiRoomEntries);
    const multiRoomMetadataChanged = payload.items.some((item, idx)=>{
      const entryKey = multiRoomEntries[idx]?.entryKey || '';
      return !hasMatchingMultiRoomMetadata(
        item?.reservationControl,
        multiRoomCoverage.get(entryKey) || null
      );
    });
    if (!options.force && !sofaRulesChanged && !multiRoomMetadataChanged) {
      render();
      return payload;
    }
    const items = payload.items.map((item, idx) => {
      const original = item?.reservationControl || {};
      const entryKey = multiRoomEntries[idx]?.entryKey || '';
      const multiRoomContext = multiRoomCoverage.get(entryKey) || null;
      const sofaCalculation = window.ORIS_SOFA_ENGINE?.calculate?.({
        adults: item?.adults,
        children: item?.children,
        babyDetected: !!original.babyDetected,
        roomType: item?.roomType,
        sofaRules: rules.sofa,
        multiRoomContext
      }) || {};
      const reservationControl = {
        ...original,
        sofaNeed: Number(sofaCalculation.sofaNeed || 0),
        sofaRuleNeed: Number(sofaCalculation.ruleNeed || 0),
        babyPlusOneSofaRule: !!sofaCalculation.babyPlusOneSofaRule,
        sofaCapacity: Number(sofaCalculation.sofaCapacity || 0),
        maxOccupants: Number(sofaCalculation.maxOccupants || 0),
        capacityAlert: !!sofaCalculation.hasAlert,
        capacityAlertLevel: sofaCalculation.alertLevel || '',
        capacityAlertCode: sofaCalculation.alertCode || '',
        capacityAlertReason: sofaCalculation.alertReason || '',
        capacityAlertTechnicalReason: sofaCalculation.alertTechnicalReason || '',
        ...buildMultiRoomControlMetadata(multiRoomContext)
      };
      reservationControl.summary = buildReservationControlSummary(reservationControl);
      const aiItems = (Array.isArray(item?.aiItems) ? item.aiItems : []).map(ai => {
        if (!sofaRulesChanged) return ai;
        if (String(ai?.controlType || '').trim().toLowerCase() !== 'sofa') return ai;
        return {
          ...ai,
          sofaRuleStale:true,
          sofaRuleStaleAt:new Date().toISOString()
        };
      });
      const next = {
        ...item,
        reservationControl,
        automaticControls: buildAutomaticControls(reservationControl),
        aiItems
      };
      next.alerts = buildAlerts(next);
      return next;
    });
    const nextPayload = {
      ...payload,
      ...(sofaRulesChanged ? { rulesUpdatedAt: new Date().toISOString() } : {}),
      sofaRulesSignature,
      multiRoomCoverageVersion: MULTI_ROOM_COVERAGE_VERSION,
      multiRoomCoverageUpdatedAt: new Date().toISOString(),
      items
    };
    nextPayload.lunaPreparationPack = buildLunaPreparationPack(items);
    nextPayload.lunaPreparationCount = nextPayload.lunaPreparationPack.length;
    window.__AAR_RESERVATION_CONTROL = nextPayload;
    persistLunaPreparationPack(nextPayload.lunaPreparationPack);
    persistPayload(nextPayload);
    window.__AAR_INVALIDATE_HOTEL_MEMORY_ROWS?.();
    window.HOTEL_RUNTIME?.buildRuntime?.();
    render();
    if (options.refreshViews !== false) {
      window.__AAR_REFRESH_INDIV_FUSED_VIEW?.();
      refreshAssistantView();
    }
    return nextPayload;
  }

  function containsKeywordToken(text, keywords){
    const clean = ` ${cleanKeywordHaystack(text)} `;
    return (Array.isArray(keywords) ? keywords : []).some(k => {
      const token = cleanKeywordHaystack(k);
      return token && clean.includes(` ${token} `);
    });
  }

  function findValidationEvidence(text, keywords){
    const source = cleanText(text || '');
    if (!source) return '';
    const rawSegments = source
      .replace(/<br\s*\/?>(\s*)/gi, ' | ')
      .replace(/<[^>]*>/g, ' ')
      .split(/\s+\|\s+|\s+-\s+(?=[A-Z]\/[A-Z]+:)|(?=\b[RS]\/INTERN:)|(?=\bR\/CLIENT:)|(?=\bR\/HOTEL:)/i)
      .map(seg => cleanText(seg))
      .filter(Boolean);
    const segments = rawSegments.length ? rawSegments : [source];
    const matching = segments.filter(seg => containsKeywordToken(seg, keywords));
    if (!matching.length) return '';

    const intern = matching.find(seg => /\bS\/INTERN\b|\bR\/INTERN\b/i.test(seg));
    const clientDirect = matching.find(seg => /\bR\/CLIENT\b/i.test(seg) && !/children\s+age/i.test(seg));
    const direct = matching.find(seg => !/children\s+age/i.test(seg));
    const chosen = intern || clientDirect || direct || matching[0];
    const maxLength = 360;
    if (chosen.length <= maxLength) return chosen;

    const normalizedChosen = stripAccentsLower(chosen);
    const matchedKeyword = (Array.isArray(keywords) ? keywords : [])
      .map(keyword => stripAccentsLower(cleanText(keyword || '')).trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .find(keyword => normalizedChosen.includes(keyword));
    const keywordIndex = matchedKeyword ? normalizedChosen.indexOf(matchedKeyword) : 0;
    const keywordLength = matchedKeyword?.length || 0;
    const desiredCenter = keywordIndex + Math.floor(keywordLength / 2);
    let start = Math.max(0, desiredCenter - Math.floor(maxLength / 2));
    let end = Math.min(chosen.length, start + maxLength);
    start = Math.max(0, end - maxLength);

    const excerpt = chosen.slice(start, end).trim();
    return `${start > 0 ? '…' : ''}${excerpt}${end < chosen.length ? '…' : ''}`;
  }

  function compactLunaCommentFields(comments){
    const out = {};
    ['message'].forEach(key => {
      const value = cleanText(comments?.[key] || '');
      if (value) out[key] = value;
    });
    return out;
  }

  function buildLunaLocalFacts(item, comments){
    const original = item?.reservationControl || {};
    const commentSource = comments.message || '';
    const normalized = stripAccentsLower(commentSource);
    const rules = loadRules();
    const keywordHaystack = cleanKeywordHaystack(commentSource);
    const commRegex = buildKeywordRegex(rules.keywords?.comm || []);
    const dayUseRegex = buildKeywordRegex(rules.keywords?.dayuse || []);
    const earlyRegex = buildKeywordRegex(rules.keywords?.early || []);
    const bathDetected = normalized.includes('baignoire') || /\bbath\b|\btub\b/.test(normalized);
    const elevatorExplicit = /\bascenseur\b|\belevator\b|\blift\b/i.test(commentSource);
    return {
      babyDetected: hasBabyRequest(commentSource, rules),
      sofaNeed: Number(original.sofaNeed || 0),
      sofaRuleNeed: Number(original.sofaRuleNeed || 0),
      babyPlusOneSofaRule: hasBabyRequest(commentSource, rules) && !!original.babyPlusOneSofaRule,
      sofaCapacity: Number(original.sofaCapacity || 0),
      maxOccupants: Number(original.maxOccupants || 0),
      capacityAlert: !!original.capacityAlert,
      capacityAlertLevel: original.capacityAlertLevel || '',
      capacityAlertReason: original.capacityAlertReason || '',
      capacityAlertTechnicalReason: original.capacityAlertTechnicalReason || '',
      communicatingDetected: !!(commRegex && commRegex.test(keywordHaystack)),
      dayUseDetected: !!(dayUseRegex && dayUseRegex.test(keywordHaystack)),
      earlyDetected: !!(earlyRegex && earlyRegex.test(keywordHaystack)),
      bathDetected,
      elevatorExplicit,
      roomPref: '',
      arrivalHour: original.arrivalHour || '',
      explicitSofaComment: hasExplicitSofaComment(commentSource)
    };
  }

  function buildLunaValidationTargets(item, comments){
    const commentSource = comments.message || '';
    if (!commentSource) return [];
    const rules = loadRules();
    const existing = Array.isArray(item?.validationTargets) ? item.validationTargets : [];
    const configs = [
      {
        controlType: 'baby_bed',
        enabled: !!item?.reservationControl?.babyDetected,
        label: 'LIT BEBE',
        keywords: rules.keywords?.baby || []
      },
      {
        controlType: 'communicating_room',
        enabled: !!item?.reservationControl?.communicatingDetected,
        label: 'COMMUNIQUANTE',
        keywords: rules.keywords?.comm || []
      }
    ];
    return configs.flatMap(config => {
      if (!config.enabled) return [];
      const evidence = findValidationEvidence(commentSource, config.keywords);
      if (!evidence) return [];
      const previous = existing.find(target => target?.controlType === config.controlType) || {};
      return [{
        validationTargetId: cleanText(previous.validationTargetId || `${item.id}::${config.controlType}`),
        controlType: config.controlType,
        expectedValue: 'true',
        orisDisplayedLine: cleanText(previous.orisDisplayedLine || `${config.label} : ${item.guestName || ''}`),
        orisTriggerText: cleanText(evidence),
        orisTriggerKeyword: '',
        evidenceCandidate: cleanText(evidence)
      }];
    });
  }

  function reservationNameKeys(name){
    const full = stripAccentsLower(String(name || '').trim());
    const formatted = stripAccentsLower(formatGuestName(name || ''));
    const keys = new Set([full, formatted].filter(Boolean));
    [full, formatted].forEach(value => {
      const first = String(value || '').split(/\s+/)[0];
      if (first) keys.add(first);
    });
    return Array.from(keys);
  }

  function strongReservationNameKeys(name){
    const particles = new Set(['de','du','des','van','von','da','di','del','della','le','la']);
    return reservationNameKeys(name)
      .map(key => String(key || '').trim())
      .filter(key => {
        if (!key) return false;
        if (key.length < 3) return false;
        if (particles.has(key)) return false;
        return true;
      });
  }

  function getOrisIndivEvidence(item, type){
    const store = window.__AAR_ORIS_INDIV_DAY_CONTROL || {};
    const day = store[String(item?.arrivalDate || '')];
    if (!day) return null;
    const bucket = type === 'baby' ? day.baby : day.comm;
    if (!Array.isArray(bucket) || !bucket.length) return null;

    const itemId = String(item?.id || '').trim();
    if (itemId) {
      const exact = bucket.find(entry => String(entry?.reservationId || '').trim() === itemId);
      if (exact) return exact;
      const hasModernIds = bucket.some(entry => String(entry?.reservationId || '').trim());
      if (hasModernIds) return null;
    }

    const wanted = new Set(strongReservationNameKeys(item?.guestName || ''));
    if (!wanted.size) return null;
    return bucket.find(entry => {
      const entryName = typeof entry === 'string' ? entry : entry?.name;
      return strongReservationNameKeys(entryName).some(k => wanted.has(k));
    }) || null;
  }

  function buildFallbackValidationTarget(item, controlType){
    const comments = item?.comments || {};
    const source = String(comments.message || '');
    const rules = loadRules();
    const keywords = controlType === 'baby_bed'
      ? (rules.keywords?.baby || [])
      : (rules.keywords?.comm || []);
    const evidence = findValidationEvidence(source, keywords) || source;
    const label = controlType === 'baby_bed' ? 'LIT BEBE' : 'COMMUNIQUANTE';
    return {
      validationTargetId: `${item?.id || ''}::${controlType}`,
      controlType,
      expectedValue: 'true',
      orisDisplayedLine: `${label} : ${item?.guestName || ''}`,
      orisTriggerText: '',
      orisTriggerKeyword: '',
      evidenceCandidate: cleanText(evidence || '')
    };
  }

  function buildOrisValidationTargets(item){
    const targets = [];
    const babyEvidence = getOrisIndivEvidence(item, 'baby');
    if (babyEvidence) {
      targets.push({
        validationTargetId: cleanText(babyEvidence.validationTargetId || `${item.id}::baby_bed`),
        controlType: 'baby_bed',
        expectedValue: 'true',
        orisDisplayedLine: cleanText(babyEvidence.orisLine || `LIT BEBE : ${babyEvidence.name || item.guestName || ''}`),
        orisTriggerText: cleanText(babyEvidence.triggerText || ''),
        orisTriggerKeyword: cleanText(babyEvidence.triggerKeyword || ''),
        evidenceCandidate: cleanText(babyEvidence.proof || '')
      });
    } else if (item?.reservationControl?.babyDetected) {
      targets.push(buildFallbackValidationTarget(item, 'baby_bed'));
    }
    const commEvidence = getOrisIndivEvidence(item, 'comm');
    if (commEvidence) {
      targets.push({
        validationTargetId: cleanText(commEvidence.validationTargetId || `${item.id}::communicating_room`),
        controlType: 'communicating_room',
        expectedValue: 'true',
        orisDisplayedLine: cleanText(commEvidence.orisLine || `COMMUNIQUANTE : ${commEvidence.name || item.guestName || ''}`),
        orisTriggerText: cleanText(commEvidence.triggerText || ''),
        orisTriggerKeyword: cleanText(commEvidence.triggerKeyword || ''),
        evidenceCandidate: cleanText(commEvidence.proof || '')
      });
    } else if (item?.reservationControl?.communicatingDetected) {
      targets.push(buildFallbackValidationTarget(item, 'communicating_room'));
    }
    return targets;
  }

  function buildBoostRecords(){
    const payload = loadPayload();
    const period = activePeriod();
    const rules = loadRules();
    return (payload.items || [])
      .filter(item => !item.groupName && !/^grp\s*-?$/i.test(String(item.roomNumber || '').trim()))
      .filter(item => inPeriod(item, period))
      .map(item => {
        const comments = compactLunaCommentFields(item.comments);
        const localFacts = buildLunaLocalFacts(item, comments);
        const validationTargets = buildLunaValidationTargets(item, comments);
        const automaticControls = buildAutomaticControls(localFacts)
          .filter(control => control.control !== 'room_preference');
        const reservationControl = automaticControls.length
          ? automaticControls.map(control => `${control.control}: ${control.value}`).join(' | ')
          : 'Aucun controle particulier dans les commentaires';
        return {
          reservationId: item.id,
          folsReservationId: item.folsReservationId || item.reservationId || '',
          reservationLineKey: item.reservationLineKey || item.id || '',
          sourceRowIndex: item.sourceRowIndex || '',
          guestName: item.guestName,
          arrivalDate: item.arrivalDate,
          roomType: item.roomType,
          roomNumber: item.roomNumber,
          occupants: { adults: item.adults, children: item.children },
          reservationControl,
          localFacts,
          automaticControls,
          validationTargets,
          comments
        };
      })
      .filter(item => Object.keys(item.comments || {}).length > 0);
  }

  function buildLlmRequestModel(boostRecords = buildBoostRecords()){
    const records = (Array.isArray(boostRecords) ? boostRecords : []).filter(item => Object.keys(item.comments || {}).length > 0);
    const period = activePeriod();
    const payload = loadPayload();
    const hotelRuntime = window.HOTEL_RUNTIME?.buildRuntime?.();
    const hotelKnowledge = window.HOTEL_RUNTIME?.buildHotelKnowledgeBase?.(hotelRuntime) || {};
    const preparedLunaPack = records.flatMap(record => {
      return (Array.isArray(record.validationTargets) ? record.validationTargets : []).map(target => ({
        reservationId: record.reservationId,
        folsReservationId: record.folsReservationId,
        reservationLineKey: record.reservationLineKey,
        sourceRowIndex: record.sourceRowIndex,
        validationTargetId: target.validationTargetId,
        guestName: record.guestName,
        arrivalDate: record.arrivalDate,
        roomType: record.roomType,
        roomNumber: record.roomNumber,
        controlType: target.controlType,
        orisDisplayedLine: target.orisDisplayedLine,
        orisTriggerText: target.orisTriggerText,
        orisTriggerKeyword: target.orisTriggerKeyword,
        commentExtract: target.evidenceCandidate,
        evidenceCandidate: target.evidenceCandidate
      }));
    });

    const userPayload = {
      task: 'Appliquer strictement la grille de decision aux commentaires FOLS et auditer tous les validationTargets.',
      hotel: 'Novotel Marne-la-Vallée Collégien',
      hotelContext: hotelKnowledge,
      period,
      importWindow: {
        start: payload.windowStart || '',
        end: payload.windowEnd || ''
      },
      dataSource: {
        principle: 'comments.message est l unique commentaire et l unique source autorisee pour comprendre une demande ou une action.',
        source: 'Import FOLS > Message',
        reservationsCount: records.length,
        preparedAtImport: true,
        lunaPreparationPackCount: preparedLunaPack.length,
        mandatoryValidationTargets: records.reduce((sum, record) => sum + (Array.isArray(record.validationTargets) ? record.validationTargets.length : 0), 0)
      },
      lunaPreparationPack: preparedLunaPack,
      responseSchema: LLM_RESPONSE_SCHEMA,
      reservations: records
    };

    return {
      model: 'gpt-5.6-luna',
      modelHint: 'gpt-5.6-luna',
      responseFormat: 'json_object',
      maxOutputTokens: Math.min(16000, Math.max(1600, records.length * 180)),
      messages: [
        { role: 'system', content: LLM_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userPayload) }
      ],
      meta: {
        reservationsCount: records.length,
        period,
        builtAt: new Date().toISOString(),
        source: 'hotel-ia',
        expectsStructuredAudit: true,
        sofaRulesSignature: currentSofaRulesSignature()
      }
    };
  }

  function normalizeLlmItems(resultPayload){
    const structuredItems = [
      ...(Array.isArray(resultPayload?.controlAudits) ? resultPayload.controlAudits.map(item => ({ ...item, kind: 'control_audit' })) : []),
      ...(Array.isArray(resultPayload?.operationNotes) ? resultPayload.operationNotes.map(item => ({ ...item, kind: 'operation_note' })) : [])
    ];
    const rawItems = structuredItems.length ? structuredItems :
      Array.isArray(resultPayload?.usefulItems) ? resultPayload.usefulItems :
      Array.isArray(resultPayload?.items) ? resultPayload.items :
      Array.isArray(resultPayload?.commentInsights) ? resultPayload.commentInsights :
      Array.isArray(resultPayload?.insights) ? resultPayload.insights : [];

    const normalized = rawItems.map(item => {
      const controlType = String(item.controlType || item.control || item.type || '').trim();
      const rawKind = String(item.kind || item.category || '').trim();
      const comparisonStatus = String(item.comparisonStatus || item.status || 'new_info').trim();
      const kind = rawKind === 'control_audit' || rawKind === 'operation_note'
        ? rawKind
        : (controlType === 'baby_bed' || controlType === 'communicating_room' || comparisonStatus !== 'new_info' ? 'control_audit' : 'operation_note');
      const normalizedStatus = kind === 'operation_note' && comparisonStatus === 'confirmed' ? 'new_info' : comparisonStatus;
      const validationTargetId = String(item.validationTargetId || item.targetId || '').trim();
      const reservationId = String(item.reservationId || '').trim() || validationTargetId.split('::')[0] || '';
      return ({
      reservationId,
      validationTargetId,
      priority: String(item.priority || 'medium').trim(),
      kind,
      controlType,
      comparisonStatus: normalizedStatus,
      quote: String(item.quote || item.sourceComment || item.evidence || '').trim(),
      reservationControl: String(item.reservationControl || '').trim(),
      result: String(item.result || item.summary || item.intelligentAnalysis || item.recommendedAction || '').trim(),
      confidence: String(item.confidence || 'medium').trim(),
      source: 'llm'
    });
    }).filter(item => item.reservationId && (item.quote || item.result));

    const kindRank = item => item.kind === 'control_audit' ? 0 : 1;
    const statusRank = item => ({ conflict: 0, unclear: 1, confirmed: 2, new_info: 3 }[item.comparisonStatus] ?? 4);
    return normalized.sort((a, b) =>
      kindRank(a) - kindRank(b) ||
      String(a.reservationId).localeCompare(String(b.reservationId)) ||
      statusRank(a) - statusRank(b) ||
      String(a.controlType).localeCompare(String(b.controlType)) ||
      String(a.quote).localeCompare(String(b.quote)) ||
      String(a.result).localeCompare(String(b.result))
    );
  }

  function filterLlmItemsForReservation(llmItems, reservationItem){
    const validationTargets = Array.isArray(reservationItem.validationTargets) && reservationItem.validationTargets.length
      ? reservationItem.validationTargets
      : buildOrisValidationTargets(reservationItem);
    const targets = new Set(validationTargets
      .map(control => String(control.controlType || control.control || '').trim())
      .filter(Boolean));
    const targetIds = new Set(validationTargets
      .map(control => String(control.validationTargetId || '').trim())
      .filter(Boolean));
    const controlTypesRequiringTarget = new Set(['baby_bed', 'communicating_room']);
    return (Array.isArray(llmItems) ? llmItems : []).filter(ai => {
      const controlType = String(ai.controlType || '').trim();
      if (!controlTypesRequiringTarget.has(controlType)) return true;
      const targetId = String(ai.validationTargetId || '').trim();
      if (targetId && targetIds.size) return targetIds.has(targetId);
      if (!targets.has(controlType)) return false;
      return true;
    });
  }

  function isLunaControlAudit(ai){
    const kind = String(ai?.kind || '').trim();
    const type = String(ai?.controlType || ai?.control || '').trim();
    return kind === 'control_audit' || type === 'baby_bed' || type === 'communicating_room';
  }

  function countAppliedLunaItems(payload, period = activePeriod()){
    const stats = { total: 0, comments: 0, controls: 0 };
    if (!payload || !Array.isArray(payload.items)) return stats;
    payload.items.forEach(item => {
      if (!inPeriod(item, period)) return;
      (Array.isArray(item.aiItems) ? item.aiItems : []).forEach(ai => {
        stats.total += 1;
        if (isLunaControlAudit(ai)) stats.controls += 1;
        else stats.comments += 1;
      });
    });
    return stats;
  }

  function lunaAppliedMessage(stats){
    const commentPart = `${stats.comments} commentaire${stats.comments > 1 ? 's' : ''} utile${stats.comments > 1 ? 's' : ''} affiche${stats.comments > 1 ? 's' : ''}`;
    const controlPart = stats.controls ? ` + ${stats.controls} verification${stats.controls > 1 ? 's' : ''} controle` : '';
    return `Analyse Luna terminee - ${commentPart}${controlPart}`;
  }

  function refreshAssistantView(){
    if (typeof window.ORIS_ASSISTANT?.refresh === 'function') {
      window.ORIS_ASSISTANT.refresh();
      return;
    }
    const host = document.getElementById('assistant-output');
    if (host && typeof window.ORIS_ASSISTANT?.render === 'function') {
      window.ORIS_ASSISTANT.render(host);
    }
  }

  function lunaDedupeText(value){
    return stripAccentsLower(value || '')
      .replace(/[“”"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function lunaDedupeKey(reservationItem, ai){
    return [
      String(reservationItem?.arrivalDate || ''),
      lunaDedupeText(reservationItem?.guestName || ''),
      lunaDedupeText(ai?.validationTargetId || ''),
      lunaDedupeText(ai?.controlType || ai?.kind || ''),
      lunaDedupeText(ai?.quote || ''),
      lunaDedupeText(ai?.result || ai?.summary || ai?.recommendedAction || '')
    ].join('|');
  }

  function clearAiItemsForPeriod(payload, period = activePeriod()){
    if (!payload || !Array.isArray(payload.items)) return payload;
    payload.items = payload.items.map(item => {
      if (!inPeriod(item, period)) return item;
      if (!Array.isArray(item.aiItems) || !item.aiItems.length) return item;
      const next = { ...item, aiItems: [] };
      next.alerts = buildAlerts(next);
      return next;
    });
    return payload;
  }

  function applyLlmResult(resultPayload){
    const payload = loadPayload();
    const period = activePeriod();
    const llmItems = normalizeLlmItems(resultPayload);
    if (!payload?.items?.length) {
      window.ORIS_ASSISTANT?.resolveNotification?.('boost', 'Analyse Luna terminee - aucune donnee chargee');
      return payload;
    }

    clearAiItemsForPeriod(payload, period);

    if (!llmItems.length) {
      window.__AAR_RESERVATION_CONTROL = payload;
      persistPayload(payload);
      window.HOTEL_RUNTIME?.buildRuntime?.();
      render();
      window.__AAR_REFRESH_INDIV_FUSED_VIEW?.();
      window.__AAR_LAST_LUNA_APPLY_STATS = countAppliedLunaItems(payload, period);
      refreshAssistantView();
      window.ORIS_ASSISTANT?.resolveNotification?.('boost', 'Analyse Luna terminee - aucun dossier utile');
      return payload;
    }

    const byIdMap = new Map();
    llmItems.forEach(item => {
      if (!byIdMap.has(item.reservationId)) byIdMap.set(item.reservationId, []);
      byIdMap.get(item.reservationId).push(item);
    });

    let appliedCount = 0;
    const seenAiKeys = new Set();
    payload.items = payload.items.map(item => {
      if (!inPeriod(item, period)) return item;
      const rawAiItems = byIdMap.get(String(item.id)) || [];
      const aiItems = filterLlmItemsForReservation(rawAiItems, item).filter(ai => {
        const key = lunaDedupeKey(item, ai);
        if (seenAiKeys.has(key)) return false;
        seenAiKeys.add(key);
        return true;
      });
      if (!aiItems.length) return item;
      appliedCount += aiItems.length;
      const next = { ...item, aiItems };
      next.alerts = buildAlerts(next);
      return next;
    });

    window.__AAR_RESERVATION_CONTROL = payload;
    persistLunaPreparationPack(payload.lunaPreparationPack || []);
    persistPayload(payload);
    window.HOTEL_RUNTIME?.buildRuntime?.();
    render();
    window.__AAR_REFRESH_INDIV_FUSED_VIEW?.();
    window.__AAR_LAST_LUNA_APPLY_STATS = countAppliedLunaItems(payload, period);
    refreshAssistantView();
    window.ORIS_ASSISTANT?.resolveNotification?.('boost', lunaAppliedMessage(window.__AAR_LAST_LUNA_APPLY_STATS));
    return payload;
  }

  function applyLlmValidations(resultPayload){
    return applyLlmResult(resultPayload);
  }

  function apiBaseUrl(){
    const explicit = String(window.ORIS_API_BASE || localStorage.getItem('oris_api_base') || '').trim().replace(/\/+$/, '');
    if (explicit) return explicit;
    if (window.location.protocol === 'file:') return 'http://127.0.0.1:8787';
    return '';
  }

  function apiUrl(path){
    const base = apiBaseUrl();
    return `${base}${path}`;
  }

  function humanFetchError(err){
    const raw = err?.message || String(err || '');
    if (/failed to fetch|load failed|networkerror/i.test(raw)) {
      if (window.location.protocol === 'file:') {
        return 'API locale inaccessible. Ouvre ORIS via start-oris.bat ou lance le serveur local, puis retente Analyse Luna.';
      }
      return 'API Analyse Luna inaccessible. Vérifie que le dernier déploiement Vercel est bien ouvert et que /api/health répond.';
    }
    return raw;
  }

  async function callBoostApi(requestModel){
    let response;
    try {
      response = await fetch(apiUrl('/api/boost-reservations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestModel)
      });
    } catch (err) {
      throw new Error(humanFetchError(err));
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `Erreur Luna ${response.status}`);
    }
    return payload;
  }

  async function runBoost(options = {}){
    if (isBoostInFlight()) return null;
    const note = options.noteEl || byId('reservation-control-ai-note');
    const statusEl = options.statusEl || null;
    const boostRecords = buildBoostRecords();
    if (!boostRecords.length) {
      if (note) note.textContent = 'Aucune reservation avec commentaire sur cette periode.';
      if (statusEl) statusEl.textContent = 'Aucun commentaire a envoyer a Analyse Luna.';
      window.AAR?.toast?.('Aucun commentaire a envoyer a Analyse Luna');
      return null;
    }

    setBoostInFlight(true);
    try {
      window.ORIS_ASSISTANT?.notifyPersistent?.('boost', `Analyse Luna en cours - ${boostRecords.length} reservation(s) envoyee(s)`);
      if (note) note.textContent = `Analyse Luna en cours : Luna lit ${boostRecords.length} reservation(s) avec commentaire(s)...`;
      if (statusEl) statusEl.textContent = `Analyse Luna en cours : ${boostRecords.length} reservation(s) envoyee(s) a Luna.`;

      const requestModel = buildLlmRequestModel(boostRecords);
      window.__AAR_RESERVATION_CONTROL_BOOST_RECORDS = boostRecords;
      window.__AAR_RESERVATION_CONTROL_LLM_REQUEST = requestModel;
      window.HOTEL_RUNTIME?.buildRuntime?.();

      const resultPayload = await callBoostApi(requestModel);
      window.__AAR_RESERVATION_CONTROL_LLM_RESPONSE = resultPayload;
      const requestSofaRulesSignature = String(requestModel?.meta?.sofaRulesSignature || '');
      const liveSofaRulesSignature = currentSofaRulesSignature();
      if (requestSofaRulesSignature && liveSofaRulesSignature && requestSofaRulesSignature !== liveSofaRulesSignature) {
        const staleText = 'Règles sofa modifiées pendant l’analyse : réponse Luna non appliquée. Relance l’analyse avec les règles actuelles.';
        window.__AAR_RESERVATION_CONTROL_LLM_DISCARDED = {
          at: new Date().toISOString(),
          reason: 'sofa_rules_changed',
          requestSofaRulesSignature,
          liveSofaRulesSignature
        };
        if (note) note.textContent = staleText;
        if (statusEl) statusEl.textContent = staleText;
        window.ORIS_ASSISTANT?.resolveNotification?.('boost', staleText);
        window.AAR?.toast?.(staleText);
        return { requestModel, resultPayload, payload:loadPayload(), discarded:true };
      }
      const nextPayload = applyLlmResult(resultPayload);
      const stats = window.__AAR_LAST_LUNA_APPLY_STATS || countAppliedLunaItems(nextPayload, activePeriod());
      const doneText = `${stats.comments} commentaire(s) affiché(s)` + (stats.controls ? ` + ${stats.controls} vérification(s) contrôle` : '');
      if (note) note.textContent = `Analyse Luna terminee : ${doneText}.`;
      if (statusEl) statusEl.textContent = `Analyse Luna terminee : ${doneText}.`;
      return { requestModel, resultPayload, payload: nextPayload };
    } catch (err) {
      const message = err?.message || String(err);
      if (note) note.textContent = `Analyse Luna erreur : ${message}`;
      if (statusEl) statusEl.textContent = `Analyse Luna erreur : ${message}`;
      window.ORIS_ASSISTANT?.resolveNotification?.('boost', `Analyse Luna erreur - ${message}`);
      window.AAR?.toast?.(`Analyse Luna impossible : ${message}`);
      return null;
    } finally {
      setBoostInFlight(false);
      render();
      window.__AAR_REFRESH_INDIV_FUSED_VIEW?.();
    }
  }

  function render(){
    const summary = byId('reservation-control-summary');
    const listHost = byId('reservation-control-list');
    const status = byId('reservation-control-status-text');
    const aiCount = byId('reservation-control-ai-count');
    const aiStart = byId('reservation-control-ai-start');
    const aiNote = byId('reservation-control-ai-note');
    if (!summary && !listHost && !status && !aiCount && !aiStart) return;
    const storedPayload = loadPayload();
    const liveSofaRulesSignature = currentSofaRulesSignature();
    if (
      Array.isArray(storedPayload?.items) &&
      storedPayload.items.length &&
      (
        storedPayload.sofaRulesSignature !== liveSofaRulesSignature ||
        storedPayload.multiRoomCoverageVersion !== MULTI_ROOM_COVERAGE_VERSION
      )
    ) {
      refreshSofaRules({ refreshViews:false, force:true });
      return;
    }

    const payload = storedPayload;
    const period = activePeriod();
    const filtered = (payload.items || [])
      .filter(item => inPeriod(item, period))
      .map(item => ({ ...item, alerts:buildAlerts(item) }));
    const withWarnings = filtered.filter(item => Array.isArray(item.alerts) && item.alerts.length);
    const boostRecords = buildBoostRecords();
    const importedLabel = payload.importedAt ? formatImportDate(payload.importedAt) : '—';
    const windowLabel = payload.windowStart && payload.windowEnd ? `${payload.windowStart} → ${payload.windowEnd}` : '';

    if (status) status.textContent = payload.count ? `${payload.count} réservation(s) chargée(s)` : 'En attente d’un import FOLS';
    if (aiCount) aiCount.textContent = boostRecords.length ? `${boostRecords.length} reservation(s) avec commentaire(s) sur cette periode.` : 'Aucune reservation avec commentaire sur cette periode.';
    if (aiStart) aiStart.disabled = !boostRecords.length || isBoostInFlight();
    if (aiNote && !payload.count) aiNote.textContent = 'Importe le portefeuille FOLS, choisis une période, puis lance l’analyse.';

    if (summary) {
      const highCount = withWarnings.reduce((sum, item)=>sum + (item.alerts || []).filter(a => a.priority === 'high').length, 0);
      const mediumCount = withWarnings.reduce((sum, item)=>sum + (item.alerts || []).filter(a => a.priority === 'medium').length, 0);
      summary.innerHTML = payload.count
        ? `<strong>${filtered.length}</strong> réservation(s) dans cette période.<br><span>${withWarnings.length} dossier(s) à traiter • ${highCount} urgent(s) • ${mediumCount} moyen(s) • import ${escapeHtml(importedLabel)}</span>`
        : 'Importe un portefeuille FOLS pour commencer.';
    }

    if (!listHost) return;
    listHost.innerHTML = '';

    if (!payload.count) {
      listHost.innerHTML = '<div class="reservation-control-empty">Aucun import FOLS chargé pour l’instant.</div>';
      return;
    }
    if (!withWarnings.length) {
      listHost.innerHTML = '<div class="reservation-control-empty">Analyse non lancée pour cette période, ou aucun dossier utile détecté.</div>';
      return;
    }

    withWarnings.slice(0, 100).forEach(item => {
      (item.alerts || []).forEach(alert => {
        const row = document.createElement('div');
        const warningClass = alert.warningLevel === 'critical'
          ? ' is-critical'
          : alert.warningLevel === 'capacity'
            ? ' is-capacity-warning'
            : '';
        row.className = `reservation-control-warning${warningClass}`;
        const meta = [
          item.arrivalDate || '',
          item.roomType || '',
          item.roomNumber ? `Ch. ${item.roomNumber}` : ''
        ].filter(Boolean).join(' • ');
        row.innerHTML = `
          <div class="reservation-control-warning-main">
            <strong>${escapeHtml(item.guestName)}</strong>
            ${meta ? `<small>${escapeHtml(meta)}</small>` : ''}
            ${alert.quote ? `<p>“${escapeHtml(alert.quote).slice(0, 240)}”</p>` : ''}
            ${alert.result ? `<div class="reservation-control-warning-title">${escapeHtml(alert.result).slice(0, 260)}</div>` : ''}
            ${alert.sofaRuleStale ? `<em>Règle sofa modifiée : relancer Luna pour confirmer cette note.</em>` : alert.comparisonStatus === 'conflict' ? `<em>À vérifier avant préparation.</em>` : ''}
          </div>
          <div class="reservation-control-warning-tags">
            <span class="is-${escapeHtml(alert.priority)}">${escapeHtml(alert.kind || alert.category || 'IA')}</span>
          </div>
        `;
        listHost.appendChild(row);
      });
    });
  }

  function bind(){
    document.querySelectorAll('[data-reservation-control-period]').forEach(btn=>{
      if (btn.dataset.reservationControlBound === '1') return;
      btn.dataset.reservationControlBound = '1';
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('[data-reservation-control-period]').forEach(x=>x.classList.remove('is-active'));
        btn.classList.add('is-active');
        const badge = byId('reservation-control-active-period');
        if (badge) badge.textContent = btn.textContent || 'Daily';
        render();
      });
    });

    const aiStart = byId('reservation-control-ai-start');
    if (aiStart && aiStart.dataset.reservationControlBound !== '1') {
      aiStart.dataset.reservationControlBound = '1';
      aiStart.addEventListener('click', ()=>runBoost({ noteEl: byId('reservation-control-ai-note') }));
    }
  }

  window.RESERVATION_CONTROL = {
    processRows,
    refreshSofaRules,
    hasBabyRequest: text => hasBabyRequest(text, loadRules()),
    render,
    buildBoostRecords,
    buildLlmRequestModel,
    runBoost,
    isBoostInFlight,
    setBoostInFlight,
    applyLlmResult,
    applyLlmValidations,
    applySemanticFindings: applyLlmResult,
    bind
  };

  bind();
  if (Array.isArray(window.__AAR_LAST_FOLS_ROWS) && window.__AAR_LAST_FOLS_ROWS.length) {
    processRows(window.__AAR_LAST_FOLS_ROWS);
  } else {
    const storedPayload = loadPayload({ reloadFromStorage:true });
    const storedItems = Array.isArray(storedPayload?.items) ? storedPayload.items : [];
    const sofaRulesSignature = currentSofaRulesSignature();
    if (
      storedItems.length &&
      (
        storedPayload.sofaRulesSignature !== sofaRulesSignature ||
        storedPayload.multiRoomCoverageVersion !== MULTI_ROOM_COVERAGE_VERSION
      )
    ) {
      refreshSofaRules({ refreshViews:false, force:true });
    }
  }
})();
