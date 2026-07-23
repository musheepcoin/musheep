(function(){
  const LS_RESERVATION_CONTROL = 'aar_reservation_control_v3';
  const LS_LUNA_PREPARATION_PACK = 'aar_luna_preparation_pack_v1';
  const LS_RESERVATION_CONTROL_OLD_KEYS = ['aar_reservation_control_v1', 'aar_reservation_control_v2'];
  const LS_RULES = 'aar_soiree_rules_v2';
  const SHARED_DEFAULT_KEYWORDS = window.ORIS_DEFAULT_KEYWORDS || {};

  const DEFAULT_RULES = {
    keywords: {
      baby: Array.isArray(SHARED_DEFAULT_KEYWORDS.baby) ? SHARED_DEFAULT_KEYWORDS.baby.slice() : [],
      comm: Array.isArray(SHARED_DEFAULT_KEYWORDS.comm) ? SHARED_DEFAULT_KEYWORDS.comm.slice() : [],
      dayuse: Array.isArray(SHARED_DEFAULT_KEYWORDS.dayuse) ? SHARED_DEFAULT_KEYWORDS.dayuse.slice() : ['day use','dayuse'],
      early: Array.isArray(SHARED_DEFAULT_KEYWORDS.early) ? SHARED_DEFAULT_KEYWORDS.early.slice() : []
    },
    baby_exclude: ['bébé?','bébé ?','bb?','bb ?'],
    sofa: {
      '1A+0E':'0','1A+1E':'1','1A+2E':'2','1A+3E':'2',
      '2A+0E':'0','2A+1E':'1','2A+2E':'2','2A+3E':'2',
      '3A+0E':'1','3A+1E':'2'
    }
  };

    const LLM_SYSTEM_PROMPT = [
    'ROLE',
    'Tu es Luna, assistante de lecture operationnelle pour une reception d hotel.',
    'Tu ne connais rien hors des donnees fournies. Tu n inventes jamais une information absente.',
    'Ton travail n est pas de detecter des mots-cles : ton travail est de comprendre le sens humain des commentaires FOLS.',
    '',
    'MISSION PRINCIPALE',
    '1. Lire les vrais commentaires de reservation et ne remonter que ce qui aide concretement la reception, l attribution, la gouvernante, la preparation ou la logistique.',
    '2. Si ORIS fournit des validationTargets, auditer ces controles separement avec un statut machine.',
    '3. Eviter le bruit. Si une information ne change aucune action, ne la retourne pas.',
    '',
    'SOURCES ET PRIORITES',
    '- comments.message est la source principale. C est le vrai commentaire a lire.',
    '- validationTargets.evidenceCandidate est la source principale pour auditer un controle local ORIS.',
    '- comments.arrivalHour est seulement un contexte, sauf heure vraiment operationnelle.',
    '- GUES_PREF / preferences / message_html ne sont jamais lus, jamais transmis et jamais utilises comme source.',
    '- Si plusieurs sources existent, privilegie toujours le texte le plus explicite dans comments.message ou evidenceCandidate.',
    '',
    'SORTIE ATTENDUE',
    '- Retourne uniquement du JSON valide.',
    '- Racine obligatoire : {"controlAudits":[],"operationNotes":[]}.',
    '- controlAudits = uniquement les reponses aux validationTargets ORIS.',
    '- operationNotes = uniquement les commentaires utiles hors validationTargets.',
    '- Ne mets jamais le meme sujet dans les deux listes.',
    '',
    'A. AUDIT DES CONTROLES ORIS',
    '- Chaque validationTarget doit produire exactement un item dans controlAudits.',
    '- Recopie reservationId et validationTargetId exactement.',
    '- kind doit etre "control_audit".',
    '- comparisonStatus est obligatoire : confirmed, conflict ou unclear.',
    '- confirmed = le commentaire valide clairement le controle ORIS.',
    '- conflict = le commentaire ne valide pas le controle, le contredit, ou montre un faux positif.',
    '- unclear = seulement si le texte est illisible, tronque ou impossible a trancher.',
    '- Le site utilise comparisonStatus pour les badges. Ne cache jamais un verdict dans result.',
    '- Ne cree jamais un audit baby_bed ou communicating_room s il n existe pas dans validationTargets.',
    '',
    'COMMENT RAISONNER SUR LES CONTROLES',
    '- baby_bed : verifier si le commentaire demande vraiment un lit bebe / lit BB / lit b?b? / baby cot / crib / equipement bebe.',
    '- Children Age seul ne suffit pas a valider un lit bebe.',
    '- communicating_room : verifier si le commentaire demande vraiment des chambres communicantes, connectees, adjacentes, proches, cote a cote, meme etage ou organisees ensemble.',
    '- Une simple preference de confort ne valide pas une communicante.',
    '- sofa : sofaNeed est fourni par ORIS. Luna ne recalcule jamais les sofas. Luna remonte seulement si le commentaire ajoute, nuance ou contredit le besoin fourni.',
    '- Si le commentaire confirme exactement le meme sofa que ORIS, ne remonte rien sauf si c est lie a un audit lit bebe obligatoire.',
    '',
    'B. COMMENTAIRES UTILES A REMONTER',
    'Cette partie est prioritaire apres les audits obligatoires : lis comments.message comme un receptionniste experimente.',
    'Retourne une operation_note seulement si le commentaire cree une action ou une vigilance concrete.',
    '',
    'A REMONTER',
    '- Preparation speciale : petales, fleurs, chocolat, fraises, anniversaire, mariage, surprise, decoration, romantique, attention particuliere.',
    '- Lit bebe, couchage enfant, sofa si le commentaire apporte une nuance utile.',
    '- Chambre proche, communicante, cote a cote, meme etage, vraie twin, grand lit, baignoire/douche si c est une demande explicite dans comments.message.',
    '- Chambre precise seulement si la demande vient de comments.message.',
    '- Contrainte reception : arrivee tres tot, arrivee apres 23h, client a rappeler, confirmation/annulation demandee, point sensible.',
    '- Logistique speciale : bus, car, driver, camion, livraison, fauteuil, accessibilite, animal si action hotel.',
    '- Gouvernante/maintenance/preparation si une action concrete est demandee.',
    '- Plainte ou risque relationnel client.',
    '',
    'A IGNORER',
    '- GUES_PREF / preference FOLS seule : ne jamais remonter.',
    '- Heure d arrivee seule entre 12h00 et 23h00 : ne pas remonter.',
    '- Horaire standard de day use, par exemple 10h-16h, si aucune autre action n est demandee.',
    '- Description standard chambre/couchage : lit double, canape-lit, sofa bed, non-fumeur, online check-in.',
    '- Parking standard ou parking gratuit, sauf bus/car/driver/camion/vehicule special.',
    '- VCC, paiement, prepay, arrhes, garantie, DO NOT CHARGE, Genius Booker, OTA standard.',
    '- OTA Desync, Room Closed, chambre fermee, probleme technique OTA/PMS, sauf vraie demande client ou action reception explicite.',
    '',
    'DEDUPLICATION ET STABILITE',
    '- Ne retourne jamais deux fois le meme guestName avec la meme quote et le meme result.',
    '- Pour un dossier multi-chambres avec une consigne commune, retourne un seul item.',
    '- Une operation_note = une intention operationnelle distincte.',
    '- Si l action n est pas claire, ignore plutot que de creer du bruit.',
    '- Conserve l ordre des reservations recues : d abord controlAudits, puis operationNotes.',
    '- Si deux analyses recoivent les memes donnees, elles doivent produire les memes decisions autant que possible.',
    '',
    'CITATION ET FORMULATION',
    '- quote doit etre une citation exacte courte issue de evidenceCandidate ou comments.message.',
    '- quote ne doit jamais etre une reformulation.',
    '- Pour une operation_note, sourceField doit etre "message" ou "arrivalHour".',
    '- result doit etre court, naturel et directement exploitable.',
    '- Utilise ces familles : "Preparation : ...", "Attribution : ...", "Reception : ...", "Logistique : ...", "A verifier : ...".',
    '- Ne dis pas "selon le systeme", "analyse intelligente", "le commentaire confirme exactement".',
    '',
    'FORMAT DES ITEMS',
    '- Champs obligatoires par item : reservationId, priority, kind, controlType, comparisonStatus, quote, reservationControl, result, confidence, sourceField.',
    '- controlAudits : validationTargetId obligatoire, kind="control_audit", comparisonStatus="confirmed|conflict|unclear".',
    '- operationNotes : kind="operation_note", comparisonStatus="new_info", validationTargetId vide sauf lien explicite avec un validationTarget.',
    '- Priorites autorisees : low, medium, high.',
    '- controlType autorises : baby_bed, communicating_room, sofa, room_preference, arrival_time, day_use, preparation, reception, logistics, housekeeping, maintenance, other.',
    '- Si rien n est utile et aucun validationTarget n existe : {"controlAudits":[],"operationNotes":[]}.'
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
        confidence: 'low|medium|high',
        sourceField: 'validationTarget|message|arrivalHour'
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
        confidence: 'low|medium|high',
        sourceField: 'message|arrivalHour'
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
      sofa: { ...DEFAULT_RULES.sofa, ...(stored.sofa || {}) }
    };
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

  function buildReservationControl(row, rules, rx, comments, adults, children){
    const sourceText = [comments.message, comments.arrivalHour].filter(Boolean).join(' | ');
    const haystack = cleanKeywordHaystack(sourceText);
    const raw = stripAccentsLower(sourceText);

    const baby = Number(row.__bf || 0) > 0 || hasBabyRequest(sourceText, rules);
    const comm = Number(row.__cf || 0) > 0 || !!(rx.comm && rx.comm.test(haystack));
    const dayUse = Number(row.__df || 0) > 0 || !!(rx.dayuse && rx.dayuse.test(haystack));
    const early = Number(row.__ef || 0) > 0 || !!(rx.early && rx.early.test(haystack));
    const bath = raw.includes('baignoire') || /\bbath\b|\btub\b/.test(raw);
    const explicitText = comments.message || '';
    const elevatorExplicit = /\bascenseur\b|\belevator\b|\blift\b/i.test(explicitText);
    const sofaRuleNeed = Number(rules.sofa[`${adults}A+${children}E`] || 0);
    const babyPlusOneSofaRule = baby && (adults + children) === 4;
    const sofaNeed = babyPlusOneSofaRule ? 1 : sofaRuleNeed;

    const labels = [];
    if (babyPlusOneSofaRule) labels.push('Lit bébé + 1 sofa');
    else if (baby) labels.push('Lit bébé');
    else if (sofaNeed) labels.push(`${sofaNeed} sofa${sofaNeed > 1 ? 's' : ''}`);
    if (comm) labels.push('Communicante');
    if (dayUse) labels.push('Day use');
    if (early) labels.push('Arrivée prioritaire');
    if (bath) labels.push('Baignoire');
    if (comments.arrivalHour) labels.push(`Arrivée ${comments.arrivalHour}`);

    return {
      summary: labels.join(' • ') || 'Aucun contrôle particulier',
      babyDetected: baby,
      sofaNeed,
      sofaRuleNeed,
      babyPlusOneSofaRule,
      communicatingDetected: comm,
      dayUseDetected: dayUse,
      earlyDetected: early,
      bathDetected: bath,
      elevatorExplicit,
      arrivalHour: comments.arrivalHour || '',
      explicitSofaComment: hasExplicitSofaComment(comments.message || '')
    };
  }

  function buildAutomaticControls(control){
    const controls = [];
    const add = (name, value)=>controls.push({ control:name, value:String(value == null ? true : value) });
    if (control.babyDetected) add('baby_bed', true);
    if (control.communicatingDetected) add('communicating_room', true);
    if (control.dayUseDetected) add('day_use', true);
    if (control.earlyDetected) add('early_checkin', true);
    if (control.bathDetected) add('bath_preference', true);
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

    return (Array.isArray(rows) ? rows : []).map((row, idx)=>{
      const groupName = String(pick(row, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || '').trim();
      if (!isIndividualReservationRow(row)) return null;

      const guestRaw = pick(row, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) || '';
      const adults = parseInt(pick(row, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0', 10) || 0;
      const children = parseInt(pick(row, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0', 10) || 0;
      const message = cleanText(pick(row, ['Message','MESSAGE','message']));
      const arrivalHour = cleanText(pick(row, ['Arriv_Hour','ARRIV_HOUR','ARRIVAL_HOUR']));
      const hasRealCommentData = !!(message || arrivalHour);
      const comments = { message, arrivalHour };
      const control = buildReservationControl(row, rules, rx, comments, adults, children);
      const automaticControls = buildAutomaticControls(control);
      const folsReservationId = getFolsReservationBaseId(row, idx);
      const sourceRowIndex = getFolsSourceRowIndex(row, idx);
      const reservationLineKey = getFolsReservationLineKey(row, idx);

      const item = {
        id: reservationLineKey,
        reservationId: folsReservationId,
        folsReservationId,
        sourceRowIndex,
        reservationLineKey,
        guestName: formatGuestName(guestRaw) || String(guestRaw || '').trim() || 'Client sans nom',
        arrivalDate: getDateKey(row, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']),
        departureDate: getDateKey(row, ['PSER_DATFIN','Departure_Date','DEPARTURE_DATE','DATE_DEP','DATE DEP','Departure Date']),
        roomType: String(pick(row, ['ROOM_TYPE','ROOMTYPE','TYPE_CHB','TYPE CHB']) || '').trim(),
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
    return (item.aiItems || []).map(ai => ({
      priority: ai.priority || 'medium',
      category: ai.kind || 'controle',
      quote: ai.quote || '',
      reservationControl: ai.reservationControl || item.reservationControl?.summary || '',
      result: ai.result || '',
      comparisonStatus: ai.comparisonStatus || '',
      confidence: ai.confidence || 'medium'
    }));
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
        arrivalHour: truncateForStorage(comments.arrivalHour, 80)
      }
    };
  }

  function compactPayloadForStorage(payload){
    return {
      ...payload,
      items: (payload.items || []).map(compactItemForStorage)
    };
  }

  function sanitizeLunaCommentMemory(item){
    const comments = item?.comments || {};
    return {
      ...item,
      comments: {
        message: truncateForStorage(comments.message, 1000),
        arrivalHour: truncateForStorage(comments.arrivalHour, 80)
      },
      hasCommentData: !!(comments.message || comments.arrivalHour)
    };
  }

  function sanitizePayload(payload){
    if (!payload || !Array.isArray(payload.items)) return payload;
    return {
      ...payload,
      storagePolicy: 'structured_reservations_luna_comments_message_arrivhour_by_date',
      items: payload.items.map(sanitizeLunaCommentMemory)
    };
  }

  function stripStoredComments(item){
    return {
      ...item,
      comments: {
        message: '',
        arrivalHour: ''
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
              arrivalHour: item.comments?.arrivalHour || ''
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
      return (Array.isArray(item.validationTargets) ? item.validationTargets : []).map(target => {
        const evidenceCandidate = isFolsPreferenceCatalogText(target.evidenceCandidate)
          ? ''
          : (target.evidenceCandidate || '');
        return {
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
          commentExtract: evidenceCandidate,
          evidenceCandidate
        };
      });
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
      storagePolicy: 'structured_reservations_luna_comments_message_arrivhour_by_date',
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

  function loadPayload(){
    if (window.__AAR_RESERVATION_CONTROL) {
      window.__AAR_RESERVATION_CONTROL = sanitizePayload(window.__AAR_RESERVATION_CONTROL);
      return window.__AAR_RESERVATION_CONTROL;
    }
    const payload = safeJsonParse(localStorage.getItem(LS_RESERVATION_CONTROL) || 'null', null);
    if (payload && Array.isArray(payload.items)) {
      const sanitized = sanitizePayload(payload);
      window.__AAR_RESERVATION_CONTROL = sanitized;
      return sanitized;
    }
    return { version: 2, importedAt: '', count: 0, items: [] };
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
    return chosen.length > 360 ? `${chosen.slice(0, 360).trim()}?` : chosen;
  }

  function compactCommentFields(comments){
    const out = {};
    ['message','arrivalHour'].forEach(key => {
      const value = cleanText(comments?.[key] || '');
      if (value) out[key] = value;
    });
    return out;
  }

  function hasLunaReadableComment(record){
    const comments = record?.comments || {};
    const validationTargets = Array.isArray(record?.validationTargets) ? record.validationTargets : [];
    return !!(
      cleanText(comments.message || '') ||
      cleanText(comments.arrivalHour || '') ||
      validationTargets.length
    );
  }

  function sanitizeReservationControlForLuna(control){
    if (!control || typeof control !== 'object') return {};
    const next = { ...control };
    if (typeof next.summary === 'string') {
      next.summary = next.summary
        .split(/\s*[•|]\s*/)
        .map(part => cleanText(part))
        .filter(part => part && !/^chambre\s+\d+[a-z]?$/i.test(part))
        .join(' • ');
    }
    return next;
  }

  function sanitizeAutomaticControlsForLuna(controls){
    return Array.isArray(controls) ? controls : [];
  }

  function isFolsPreferenceCatalogText(value){
    const text = stripAccentsLower(cleanText(value || ''));
    if (!text) return false;
    return [
      'categorie de chambre',
      'standard de chambre',
      'type d etage',
      'type d étage',
      'proximite ascenseur',
      'proximité ascenseur',
      'climatisation :',
      'presse - journaux',
      'non fumeur'
    ].some(marker => text.includes(stripAccentsLower(marker)));
  }

  function isFolsPreferenceCatalogAiItem(ai){
    const sourceField = String(ai?.sourceField || ai?.commentField || ai?.field || '').trim().toLowerCase();
    if (sourceField === 'preferences' || sourceField === 'gues_pref') return true;
    return [
      ai?.quote,
      ai?.sourceComment,
      ai?.evidence,
      ai?.result,
      ai?.summary,
      ai?.recommendedAction,
      ai?.intelligentAnalysis,
      ai?.reservationControl
    ].some(value => isFolsPreferenceCatalogText(value));
  }

  const LUNA_FORBIDDEN_PAYLOAD_KEYS = new Set([
    'guespref',
    'preferences',
    'messagehtml',
    'todotosay',
    'roomnumpref',
    'roompref'
  ]);

  function scrubLunaPayload(value){
    if (Array.isArray(value)) return value.map(scrubLunaPayload);
    if (value && typeof value === 'object') {
      return Object.entries(value).reduce((acc, [key, entry]) => {
        const normalizedKey = String(key || '').replace(/[\s_-]+/g, '').toLowerCase();
        if (LUNA_FORBIDDEN_PAYLOAD_KEYS.has(normalizedKey)) return acc;
        acc[key] = scrubLunaPayload(entry);
        return acc;
      }, {});
    }
    if (typeof value === 'string' && isFolsPreferenceCatalogText(value)) return '';
    return value;
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
    const source = [
      comments.message,
      comments.arrivalHour
    ].filter(Boolean).join(' | ');
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
        const comments = compactCommentFields(item.comments);
        const validationTargets = Array.isArray(item.validationTargets) && item.validationTargets.length
          ? item.validationTargets
          : buildOrisValidationTargets(item);
        const lunaLocalFacts = sanitizeReservationControlForLuna(item.reservationControl || {});
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
          reservationControl: lunaLocalFacts.summary || 'Aucun controle particulier',
          localFacts: lunaLocalFacts,
          automaticControls: sanitizeAutomaticControlsForLuna(item.automaticControls || []),
          validationTargets,
          comments
        };
      })
      .filter(hasLunaReadableComment);
  }

  function buildLlmRequestModel(boostRecords = buildBoostRecords()){
    const records = (Array.isArray(boostRecords) ? boostRecords : []).filter(hasLunaReadableComment);
    const period = activePeriod();
    const payload = loadPayload();
    const hotelRuntime = window.HOTEL_RUNTIME?.buildRuntime?.();
    const hotelKnowledge = window.HOTEL_RUNTIME?.buildHotelKnowledgeBase?.(hotelRuntime) || {};
    const recordIds = new Set(records.map(record => String(record.reservationId || '')).filter(Boolean));
    const preparedLunaPack = (Array.isArray(payload.lunaPreparationPack) ? payload.lunaPreparationPack : [])
      .filter(item => recordIds.has(String(item.reservationId || '')));

    const userPayload = {
      task: 'Auditer les controles locaux avec les commentaires FOLS, puis produire les notes operationnelles utiles.',
      hotel: 'Novotel Marne-la-Vallée Collégien',
      hotelContext: hotelKnowledge,
      period,
      importWindow: {
        start: payload.windowStart || '',
        end: payload.windowEnd || ''
      },
      dataSource: {
        principle: 'Les reservations ci-dessous sont selectionnees uniquement par periode et presence de commentaires FOLS. Les faits detectes/calcules localement sont fournis, mais Luna doit juger le sens des commentaires.',
        source: 'Import FOLS > faits locaux + Message / Arriv_Hour',
        reservationsCount: records.length,
        preparedAtImport: true,
        lunaPreparationPackCount: preparedLunaPack.length,
        mandatoryValidationTargets: records.reduce((sum, record) => sum + (Array.isArray(record.validationTargets) ? record.validationTargets.length : 0), 0)
      },
      lunaPreparationPack: preparedLunaPack,
      outputRules: [
        'Pour chaque reservation, chaque validationTargets[] doit recevoir une reponse Luna explicite, y compris baby_bed et communicating_room. Recopie exactement reservationId et validationTargetId. Utilise orisDisplayedLine pour savoir quel nom est concerne, et orisTriggerText pour comprendre ce qui a declenche le controle local.',
        'Ne change jamais reservationId. Ne fabrique jamais validationTargetId. Pour un control_audit, validationTargetId doit etre celui du validationTargets[] traite.',
        'Les validations baby_bed et communicating_room sont obligatoires et servent uniquement aux badges de controle a gauche, meme si elles ne seront pas affichees comme informations utiles dans le panneau Analyse Luna.',
        'Si plusieurs reservations ont le meme guestName et la meme demande utile, retourne un seul item pour ce guestName.',
        'Les validations locales vont dans controlAudits. Les notes operationnelles vont dans operationNotes.',
        'Ne repete jamais une meme quote/result plusieurs fois.',
        'Ne retourne pas les confirmations sofa identiques au controle Reservation.',
        'Retourne aussi les conflits, doutes, demandes non couvertes et contraintes operationnelles.',
        'Le rendu doit etre court : quote + result.',
        'Ne pas expliquer le bruit ignore.'
      ],
      responseSchema: LLM_RESPONSE_SCHEMA,
      reservations: records
    };
    const cleanUserPayload = scrubLunaPayload(userPayload);

    return {
      model: 'gpt-5.6-luna',
      modelHint: 'gpt-5.6-luna',
      responseFormat: 'json_object',
      maxOutputTokens: Math.min(16000, Math.max(1600, records.length * 180)),
      messages: [
        { role: 'system', content: LLM_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(cleanUserPayload) }
      ],
      meta: {
        reservationsCount: records.length,
        period,
        builtAt: new Date().toISOString(),
        source: 'hotel-ia',
        expectsStructuredAudit: true
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
      sourceField: String(item.sourceField || item.commentField || item.field || '').trim(),
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
      if (isFolsPreferenceCatalogAiItem(ai)) return false;
      if (String(ai.kind || '').trim() === 'operation_note') {
        const quote = cleanText(ai.quote || '');
        const message = cleanText(reservationItem?.comments?.message || '');
        if (isFolsPreferenceCatalogText(quote) || isFolsPreferenceCatalogText(ai.result || '')) return false;
      }
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

    const payload = loadPayload();
    const period = activePeriod();
    const filtered = (payload.items || []).filter(item => inPeriod(item, period));
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
        row.className = 'reservation-control-warning';
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
            ${alert.comparisonStatus === 'conflict' ? `<em>À vérifier avant préparation.</em>` : ''}
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
  }
})();
