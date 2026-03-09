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

  function buildSnapshot(state){
    const today = todayIsoLocal();
    const reservations = state.dynamic.reservations;
    state.snapshot.arrivalsToday = reservations.filter(r => r.arrivalDate === today).length;
    state.snapshot.departuresToday = reservations.filter(r => r.departureDate === today).length;
    state.snapshot.inHouse = reservations.filter(r => r.arrivalDate && r.departureDate && r.arrivalDate <= today && r.departureDate > today).length;
    state.snapshot.groupsCount = state.dynamic.groups.length;
    state.snapshot.unassignedCount = reservations.filter(r => !r.roomNumber).length;
    state.snapshot.preferenceSignals = state.dynamic.preferences.length;
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
        id:'sig_groups_non_split', kind:'group_not_split', level:'warn',
        title:'Groupes potentiellement non éclatés', text:`${nonSplitGroups.length} groupe(s) détecté(s) non éclatés.`, count:nonSplitGroups.length
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
      }
    };
  }

  function buildRuntime(){
    const model = clone(MODEL());
    const state = ST().buildEmptyHotelState ? ST().buildEmptyHotelState(model) : { dynamic:{} };

    const folsRows = Array.isArray(window.__AAR_LAST_FOLS_ROWS) ? window.__AAR_LAST_FOLS_ROWS : [];
    const groupRows = Array.isArray(window.GROUPS_SOURCE) ? window.GROUPS_SOURCE : [];
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
    const preferences = (AD().adaptPreferences ? AD().adaptPreferences(homeRows) : []).map(p => (ENT().preferenceSignal ? ENT().preferenceSignal(p) : p));
    const ddCases = Array.isArray(dd.lines) ? dd.lines : [];
    const signals = buildSignals({ reservations, groups, preferences, acdcAlerts, acdcSofa, dd });

    state.dynamic.reservations = reservations;
    state.dynamic.groups = groups;
    state.dynamic.preferences = preferences;
    state.dynamic.inventory = inventory;
    state.dynamic.ddCases = ddCases;
    state.dynamic.checklists = checklist ? [checklist] : [];
    state.dynamic.tariffs = tariffs;
    state.dynamic.signals = signals;

    buildSourcesMeta(state, { folsRows, groupRows, homeRows, acdcAlerts, acdcSofa, inventory, dd, checklist, tariffs });
    buildSnapshot(state);

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

    window.HOTEL_RUNTIME_LAST = runtime;
    return runtime;
  }

  window.HOTEL_RUNTIME = {
    buildRuntime
  };
})();
