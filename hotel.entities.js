(function(){
  function str(v){ return String(v == null ? '' : v).trim(); }
  function num(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }
  function bool(v){ return !!v; }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function compact(obj){
    return Object.fromEntries(Object.entries(obj || {}).filter(([,v]) => v !== '' && v != null));
  }

  function reservation(input){
    const row = input || {};
    return compact({
      entity: 'reservation',
      id: str(row.id || row.resaId || row.reservationId || row.rawId),
      guestName: str(row.guestName || row.name),
      company: str(row.company),
      groupName: str(row.groupName),
      arrivalDate: str(row.arrivalDate),
      departureDate: str(row.departureDate),
      roomNumber: str(row.roomNumber),
      roomType: str(row.roomType),
      adults: num(row.adults, 0),
      children: num(row.children, 0),
      nights: num(row.nights, 0),
      status: str(row.status),
      rateCode: str(row.rateCode),
      balance: num(row.balance, 0),
      notes: str(row.notes),
      source: str(row.source || 'runtime')
    });
  }

  function group(input){
    const row = input || {};
    return compact({
      entity: 'group',
      id: str(row.id || row.groupName),
      groupName: str(row.groupName),
      arrivalDate: str(row.arrivalDate),
      departureDate: str(row.departureDate),
      rooms: num(row.rooms, 0),
      adults: num(row.adults, 0),
      children: num(row.children, 0),
      roomTypes: clone(row.roomTypes || {}),
      nonSplit: bool(row.nonSplit),
      trueTwinRooms: num(row.trueTwinRooms, 0),
      source: str(row.source || 'runtime')
    });
  }

  function preferenceSignal(input){
    const row = input || {};
    return compact({
      entity: 'preference_signal',
      id: str(row.id),
      date: str(row.date),
      guestName: str(row.guestName),
      roomNumber: str(row.roomNumber),
      kind: str(row.kind),
      label: str(row.label),
      text: str(row.text),
      source: str(row.source || 'runtime')
    });
  }

  function signal(input){
    const row = input || {};
    return compact({
      entity: 'signal',
      id: str(row.id),
      kind: str(row.kind),
      level: str(row.level || 'info'),
      title: str(row.title),
      text: str(row.text),
      count: num(row.count, 0),
      source: str(row.source || 'runtime')
    });
  }

  window.HOTEL_ENTITIES = {
    reservation,
    group,
    preferenceSignal,
    signal
  };
})();
