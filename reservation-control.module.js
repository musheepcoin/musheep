(function(){
  const LS_RESERVATION_CONTROL = 'aar_reservation_control_v3';
  const LS_RESERVATION_CONTROL_OLD_KEYS = ['aar_reservation_control_v1', 'aar_reservation_control_v2'];
  const LS_RULES = 'aar_soiree_rules_v2';

  const DEFAULT_RULES = {
    keywords: {
      baby: ['lit bb','lit bebe','lit bébé','baby','crib','cot','extra bed/crib'],
      comm: ['comm','connecte','connecté','connected','communic'],
      dayuse: ['day use','dayuse'],
      early: ['early','prioritaire','11h','checkin','check-in','arrivee prioritaire']
    },
    baby_exclude: ['bébé?','bébé ?','bb?','bb ?'],
    sofa: {
      '1A+0E':'0','1A+1E':'1','1A+2E':'2','1A+3E':'2',
      '2A+0E':'0','2A+1E':'1','2A+2E':'2','2A+3E':'2',
      '3A+0E':'1','3A+1E':'2'
    }
  };

  const LLM_SYSTEM_PROMPT = [
    'Tu es une IA externe d aide operationnelle pour une reception d hotel.',
    'Tu ne connais pas l hotel, tu ne connais pas ORIS, tu ne connais pas FOLS, et tu ne dois rien supposer hors des donnees fournies.',
    '',
    'CONTEXTE GENERAL',
    '- FOLS est un export de reservations de l hotel. Il contient des arrivees clients, des donnees de chambre et plusieurs champs de commentaires.',
    '- ORIS est une application locale de l hotel. Avant ton intervention, ORIS lit le fichier FOLS, extrait les reservations individuelles et calcule des faits metier.',
    '- Tu interviens apres ORIS. Tu ne dois pas remplacer ORIS, recalculer ses regles ou inventer des informations.',
    '- Ton role est de lire les commentaires FOLS et de les comparer aux faits deja calcules par ORIS.',
    '',
    'OBJECTIF',
    'Retourner uniquement les informations utiles pour preparer l arrivee client, aider la reception ou aider la gouvernante.',
    'Si une reservation ne contient rien d utile, ne retourne rien pour cette reservation.',
    'Ne fais jamais un rapport complet reservation par reservation.',
    '',
    'DONNEES RECUES POUR CHAQUE RESERVATION',
    '- reservationId : identifiant technique de la reservation. Tu dois le recopier dans la reponse.',
    '- guestName : nom client. Sert a comprendre le dossier, mais ne doit pas remplacer reservationId.',
    '- arrivalDate : date d arrivee.',
    '- roomType : type de chambre si connu.',
    '- roomNumber : numero de chambre si connu.',
    '- occupants : nombre d adultes et enfants.',
    '- reservationControl : resume lisible des faits deja detectes ou calcules par ORIS.',
    '- localFacts : details calcules par ORIS, par exemple babyDetected, sofaNeed, communicatingDetected, roomPref, arrivalHour.',
    '- automaticControls : liste structuree des controles ORIS deja detectes.',
    '- comments : champs texte issus de FOLS. Ce sont les seules sources a lire intelligemment.',
    '',
    'DEFINITION DES CHAMPS comments',
    '- message : commentaire principal de reservation.',
    '- messageHtml : commentaire principal en version HTML nettoyee si present.',
    '- preferences : preferences client ou chambre.',
    '- todo : demandes ou taches internes.',
    '- roomPref : chambre demandee ou preference de numero.',
    '- arrivalHour : heure d arrivee indiquee.',
    '',
    'DEFINITIONS METIER',
    '- Lit bebe : lit pour bebe. Peut etre ecrit lit bebe, lit bb, baby bed, crib, cot.',
    '- Sofa : canape-lit ou sofa bed a preparer. ORIS calcule souvent ce besoin selon l occupation de la chambre.',
    '- Communicante : demande de chambres communicantes, connecting rooms, chambres proches ou cote a cote.',
    '- Vraie twin : client demande deux vrais lits separes.',
    '- Day use : chambre utilisee sur la journee, sans nuit classique.',
    '- Arrivee prioritaire : client demande arrivee tot ou chambre prete avant l heure standard.',
    '- Vehicule special : bus, car, chauffeur, driver, camion, livraison, PMR ou besoin parking non standard.',
    '- Bruit OTA : texte automatique d agence ou plateforme, description commerciale de chambre, paiement, conditions, statut Genius, online check-in.',
    '',
    'CE QUE TU DOIS REMONTER',
    '- Une demande claire de lit bebe, crib ou cot.',
    '- Une demande de sofa seulement si elle ajoute, contredit ou precise ce que ORIS a deja calcule.',
    '- Un conflit entre commentaire FOLS et faits ORIS.',
    '- Une demande client exploitable non couverte par ORIS : vraie twin, chambres proches, chambre precise, loin des familles, contrainte d attribution, horaire utile.',
    '- Une information logistique concrete : bus, car, driver, chauffeur, camion, livraison, PMR.',
    '- Une information utile pour reception, attribution ou gouvernante.',
    '',
    'CE QUE TU DOIS IGNORER',
    '- Online check-in.',
    '- Non-fumeur standard.',
    '- VCC, paiement confirme, DO NOT CHARGE, garantie, prepay, arrhes, Genius Booker.',
    '- Parking client standard ou parking gratuit selon disponibilite.',
    '- Ascenseur si cela vient seulement d une preference standard et non d une demande explicite du commentaire.',
    '- Description OTA ou commerciale du type "1 Double Bed and 1 Sofa Bed" si ce n est pas formule comme une demande client.',
    '- Sofa si le commentaire repete seulement le meme nombre de sofas que ORIS a deja calcule.',
    '',
    'REGLES SPECIFIQUES SOFA',
    '- ORIS fournit sofaNeed dans localFacts. C est le besoin calcule par l application locale.',
    '- Table sofa ORIS : 1 adulte + 1 enfant = 1 sofa.',
    '- Table sofa ORIS : 1 adulte + 2 enfants = 2 sofas.',
    '- Table sofa ORIS : 1 adulte + 3 enfants = 2 sofas.',
    '- Table sofa ORIS : 2 adultes + 1 enfant = 1 sofa.',
    '- Table sofa ORIS : 2 adultes + 2 enfants = 2 sofas.',
    '- Table sofa ORIS : 2 adultes + 3 enfants = 2 sofas.',
    '- Table sofa ORIS : 3 adultes + 0 enfant = 1 sofa.',
    '- Table sofa ORIS : 3 adultes + 1 enfant = 2 sofas.',
    '- Autres compositions = 0 sofa sauf si ORIS fournit deja un autre sofaNeed.',
    '- Tu ne dois pas recalculer cette table : elle sert seulement a comprendre sofaNeed.',
    '- Si le commentaire demande moins ou plus de sofas que sofaNeed, remonte un conflit ou une precision.',
    '- Si le commentaire dit simplement le meme resultat que sofaNeed, ignore pour eviter le bruit.',
    '- Si le commentaire parle de lit bebe et ORIS calcule aussi un sofa a cause de l occupation, ne presente pas le sofa comme une deduction du commentaire.',
    '',
    'REGLES DE CITATION',
    '- quote doit contenir uniquement une citation courte et exacte provenant d un champ comments.',
    '- quote ne doit jamais contenir une deduction, une reformulation ou une conclusion.',
    '- Si aucune citation exacte ne justifie le resultat, ne retourne pas l item.',
    '',
    'STYLE DU RESULTAT',
    '- result doit etre court, naturel et directement exploitable.',
    '- Ecris en francais metier simple.',
    '- Ne dis pas "le commentaire confirme exactement", "selon ORIS" ou "analyse intelligente".',
    '- N utilise pas de jargon technique : pax, sourceText, automatedValue, rule, localFacts.',
    '- Exemple bon result : "Preparation : lit bebe."',
    '- Exemple bon result : "Preparation : lit bebe + 1 sofa." uniquement si le commentaire cite vraiment les deux.',
    '- Exemple bon result : "Logistique : verifier stationnement bus."',
    '- Exemple bon result : "Attribution : demande vraie twin."',
    '- Exemple bon result : "A verifier : commentaire different du besoin sofa calcule."',
    '',
    'EXEMPLES DE SORTIE SOUHAITEE',
    '- Si commentaire = "lit bebe demande" et ORIS a babyDetected=true, retourne quote="lit bebe demande", result="Preparation : lit bebe.", comparisonStatus="confirmed".',
    '- Si commentaire = "1 lit bebe + 1 sofa", retourne quote="1 lit bebe + 1 sofa", result="Preparation : lit bebe + 1 sofa.", comparisonStatus="confirmed".',
    '- Si commentaire = "Driver pour la journee 10h-21h30 + parking pour le bus", retourne quote exacte courte et result="Logistique : verifier stationnement bus.".',
    '- Si commentaire = "vraie twin souhaitee", retourne quote exacte courte et result="Attribution : demande vraie twin.".',
    '- Si commentaire = "1 sofa suffit" alors que localFacts.sofaNeed=2, retourne quote exacte courte et result="A verifier : commentaire different du besoin sofa calcule.", comparisonStatus="conflict".',
    '- Si commentaire contient seulement "2 SOFAS" et localFacts.sofaNeed=2, ne retourne rien.',
    '- Si commentaire contient seulement VCC, paiement, non-fumeur, Genius Booker ou online check-in, ne retourne rien.',
    '',
    'EXEMPLE DE FORMAT JSON',
    '{',
    '  "usefulItems": [',
    '    {',
    '      "reservationId": "123456",',
    '      "priority": "medium",',
    '      "kind": "preparation",',
    '      "comparisonStatus": "confirmed",',
    '      "quote": "lit bebe demande",',
    '      "reservationControl": "Lit bebe",',
    '      "result": "Preparation : lit bebe.",',
    '      "confidence": "high"',
    '    }',
    '  ]',
    '}',
    '',
    'FORMAT DE SORTIE OBLIGATOIRE',
    '- Retourne uniquement un objet JSON valide.',
    '- La racine doit contenir usefulItems.',
    '- usefulItems est un tableau.',
    '- Si rien n est utile, retourne {"usefulItems":[]}.',
    '- Statuts autorises pour comparisonStatus : confirmed, new_info, conflict, unclear.',
    '- Priorites autorisees : low, medium, high.'
  ].join('\n');

  const LLM_RESPONSE_SCHEMA = {
    usefulItems: [
      {
        reservationId: 'string',
        priority: 'low|medium|high',
        kind: 'preparation|attribution|logistics|front_desk|conflict|review',
        comparisonStatus: 'confirmed|new_info|conflict|unclear',
        quote: 'citation courte exacte du commentaire, sans guillemets ajoutes',
        reservationControl: 'resume court du controle Reservation si utile',
        result: 'phrase naturelle courte, ex: Preparation : lit bebe. / Logistique : verifier stationnement bus. / A verifier : commentaire different du besoin sofa calcule.',
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
      if (canSwapText && !btn.dataset.boostIdleText) btn.dataset.boostIdleText = btn.textContent || 'BOOST';
      btn.classList.toggle('is-boost-running', boostInFlight);
      btn.setAttribute('aria-busy', boostInFlight ? 'true' : 'false');
      if (boostInFlight) {
        btn.disabled = true;
        if (canSwapText) btn.textContent = 'BOOST...';
      } else if (canSwapText) {
        btn.textContent = btn.dataset.boostIdleText || 'BOOST';
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

  function loadRules(){
    const stored = safeJsonParse(localStorage.getItem(LS_RULES) || 'null', null) || {};
    return {
      keywords: { ...DEFAULT_RULES.keywords, ...(stored.keywords || {}) },
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
    const clean = cleanKeywordHaystack(text);
    return (rules.keywords.baby || []).some(k => {
      const token = cleanKeywordHaystack(k);
      return token && clean.includes(token);
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
    const sourceText = comments.sourceText || comments.combined || '';
    const haystack = cleanKeywordHaystack(sourceText);
    const raw = stripAccentsLower(sourceText);

    const baby = Number(row.__bf || 0) > 0 || hasBabyRequest(sourceText, rules);
    const comm = Number(row.__cf || 0) > 0 || !!(rx.comm && rx.comm.test(haystack));
    const dayUse = Number(row.__df || 0) > 0 || !!(rx.dayuse && rx.dayuse.test(haystack));
    const early = Number(row.__ef || 0) > 0 || !!(rx.early && rx.early.test(haystack));
    const bath = raw.includes('baignoire') || /\bbath\b|\btub\b/.test(raw);
    const explicitText = [comments.message, comments.todo].filter(Boolean).join(' | ');
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
    if (comments.roomPref) labels.push(`Chambre ${comments.roomPref}`);
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
      roomPref: comments.roomPref || '',
      arrivalHour: comments.arrivalHour || '',
      explicitSofaComment: hasExplicitSofaComment([comments.message, comments.todo, comments.sourceText].filter(Boolean).join(' | '))
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
    if (control.roomPref) add('room_preference', control.roomPref);
    if (control.arrivalHour) add('arrival_time', control.arrivalHour);
    if (control.explicitSofaComment) add('sofa_comment_compare', control.sofaNeed);
    return controls;
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
      if (groupName) return null;

      const guestRaw = pick(row, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) || '';
      const adults = parseInt(pick(row, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0', 10) || 0;
      const children = parseInt(pick(row, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0', 10) || 0;
      const message = cleanText(pick(row, ['Message','MESSAGE','message']));
      const messageHtml = cleanText(pick(row, ['message_html','MESSAGE_HTML']));
      const preferences = cleanText(pick(row, ['GUES_PREF','PREFERENCES','PREF']));
      const todo = cleanText(pick(row, ['TO_DO_TO_SAY','TODO','TO DO TO SAY']));
      const roomPref = cleanText(pick(row, ['RoomNumPref','ROOM_NUM_PREF','ROOM PREF']));
      const arrivalHour = cleanText(pick(row, ['Arriv_Hour','ARRIV_HOUR','ARRIVAL_HOUR']));
      const sourceText = cleanText(row.__text || [message, messageHtml, preferences, todo, roomPref, arrivalHour].filter(Boolean).join(' | '));
      const combined = cleanText([message, messageHtml, preferences, todo, roomPref ? `Chambre ${roomPref}` : '', arrivalHour ? `Arrivée ${arrivalHour}` : '', sourceText].filter(Boolean).join(' | '));
      const hasRealCommentData = !!(message || messageHtml || preferences || todo || roomPref || arrivalHour);
      const comments = { message, messageHtml, preferences, todo, roomPref, arrivalHour, sourceText, combined };
      const control = buildReservationControl(row, rules, rx, comments, adults, children);
      const automaticControls = buildAutomaticControls(control);

      const item = {
        id: String(pick(row, ['GUES_ID','NUM_RESA','RESERVATION','ID']) || `fols_${idx + 1}`),
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
        messageHtml: truncateForStorage(comments.messageHtml, 1200),
        preferences: truncateForStorage(comments.preferences, 800),
        todo: truncateForStorage(comments.todo, 800),
        roomPref: truncateForStorage(comments.roomPref, 80),
        arrivalHour: truncateForStorage(comments.arrivalHour, 80),
        sourceText: truncateForStorage(comments.sourceText, 1600),
        combined: truncateForStorage([comments.message, comments.messageHtml, comments.preferences, comments.todo, comments.sourceText].filter(Boolean).join(' | '), 2200)
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
        messageHtml: '',
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

  function processRows(rows){
    const allItems = buildItems(rows);
    const windowInfo = getWindow();
    const items = allItems.map(item => {
      const keepComments = inMainWindow(item, windowInfo);
      return keepComments
        ? { ...item, commentsRetained: true }
        : stripStoredComments(item);
    });
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
      totalRows: allItems.length,
      count: items.length,
      commentsClearedOutsideWindow: items.filter(item => !item.commentsRetained).length,
      items
    };
    window.__AAR_RESERVATION_CONTROL = payload;
    persistPayload(payload);
    window.__AAR_INVALIDATE_HOTEL_MEMORY_ROWS?.();
    window.HOTEL_RUNTIME?.buildRuntime?.();
    render();
    window.__AAR_REFRESH_INDIV_FUSED_VIEW?.();
    return payload;
  }

  function loadPayload(){
    if (window.__AAR_RESERVATION_CONTROL) return window.__AAR_RESERVATION_CONTROL;
    const payload = safeJsonParse(localStorage.getItem(LS_RESERVATION_CONTROL) || 'null', null);
    if (payload && Array.isArray(payload.items)) {
      window.__AAR_RESERVATION_CONTROL = payload;
      return payload;
    }
    return { version: 2, importedAt: '', count: 0, items: [] };
  }

  function compactCommentFields(comments){
    const out = {};
    ['message','messageHtml','preferences','todo','roomPref','arrivalHour','sourceText'].forEach(key => {
      const value = cleanText(comments?.[key] || '');
      if (value) out[key] = value;
    });
    return out;
  }

  function buildBoostRecords(){
    const payload = loadPayload();
    const period = activePeriod();
    return (payload.items || [])
      .filter(item => inPeriod(item, period))
      .map(item => ({
        reservationId: item.id,
        guestName: item.guestName,
        arrivalDate: item.arrivalDate,
        roomType: item.roomType,
        roomNumber: item.roomNumber,
        occupants: { adults: item.adults, children: item.children },
        reservationControl: item.reservationControl?.summary || 'Aucun contrôle particulier',
        localFacts: item.reservationControl || {},
        automaticControls: item.automaticControls || [],
        comments: compactCommentFields(item.comments)
      }))
      .filter(item => Object.keys(item.comments || {}).length > 0);
  }

  function buildLlmRequestModel(boostRecords = buildBoostRecords()){
    const records = (Array.isArray(boostRecords) ? boostRecords : []).filter(item => Object.keys(item.comments || {}).length > 0);
    const period = activePeriod();
    const payload = loadPayload();
    const hotelRuntime = window.HOTEL_RUNTIME?.buildRuntime?.();
    const hotelKnowledge = window.HOTEL_RUNTIME?.buildHotelKnowledgeBase?.(hotelRuntime) || {};
    const userPayload = {
      task: 'Comparer le controle Reservation avec les commentaires FOLS et retourner seulement les informations utiles.',
      hotel: 'Novotel Marne-la-Vallée Collégien',
      hotelContext: hotelKnowledge,
      period,
      importWindow: {
        start: payload.windowStart || '',
        end: payload.windowEnd || ''
      },
      dataSource: {
        principle: 'Les reservations ci-dessous sont selectionnees uniquement par periode et presence de commentaires FOLS. ORIS fournit les faits calcules, mais ne decide pas localement si le commentaire est utile.',
        source: 'Import FOLS > faits ORIS + colonnes commentaires brutes',
        reservationsCount: records.length
      },
      outputRules: [
        'Ne retourne pas les confirmations sofa identiques au controle Reservation.',
        'Retourne les demandes lit bebe utiles.',
        'Retourne les conflits, doutes, demandes non couvertes et contraintes operationnelles.',
        'Le rendu doit etre court : quote + result.',
        'Ne pas expliquer le bruit ignore.'
      ],
      responseSchema: LLM_RESPONSE_SCHEMA,
      reservations: records
    };

    return {
      model: 'gpt-5.6-luna',
      modelHint: 'gpt-5.6-luna',
      temperature: 0.1,
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
        expectsUsefulItems: true
      }
    };
  }

  function normalizeLlmItems(resultPayload){
    const rawItems =
      Array.isArray(resultPayload?.usefulItems) ? resultPayload.usefulItems :
      Array.isArray(resultPayload?.items) ? resultPayload.items :
      Array.isArray(resultPayload?.commentInsights) ? resultPayload.commentInsights :
      Array.isArray(resultPayload?.insights) ? resultPayload.insights : [];

    return rawItems.map(item => ({
      reservationId: String(item.reservationId || '').trim(),
      priority: String(item.priority || 'medium').trim(),
      kind: String(item.kind || item.category || 'review').trim(),
      comparisonStatus: String(item.comparisonStatus || item.status || 'new_info').trim(),
      quote: String(item.quote || item.sourceComment || item.evidence || '').trim(),
      reservationControl: String(item.reservationControl || '').trim(),
      result: String(item.result || item.summary || item.intelligentAnalysis || item.recommendedAction || '').trim(),
      confidence: String(item.confidence || 'medium').trim(),
      source: 'llm'
    })).filter(item => item.reservationId && (item.quote || item.result));
  }

  function applyLlmResult(resultPayload){
    const payload = loadPayload();
    const llmItems = normalizeLlmItems(resultPayload);
    if (!payload?.items?.length) {
      window.ORIS_ASSISTANT?.resolveNotification?.('boost', 'BOOST terminé · aucune donnée chargée');
      return payload;
    }
    if (!llmItems.length) {
      window.ORIS_ASSISTANT?.resolveNotification?.('boost', 'BOOST terminé · aucun dossier utile');
      return payload;
    }

    const byIdMap = new Map();
    llmItems.forEach(item => {
      if (!byIdMap.has(item.reservationId)) byIdMap.set(item.reservationId, []);
      byIdMap.get(item.reservationId).push(item);
    });

    payload.items = payload.items.map(item => {
      const aiItems = byIdMap.get(String(item.id)) || [];
      if (!aiItems.length) return item;
      const next = { ...item, aiItems };
      next.alerts = buildAlerts(next);
      return next;
    });

    window.__AAR_RESERVATION_CONTROL = payload;
    persistPayload(payload);
    window.HOTEL_RUNTIME?.buildRuntime?.();
    render();
    window.__AAR_REFRESH_INDIV_FUSED_VIEW?.();
    window.ORIS_ASSISTANT?.resolveNotification?.('boost', `BOOST terminé · ${llmItems.length} info(s) utile(s)`);
    return payload;
  }

  function applyLlmValidations(resultPayload){
    return applyLlmResult(resultPayload);
  }

  async function callBoostApi(requestModel){
    const response = await fetch('/api/boost-reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestModel)
    });
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
      if (statusEl) statusEl.textContent = 'Aucun commentaire a envoyer au BOOST.';
      window.AAR?.toast?.('Aucun commentaire a envoyer au BOOST');
      return null;
    }

    setBoostInFlight(true);
    try {
      window.ORIS_ASSISTANT?.notifyPersistent?.('boost', `BOOST en cours - ${boostRecords.length} reservation(s) envoyee(s) a Luna`);
      if (note) note.textContent = `BOOST en cours : Luna lit ${boostRecords.length} reservation(s) avec commentaire(s)...`;
      if (statusEl) statusEl.textContent = `BOOST en cours : ${boostRecords.length} reservation(s) envoyee(s) a Luna.`;

      const requestModel = buildLlmRequestModel(boostRecords);
      window.__AAR_RESERVATION_CONTROL_BOOST_RECORDS = boostRecords;
      window.__AAR_RESERVATION_CONTROL_LLM_REQUEST = requestModel;
      window.HOTEL_RUNTIME?.buildRuntime?.();

      const resultPayload = await callBoostApi(requestModel);
      window.__AAR_RESERVATION_CONTROL_LLM_RESPONSE = resultPayload;
      const nextPayload = applyLlmResult(resultPayload);
      const usefulCount = Array.isArray(resultPayload?.usefulItems) ? resultPayload.usefulItems.length : 0;
      if (note) note.textContent = `BOOST termine : ${usefulCount} information(s) utile(s) recue(s) de Luna.`;
      if (statusEl) statusEl.textContent = `BOOST termine : ${usefulCount} information(s) utile(s) recue(s).`;
      return { requestModel, resultPayload, payload: nextPayload };
    } catch (err) {
      const message = err?.message || String(err);
      if (note) note.textContent = `BOOST erreur : ${message}`;
      if (statusEl) statusEl.textContent = `BOOST erreur : ${message}`;
      window.ORIS_ASSISTANT?.resolveNotification?.('boost', `BOOST erreur - ${message}`);
      window.AAR?.toast?.(`BOOST impossible : ${message}`);
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
