(function(){
  const LS_RESERVATION_CONTROL = 'aar_reservation_control_v3';
  const LS_LUNA_PREPARATION_PACK = 'aar_luna_preparation_pack_v1';
  const LS_RESERVATION_CONTROL_OLD_KEYS = ['aar_reservation_control_v1', 'aar_reservation_control_v2'];
  const LS_RULES = 'aar_soiree_rules_v2';

  const DEFAULT_RULES = {
    keywords: {
      baby: ['lit bb','lit bebe','baby','crib','extra bed/crib','baby cot','cot requested'],
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
    "Tu es Luna, une IA d'audit operationnel pour une reception d'hotel.",
    "Tu ne connais rien hors des donnees fournies. Tu ne dois pas inventer de contexte hotelier.",
    '',
    'PRINCIPE CENTRAL',
    "Le systeme local a deja extrait et calcule des faits depuis l'import FOLS.",
    "Luna ne doit PAS refaire cette detection.",
    "Luna doit AUDITER ces faits : lire le commentaire comme un humain et dire si le commentaire valide, invalide ou rend impossible a trancher le fait fourni.",
    "Detection/calcul local = donnees fournies. Luna = jugement humain sur le sens du commentaire.",
    "Le raisonnement doit porter sur la relation entre le fait fourni et ce que le commentaire veut dire, pas sur une liste de mots.",
    '',
    'ORDRE DE TRAVAIL OBLIGATOIRE',
    '1. Traiter tous les validationTargets. Ce sont les controles locaux deja actives et ils exigent un verdict.',
    '2. Le coeur de ta mission est ensuite l audit de lecture des commentaires client/interne : relever ce qui evite a la reception d ouvrir chaque reservation une par une.',
    '3. Ne jamais creer un controle absent de validationTargets.',
    '4. Ne jamais confirmer un controle par simple presence de mots : il faut que le sens du commentaire valide le besoin operationnel.',
    '5. Ne jamais retourner deux items identiques pour la meme reservation.',
    '6. Si deux analyses recoivent les memes donnees, elles doivent produire les memes decisions et les memes formulations autant que possible.',
    '',
    'STATUT MACHINE',
    '- comparisonStatus est obligatoire pour chaque item.',
    '- Le site lit ce statut pour afficher les badges. Le site ne lit jamais result pour decider du badge.',
    '- Valeurs autorisees : confirmed, conflict, unclear, new_info.',
    '- confirmed = le commentaire valide clairement le fait fourni.',
    '- conflict = le commentaire lisible ne valide pas le fait fourni, le contredit, ou montre un faux positif du controle local.',
    '- unclear = seulement si le texte est tronque, illisible, contradictoire sans resolution, ou impossible a interpreter.',
    '- new_info = information utile issue du commentaire mais non liee a un validationTarget.',
    '- Les items de validation locale doivent avoir kind="control_audit".',
    '- Les informations utiles hors validation locale doivent avoir kind="operation_note".',
    '',
    'DONNEES RECUES',
    '- reservationId : identifiant technique a recopier.',
    '- guestName : client.',
    '- arrivalDate : date arrivee.',
    '- roomType / roomNumber / occupants : contexte de chambre.',
    '- reservationControl : resume du fait detecte ou calcule localement.',
    '- localFacts : faits structures, ex babyDetected, sofaNeed, communicatingDetected.',
    '- validationTargets : controles affiches a gauche dans la page Individuel. Ils sont obligatoires.',
    '- validationTargets.orisDisplayedLine : ligne visible, ex "LIT BEBE : AKINWUMI" ou "COMMUNIQUANTE : MURE".',
    '- validationTargets.orisTriggerText / orisTriggerKeyword : morceau qui a declenche le controle local. Ce n est PAS une preuve definitive ; c est le point a auditer.',
    '- validationTargets.evidenceCandidate : extrait de commentaire deja isole depuis la reservation. C est la source principale a lire.',
    '- comments : commentaires bruts complets si necessaire.',
    '',
    'COMMENT AUDITER UN VALIDATIONTARGET',
    '- Lis orisDisplayedLine pour savoir ce que le controle affirme.',
    '- Lis evidenceCandidate et comments pour comprendre le sens humain.',
    '- Compare le sens humain au fait fourni.',
    '- Retourne exactement un item pour chaque validationTarget.',
    '- controlType doit etre celui du validationTarget : baby_bed ou communicating_room.',
    '- quote doit etre une citation exacte et courte qui justifie ton verdict.',
    '- result explique en francais metier court ce qu il faut comprendre.',
    '',
    'RAISONNEMENT ATTENDU',
    '- Pour baby_bed : juge si le commentaire exprime réellement un besoin de couchage bebe/enfant en bas age ou un equipement bebe. Si le commentaire parle d autre chose, le controle local n est pas valide.',
    '- Pour communicating_room : juge si le commentaire exprime réellement un besoin de chambres liees entre elles, rapprochees, coordonnees ou organisees ensemble. Si le commentaire parle seulement d une preference de confort sans lien entre chambres, le controle local n est pas valide.',
    '- Pour sofa : sofaNeed est fourni. Luna juge seulement si le commentaire ajoute, nuance ou contredit ce besoin. Luna ne recalcule jamais sofaNeed.',
    '- Tu peux utiliser les mots du commentaire comme indices, mais la decision doit toujours etre une conclusion de sens.',
    '',
    'SOFA',
    "- Le systeme fournit sofaNeed. Luna ne recalcule jamais la regle sofa.",
    '- Si le commentaire confirme exactement le meme sofa que sofaNeed, ne remonte rien sauf si c est lie a un lit bebe obligatoire.',
    '- Si le commentaire demande moins ou plus que sofaNeed, retourne un conflit utile.',
    '- Si le commentaire dit explicitement "1 sofa suffit" alors que sofaNeed indique 2 sofas, comparisonStatus="conflict".',
    '- Ne presente jamais un sofa calcule localement comme une deduction Luna du commentaire.',
    '',
    'AUTRES INFORMATIONS UTILES APRES AUDIT',
    '- Cette partie est la plus importante : lis les commentaires comme un receptionniste experimente et fais ressortir ce qui merite vraiment attention.',
    '- L objectif est de transformer les commentaires bruts en quelques notes operationnelles fiables.',
    '- Retourne une operation_note si le commentaire change ou prepare une action concrete : preparation, attribution, reception, gouvernante, maintenance, logistique ou decision humaine.',
    '- Une note utile doit expliquer ce qu il faut faire ou comprendre, pas seulement repeter le commentaire.',
    '- Exemples de familles utiles : chambre precise, preference de confort, contrainte d attribution, horaire utile, day use, attention relationnelle, plainte, accessibilite, preparation chambre, logistique speciale.',
    '- Si un commentaire est client/interne, inhabituel, actionnable ou potentiellement sensible, il doit etre considere serieusement meme s il ne correspond a aucun controle local.',
    '- Ne remonte pas les horaires standards de day use : savoir qu un day use est de 10h a 16h n est pas utile seul.',
    '- Ne remonte pas une heure arrivee seule entre 12h00 et 23h00 : c est une information normale sans action particuliere.',
    '- Remonte une heure seulement si elle change une action : arrivee tres tot, arrivee apres 23h00, contrainte de chambre prete, chauffeur/bus, day use atypique ou demande associee.',
    '- Ne remonte pas les descriptions standard de couchage/chambre du type lit double + canape-lit ou sofa bed : les chambres sont deja equipees ainsi, sauf si le commentaire exprime une demande particuliere ou un ecart avec sofaNeed.',
    '- Ignore parking standard/gratuit sauf bus, car, driver, camion, livraison ou vehicule special.',
    '- Ignore VCC, paiement, DO NOT CHARGE, garantie, prepay, arrhes, Genius Booker, online check-in, non-fumeur standard seuls.',
    '- Ignore le texte OTA commercial sauf s il exprime une vraie demande client/action.',
    '',
    'REGROUPEMENT ET STABILITE',
    '- Ne retourne jamais plusieurs fois le meme guestName avec la meme quote et le meme result.',
    '- Pour un dossier multi-chambres, regroupe une consigne commune en un seul item.',
    '- Si plusieurs reservations portent la meme demande commune pour le meme client/dossier, retourne un seul item.',
    '- Si deux demandes sont vraiment differentes, retourne deux items distincts.',
    '- Sois conservateur : mieux vaut ne rien remonter qu afficher du bruit.',
    '- Decision stable : n alterne pas entre remonter et ignorer une information faible. Si l action operationnelle n est pas claire, ignore-la sauf validationTarget obligatoire.',
    '- Formulation stable : utilise toujours le meme vocabulaire pour le meme type de resultat.',
    '- Ordre stable : retourne d abord les control_audit, puis les operation_note ; dans chaque groupe, conserve l ordre des reservations recues.',
    '- Limite les operation_note : une note par intention operationnelle distincte, pas une note par phrase.',
    '',
    'CITATION',
    '- quote doit etre une citation exacte courte issue de evidenceCandidate ou comments.',
    '- quote ne doit jamais etre une reformulation.',
    '- Ne cite pas une preuve faible ou contextuelle si une preuve directe existe dans le commentaire interne/client.',
    '- Si aucune citation exacte ne prouve ton verdict, utilise la citation qui explique le conflit ou retourne unclear uniquement si le texte est illisible.',
    '',
    'STYLE RESULTAT',
    '- result doit etre court, naturel, exploitable par une reception.',
    '- Ne dis pas "selon le systeme", "analyse intelligente", "le commentaire confirme exactement".',
    '- Utilise ces familles de formulation pour stabiliser les sorties : "Preparation : ...", "Attribution : ...", "Reception : ...", "Logistique : ...", "A verifier : ...".',
    '- N ajoute pas de justification longue. Une seule phrase courte.',
    '',
    'FORMAT JSON OBLIGATOIRE',
    '- Retourne uniquement un objet JSON valide.',
    '- Racine obligatoire : {"controlAudits":[],"operationNotes":[]}.',
    '- controlAudits contient uniquement les reponses aux validationTargets.',
    '- operationNotes contient uniquement les informations utiles issues de l audit de lecture des commentaires.',
    '- Si rien n est utile et aucun validationTarget n existe : {"controlAudits":[],"operationNotes":[]}.',
    '- Chaque validationTarget doit produire exactement un item dans controlAudits, meme si conflict.',
    '- Une information utile hors validationTarget doit produire un item dans operationNotes.',
    '- Ne mets jamais le meme item dans controlAudits et operationNotes.',
    '- Champs obligatoires par item : reservationId, priority, kind, controlType, comparisonStatus, quote, reservationControl, result, confidence.',
    '- Priorites autorisees : low, medium, high.',
    '- Dans controlAudits, kind doit toujours valoir control_audit.',
    '- Dans operationNotes, kind doit toujours valoir operation_note.',
    '- controlType autorises : baby_bed, communicating_room, sofa, room_preference, arrival_time, day_use, other.'
  ].join('\n');

  const LLM_RESPONSE_SCHEMA = {
    controlAudits: [
      {
        reservationId: 'string',
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

  function sanitizeBabyKeywordList(list){
    return (Array.isArray(list) ? list : [])
      .map(x => String(x || '').trim())
      .filter(Boolean)
      .filter(x => stripAccentsLower(x) !== 'cot');
  }

  function loadRules(){
    const stored = safeJsonParse(localStorage.getItem(LS_RULES) || 'null', null) || {};
    const keywords = { ...DEFAULT_RULES.keywords, ...(stored.keywords || {}) };
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

  function buildLunaPreparationPack(items){
    return (Array.isArray(items) ? items : []).flatMap(item => {
      return (Array.isArray(item.validationTargets) ? item.validationTargets : []).map(target => ({
        reservationId: item.id,
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
    if (window.__AAR_RESERVATION_CONTROL) return window.__AAR_RESERVATION_CONTROL;
    const payload = safeJsonParse(localStorage.getItem(LS_RESERVATION_CONTROL) || 'null', null);
    if (payload && Array.isArray(payload.items)) {
      window.__AAR_RESERVATION_CONTROL = payload;
      return payload;
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
    ['message','messageHtml','preferences','todo','roomPref','arrivalHour','sourceText'].forEach(key => {
      const value = cleanText(comments?.[key] || '');
      if (value) out[key] = value;
    });
    return out;
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

  function getOrisIndivEvidence(item, type){
    const store = window.__AAR_ORIS_INDIV_DAY_CONTROL || {};
    const day = store[String(item?.arrivalDate || '')];
    if (!day) return null;
    const bucket = type === 'baby' ? day.baby : day.comm;
    if (!Array.isArray(bucket) || !bucket.length) return null;
    const wanted = new Set(reservationNameKeys(item?.guestName || ''));
    return bucket.find(entry => {
      const entryName = typeof entry === 'string' ? entry : entry?.name;
      return reservationNameKeys(entryName).some(k => wanted.has(k));
    }) || null;
  }

  function buildOrisValidationTargets(item){
    const targets = [];
    const babyEvidence = getOrisIndivEvidence(item, 'baby');
    if (babyEvidence) {
      targets.push({
        controlType: 'baby_bed',
        expectedValue: 'true',
        orisDisplayedLine: cleanText(babyEvidence.orisLine || `LIT BEBE : ${babyEvidence.name || item.guestName || ''}`),
        orisTriggerText: cleanText(babyEvidence.triggerText || ''),
        orisTriggerKeyword: cleanText(babyEvidence.triggerKeyword || ''),
        evidenceCandidate: cleanText(babyEvidence.proof || '')
      });
    }
    const commEvidence = getOrisIndivEvidence(item, 'comm');
    if (commEvidence) {
      targets.push({
        controlType: 'communicating_room',
        expectedValue: 'true',
        orisDisplayedLine: cleanText(commEvidence.orisLine || `COMMUNIQUANTE : ${commEvidence.name || item.guestName || ''}`),
        orisTriggerText: cleanText(commEvidence.triggerText || ''),
        orisTriggerKeyword: cleanText(commEvidence.triggerKeyword || ''),
        evidenceCandidate: cleanText(commEvidence.proof || '')
      });
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
        const sourceForEvidence = [
          item.comments?.message,
          item.comments?.messageHtml,
          item.comments?.preferences,
          item.comments?.todo,
          item.comments?.roomPref,
          item.comments?.sourceText
        ].filter(Boolean).join(' | ');
        const validationTargets = Array.isArray(item.validationTargets) && item.validationTargets.length
          ? item.validationTargets
          : buildOrisValidationTargets(item);
        return {
          reservationId: item.id,
          guestName: item.guestName,
          arrivalDate: item.arrivalDate,
          roomType: item.roomType,
          roomNumber: item.roomNumber,
          occupants: { adults: item.adults, children: item.children },
          reservationControl: item.reservationControl?.summary || 'Aucun controle particulier',
          localFacts: item.reservationControl || {},
          automaticControls: item.automaticControls || [],
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
        source: 'Import FOLS > faits locaux + colonnes commentaires brutes',
        reservationsCount: records.length,
        preparedAtImport: true,
        lunaPreparationPackCount: preparedLunaPack.length,
        mandatoryValidationTargets: records.reduce((sum, record) => sum + (Array.isArray(record.validationTargets) ? record.validationTargets.length : 0), 0)
      },
      lunaPreparationPack: preparedLunaPack,
      outputRules: [
        'Pour chaque reservation, chaque validationTargets[] doit recevoir une reponse Luna explicite, y compris baby_bed et communicating_room. Utilise orisDisplayedLine pour savoir quel nom est concerne, et orisTriggerText pour comprendre ce qui a declenche le controle local.',
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
      return ({
      reservationId: String(item.reservationId || '').trim(),
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
    const controlTypesRequiringTarget = new Set(['baby_bed', 'communicating_room']);
    return (Array.isArray(llmItems) ? llmItems : []).filter(ai => {
      const controlType = String(ai.controlType || '').trim();
      if (!controlTypesRequiringTarget.has(controlType)) return true;
      if (!targets.has(controlType)) return false;
      return true;
    });
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
    window.ORIS_ASSISTANT?.resolveNotification?.('boost', `Analyse Luna terminee - ${appliedCount} info(s) utile(s)`);
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
      const usefulCount = [
        ...(Array.isArray(resultPayload?.controlAudits) ? resultPayload.controlAudits : []),
        ...(Array.isArray(resultPayload?.operationNotes) ? resultPayload.operationNotes : [])
      ].length || (Array.isArray(resultPayload?.usefulItems) ? resultPayload.usefulItems.length : 0);
      if (note) note.textContent = `Analyse Luna terminee : ${usefulCount} information(s) utile(s) recue(s).`;
      if (statusEl) statusEl.textContent = `Analyse Luna terminee : ${usefulCount} information(s) utile(s) recue(s).`;
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
