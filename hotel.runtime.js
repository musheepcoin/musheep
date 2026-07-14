(function(){
  const ENT = () => window.HOTEL_ENTITIES || {};
  const AD = () => window.HOTELAI_ADAPTERS || {};
  const ST = () => window.HOTEL_STATE || {};
  const MODEL = () => window.HOTEL_MODEL || {};

  function nowIso(){ return new Date().toISOString(); }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function todayIsoLocal(){ return AD().utils?.todayIsoLocal ? AD().utils.todayIsoLocal() : new Date().toISOString().slice(0,10); }

  function buildSourcesMeta(state, raw){
    const mark = (present, rows) => ({ present: !!present, rows: Number(rows || 0), updatedAt: nowIso() });
    state.sources.fols = mark(Array.isArray(raw.folsRows) && raw.folsRows.length, raw.folsRows?.length || 0);
    state.sources.groups = mark(Array.isArray(raw.groupRows) && raw.groupRows.length, raw.groupRows?.length || 0);
    state.sources.homeSource = mark(Array.isArray(raw.homeRows) && raw.homeRows.length, raw.homeRows?.length || 0);
    state.sources.acdcAlerts = mark(Array.isArray(raw.acdcAlerts) && raw.acdcAlerts.length, raw.acdcAlerts?.length || 0);
    state.sources.acdcSofa = mark(Array.isArray(raw.acdcSofa) && raw.acdcSofa.length, raw.acdcSofa?.length || 0);
    state.sources.inventory = mark(Array.isArray(raw.inventory) && raw.inventory.length, raw.inventory?.length || 0);
    state.sources.dd = mark(Array.isArray(raw.dd?.lines) && raw.dd.lines.length, raw.dd?.lines?.length || 0);
    state.sources.checklist = mark(!!raw.checklist?.day, raw.checklist?.day ? 1 : 0);
    state.sources.tarifs = mark(Array.isArray(raw.tariffs) && raw.tariffs.length, raw.tariffs?.length || 0);
  }

  function buildSnapshot(state, raw = {}){
    const today = todayIsoLocal();
    const reservations = state.dynamic.reservations;
    const arrivalRows = [
      ...(Array.isArray(raw.folsRows) ? raw.folsRows : []),
      ...(Array.isArray(raw.groupRows) ? raw.groupRows : [])
    ];
    const dashboardArrivals = AD().countDashboardArrivals
      ? AD().countDashboardArrivals(arrivalRows, today)
      : null;
    state.snapshot.arrivalsToday = dashboardArrivals
      ? dashboardArrivals.total
      : reservations.filter(r => r.arrivalDate === today).length;
    state.snapshot.departuresToday = reservations.filter(r => r.departureDate === today).length;
    state.snapshot.inHouse = reservations.filter(r => r.arrivalDate && r.departureDate && r.arrivalDate <= today && r.departureDate > today).length;
    state.snapshot.groupsCount = state.dynamic.groups.length;
    state.snapshot.unassignedCount = reservations.filter(r => !r.roomNumber).length;
    state.snapshot.preferenceSignals = state.dynamic.preferences.length;
    state.snapshot.reservationControlItems = Number(state.dynamic.reservationControl?.count || 0);
    state.snapshot.reservationControlAiResults = Array.isArray(state.dynamic.reservationControl?.aiResults)
      ? state.dynamic.reservationControl.aiResults.length
      : 0;
    state.snapshot.sofaCandidates = state.dynamic.signals.filter(s => s.kind === 'sofa_candidate').reduce((acc, s) => acc + (s.count || 0), 0);
    state.snapshot.ddCases = state.dynamic.ddCases.length;
    state.snapshot.inventorySections = state.dynamic.inventory.length;
    const src = Object.values(state.sources).filter(s => s.present).length;
    state.snapshot.readinessScore = Math.round((src / Object.keys(state.sources).length) * 100);
  }

  function buildSignals(data){
    const signal = ENT().signal || ((x)=>x);
    const out = [];
    const missingAssignments = data.reservations.filter(r => !r.roomNumber);
    if (missingAssignments.length) {
      out.push(signal({
        id:'sig_missing_assignments', kind:'missing_assignment', level:'warn',
        title:'Chambres non attribuées', text:`${missingAssignments.length} réservation(s) sans chambre attribuée.`, count:missingAssignments.length
      }));
    }
    const nonSplitGroups = data.groups.filter(g => g.nonSplit);
    if (nonSplitGroups.length) {
      out.push(signal({
        id:'sig_groups_not_loaded', kind:'group_not_loaded', level:'warn',
        title:'Groupes non loadés', text:`${nonSplitGroups.length} groupe(s) détecté(s) non loadé(s).`, count:nonSplitGroups.length
      }));
    }
    const prefCount = data.preferences.length;
    if (prefCount) {
      out.push(signal({
        id:'sig_preferences', kind:'preference_signal', level:'info',
        title:'Préférences détectées', text:`${prefCount} signal(s) préférence lus depuis la source Home.`, count:prefCount
      }));
    }
    if (Array.isArray(data.acdcSofa) && data.acdcSofa.length) {
      out.push(signal({
        id:'sig_sofa', kind:'sofa_candidate', level:'info',
        title:'Candidats sofa', text:`${data.acdcSofa.length} cas sofa issus d'ACDC.`, count:data.acdcSofa.length
      }));
    }
    if (Array.isArray(data.acdcAlerts) && data.acdcAlerts.length) {
      out.push(signal({
        id:'sig_acdc', kind:'acdc_alert', level:'info',
        title:'Alertes ACDC', text:`${data.acdcAlerts.length} alerte(s) ACDC disponibles.`, count:data.acdcAlerts.length
      }));
    }
    if (data.reservationControl?.count) {
      out.push(signal({
        id:'sig_reservation_control', kind:'reservation_control', level:'info',
        title:'Contrôle réservation prêt', text:`${data.reservationControl.count} réservation(s) disponibles pour lecture intelligente.`, count:data.reservationControl.count
      }));
    }
    if (Array.isArray(data.reservationControl?.aiResults) && data.reservationControl.aiResults.length) {
      out.push(signal({
        id:'sig_reservation_control_ai', kind:'reservation_control_ai', level:'info',
        title:'Résultats IA réservation', text:`${data.reservationControl.aiResults.length} résultat(s) IA disponibles.`, count:data.reservationControl.aiResults.length
      }));
    }
    if (Array.isArray(data.dd?.lines) && data.dd.lines.length) {
      out.push(signal({
        id:'sig_dd', kind:'dd_case', level:'info',
        title:'Lignes DD chargées', text:`${data.dd.lines.length} ligne(s) DD dans la société sélectionnée.`, count:data.dd.lines.length
      }));
    }
    return out;
  }

  function buildModulesSlice(state){
    return {
      individual: {
        reservations: state.dynamic.reservations,
        preferences: state.dynamic.preferences
      },
      groups: {
        groups: state.dynamic.groups
      },
      inventory: {
        sections: state.dynamic.inventory
      },
      dd: {
        cases: state.dynamic.ddCases
      },
      checklist: {
        days: state.dynamic.checklists
      },
      tariffs: {
        rows: state.dynamic.tariffs
      },
      reservationControl: {
        importedAt: state.dynamic.reservationControl.importedAt,
        windowStart: state.dynamic.reservationControl.windowStart,
        windowEnd: state.dynamic.reservationControl.windowEnd,
        count: state.dynamic.reservationControl.count,
        aiResults: state.dynamic.reservationControl.aiResults
      }
    };
  }

  function loadReservationControl(){
    const live = window.__AAR_RESERVATION_CONTROL;
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem('aar_reservation_control_v3') || 'null'); }
      catch { return null; }
    })();
    const payload = live && Array.isArray(live.items) ? live : stored;
    if (!payload || !Array.isArray(payload.items)) {
      return { importedAt:'', windowStart:'', windowEnd:'', count:0, items:[], aiPreparedAt:'', aiResults:[] };
    }
    const aiResults = [];
    payload.items.forEach(item => {
      (Array.isArray(item.aiItems) ? item.aiItems : []).forEach(ai => {
        aiResults.push({
          reservationId: String(item.id || ''),
          guestName: String(item.guestName || ''),
          arrivalDate: String(item.arrivalDate || ''),
          quote: String(ai.quote || ''),
          result: String(ai.result || ''),
          priority: String(ai.priority || 'medium'),
          kind: String(ai.kind || ai.category || 'review')
        });
      });
    });
    return {
      importedAt: payload.importedAt || '',
      windowStart: payload.windowStart || '',
      windowEnd: payload.windowEnd || '',
      count: Number(payload.count || payload.items.length || 0),
      items: payload.items,
      aiPreparedAt: window.__AAR_RESERVATION_CONTROL_LLM_REQUEST?.meta?.builtAt || '',
      aiResults
    };
  }

  function loadCompactGroups(){
    try {
      const rows = JSON.parse(localStorage.getItem('aar_groups_compact_v1') || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  function folsRowsFromReservationControl(reservationControl){
    return (Array.isArray(reservationControl?.items) ? reservationControl.items : []).map((item, idx) => {
      const comments = item.comments || {};
      const control = item.reservationControl || {};
      const text = [
        comments.message,
        comments.preferences,
        comments.todo,
        comments.roomPref ? `RoomNumPref ${comments.roomPref}` : '',
        comments.arrivalHour ? `Arriv_Hour ${comments.arrivalHour}` : '',
        control.summary
      ].filter(Boolean).join(' | ');
      return {
        __text: text,
        __first: String(item.guestName || ''),
        __bf: control.babyDetected ? 1 : 0,
        __cf: control.communicatingDetected ? 1 : 0,
        __df: control.dayUseDetected ? 1 : 0,
        __ef: control.earlyDetected ? 1 : 0,
        GUES_ID: item.id || `hotel_ia_${idx + 1}`,
        GUES_NAME: item.guestName || '',
        PSER_DATE: item.arrivalDate || '',
        PSER_DATFIN: item.departureDate || '',
        Departure_Date: item.departureDate || '',
        NB_OCC_AD: item.adults || 0,
        NB_OCC_CH: item.children || 0,
        ROOM_TYPE: item.roomType || '',
        ROOM_NUM: item.roomNumber || '',
        RATE: item.rate || '',
        GUARANTY: item.guaranty || '',
        Message: comments.message || '',
        GUES_PREF: comments.preferences || '',
        TO_DO_TO_SAY: comments.todo || '',
        RoomNumPref: comments.roomPref || '',
        Arriv_Hour: comments.arrivalHour || ''
      };
    });
  }

  function preferencesFromReservationControl(reservationControl){
    const out = [];
    (Array.isArray(reservationControl?.items) ? reservationControl.items : []).forEach((item, idx) => {
      const comments = item.comments || {};
      const control = item.reservationControl || {};
      const text = [
        comments.message,
        comments.preferences,
        comments.todo,
        control.summary
      ].filter(Boolean).join(' | ');
      const checks = [
        ['baby', 'Lit bébé / baby', control.babyDetected],
        ['comm', 'Communicante', control.communicatingDetected],
        ['dayuse', 'Day use', control.dayUseDetected],
        ['early', 'Early check-in', control.earlyDetected],
        ['elevator', 'Ascenseur', control.elevatorExplicit],
        ['bath', 'Baignoire', control.bathDetected]
      ];
      checks.forEach(([kind, label, ok]) => {
        if (!ok) return;
        out.push({
          id: `rc_pref_${kind}_${idx}_${out.length + 1}`,
          date: String(item.arrivalDate || ''),
          guestName: String(item.guestName || ''),
          roomNumber: String(item.roomNumber || ''),
          kind,
          label,
          text
        });
      });
    });
    return out;
  }

  function buildHotelKnowledgeBase(runtime){
    const rt = runtime || window.HOTEL_RUNTIME_LAST || buildRuntime();
    const structure = window.HOTEL_STRUCTURE || {};
    return {
      identity: rt.model?.hotel || {},
      permanentStructure: {
        roomTypes: rt.state?.roomTypes || [],
        floors: rt.model?.hotel?.floors || [],
        topologyAvailable: !!structure?.topology,
        roomsTotal: rt.state?.totals?.roomsTotal || 0,
        lifts: rt.model?.lifts || {},
        sofaRules: rt.model?.sofas || {}
      },
      currentOperations: {
        today: rt.meta?.today || todayIsoLocal(),
        snapshot: rt.state?.snapshot || {},
        sources: rt.state?.sources || {}
      },
      importedData: {
        reservationsCount: rt.entities?.reservations?.length || 0,
        groupsCount: rt.entities?.groups?.length || 0,
        preferencesCount: rt.entities?.preferences?.length || 0,
        reservationControlCount: rt.state?.dynamic?.reservationControl?.count || 0
      },
      intelligencePolicy: {
        principle: 'La LLM lit uniquement un extrait structuré utile, jamais tout le fichier brut.',
        reservationControl: [
          'Comparer les commentaires client avec les contrôles déjà produits par Réservation.',
          'Remonter les demandes utiles, les conflits et les contraintes opérationnelles.',
          'Ignorer le bruit : VCC, OTA standard, online check-in, non-fumeur standard, parking client banal.'
        ]
      }
    };
  }

  function buildRuntime(){
    const model = clone(MODEL());
    const state = ST().buildEmptyHotelState ? ST().buildEmptyHotelState(model) : { dynamic:{} };

    const reservationControl = loadReservationControl();
    const folsRows = (Array.isArray(window.__AAR_LAST_FOLS_ROWS) && window.__AAR_LAST_FOLS_ROWS.length)
      ? window.__AAR_LAST_FOLS_ROWS
      : folsRowsFromReservationControl(reservationControl);
    const groupRows = (Array.isArray(window.GROUPS_SOURCE) && window.GROUPS_SOURCE.length)
      ? window.GROUPS_SOURCE
      : loadCompactGroups();
    const rawHome = localStorage.getItem(AD().constants?.LS_HOME_STATS_SOURCE || 'aar_home_arrivals_source_v1') || '';
    const homeRows = AD().parseHomeSource ? AD().parseHomeSource(rawHome) : [];
    const inventory = AD().adaptInventory ? AD().adaptInventory() : [];
    const acdcAlerts = AD().adaptAcdcAlerts ? AD().adaptAcdcAlerts() : [];
    const acdcSofa = AD().adaptAcdcSofa ? AD().adaptAcdcSofa() : [];
    const dd = AD().adaptDdState ? AD().adaptDdState() : { lines:[] };
    const checklist = AD().adaptChecklist ? AD().adaptChecklist() : null;
    const tariffs = AD().adaptTariffs ? AD().adaptTariffs() : [];
    const reservations = (AD().adaptFolsRows ? AD().adaptFolsRows(folsRows) : []).map(r => (ENT().reservation ? ENT().reservation(r) : r));
    const groups = (AD().adaptGroupRows ? AD().adaptGroupRows(groupRows) : []).map(g => (ENT().group ? ENT().group(g) : g));
    const homePreferences = AD().adaptPreferences ? AD().adaptPreferences(homeRows) : [];
    const reservationPreferences = preferencesFromReservationControl(reservationControl);
    const preferences = [...homePreferences, ...reservationPreferences].map(p => (ENT().preferenceSignal ? ENT().preferenceSignal(p) : p));
    const ddCases = Array.isArray(dd.lines) ? dd.lines : [];
    const signals = buildSignals({ reservations, groups, preferences, acdcAlerts, acdcSofa, dd, reservationControl });

    state.dynamic.reservations = reservations;
    state.dynamic.groups = groups;
    state.dynamic.preferences = preferences;
    state.dynamic.reservationControl = reservationControl;
    state.dynamic.inventory = inventory;
    state.dynamic.ddCases = ddCases;
    state.dynamic.checklists = checklist ? [checklist] : [];
    state.dynamic.tariffs = tariffs;
    state.dynamic.signals = signals;

    buildSourcesMeta(state, { folsRows, groupRows, homeRows, acdcAlerts, acdcSofa, inventory, dd, checklist, tariffs });
    buildSnapshot(state, { folsRows, groupRows });

    const runtime = {
      version: 1,
      builtAt: nowIso(),
      model,
      state,
      entities: {
        reservations,
        groups,
        preferences,
        ddCases,
        inventorySections: inventory,
        checklists: checklist ? [checklist] : [],
        tariffs
      },
      modules: buildModulesSlice(state),
      signals,
      meta: {
        sourceStrategy: 'augment current site reality, do not replace it',
        today: todayIsoLocal(),
        visibleImports: {
          folsLoaded: folsRows.length > 0,
          groupsLoaded: groupRows.length > 0,
          homeLoaded: homeRows.length > 0,
          ddLoaded: ddCases.length > 0
        }
      }
    };

    runtime.knowledgeBase = buildHotelKnowledgeBase(runtime);

    window.HOTEL_RUNTIME_LAST = runtime;
    return runtime;
  }

  window.HOTEL_RUNTIME = {
    buildRuntime,
    buildHotelKnowledgeBase
  };
})();
