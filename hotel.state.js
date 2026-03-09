(function(){
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function roomTypeEntries(model){
    return Object.entries(model?.roomTypes || {}).map(([code, cfg]) => ({
      code,
      label: cfg?.label || '',
      adults: Number(cfg?.adults || 0),
      children: Number(cfg?.children || 0),
      sofa: Number(cfg?.sofa || 0)
    }));
  }

  function buildEmptyHotelState(model){
    const roomTypes = roomTypeEntries(model || window.HOTEL_MODEL || {});
    return {
      version: 3,
      generatedAt: new Date().toISOString(),
      hotel: clone((model || window.HOTEL_MODEL || {}).hotel || {}),
      operations: clone((model || window.HOTEL_MODEL || {}).operations || {}),
      lifts: clone((model || window.HOTEL_MODEL || {}).lifts || {}),
      noiseModel: clone((model || window.HOTEL_MODEL || {}).noiseModel || {}),
      sofas: clone((model || window.HOTEL_MODEL || {}).sofas || {}),
      roomTypes,
      totals: {
        roomsTotal: Number((model || window.HOTEL_MODEL || {}).hotel?.roomsTotal || 0),
        floorsTotal: Array.isArray((model || window.HOTEL_MODEL || {}).hotel?.floors) ? (model || window.HOTEL_MODEL).hotel.floors.length : 0,
        roomTypesTotal: roomTypes.length,
        liftsTotal: Array.isArray((model || window.HOTEL_MODEL || {}).lifts?.lifts) ? (model || window.HOTEL_MODEL).lifts.lifts.length : 0
      },
      sources: {
        fols: { present:false, rows:0, updatedAt:null },
        groups: { present:false, rows:0, updatedAt:null },
        homeSource: { present:false, rows:0, updatedAt:null },
        acdcAlerts: { present:false, rows:0, updatedAt:null },
        acdcSofa: { present:false, rows:0, updatedAt:null },
        inventory: { present:false, rows:0, updatedAt:null },
        dd: { present:false, rows:0, updatedAt:null },
        checklist: { present:false, rows:0, updatedAt:null },
        tarifs: { present:false, rows:0, updatedAt:null }
      },
      dynamic: {
        reservations: [],
        groups: [],
        preferences: [],
        inventory: [],
        ddCases: [],
        checklists: [],
        tariffs: [],
        signals: [],
        roomStatus: []
      },
      snapshot: {
        arrivalsToday: 0,
        departuresToday: 0,
        inHouse: 0,
        groupsCount: 0,
        unassignedCount: 0,
        preferenceSignals: 0,
        sofaCandidates: 0,
        ddCases: 0,
        inventorySections: 0,
        readinessScore: 0
      }
    };
  }

  window.HOTEL_STATE = {
    buildEmptyHotelState
  };
})();
