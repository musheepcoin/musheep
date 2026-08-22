(function(){
  'use strict';

  const CATEGORIES = ['TRI','STDM','PRIVS','PRIVM','SGE','EXEC'];

  function text(value){ return String(value == null ? '' : value).trim(); }
  function dateKey(value){
    const raw = text(value);
    let match = raw.match(/^(20\d{2})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    match = raw.match(/^(\d{2})\/(\d{2})\/(20\d{2})/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  }
  function utcDate(key){
    const match = dateKey(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  }
  function addDays(key, count){
    const date = utcDate(key);
    if (!date) return '';
    date.setUTCDate(date.getUTCDate() + Number(count || 0));
    return date.toISOString().slice(0,10);
  }
  function dayOffset(from, to){
    const start = utcDate(from);
    const end = utcDate(to);
    return start && end ? Math.round((end - start) / 86400000) : Infinity;
  }
  function horizonEnd(baseDate){
    const date = utcDate(baseDate);
    if (!date) return '';
    const distance = date.getUTCDay() === 0 ? 7 : 7 - date.getUTCDay();
    return addDays(baseDate, distance);
  }
  function roomType(value){
    const compact = text(value).toUpperCase().replace(/[\s_-]+/g,'');
    return ({ STD:'STDM',STDM:'STDM',TRI:'TRI',PRIV:'PRIVS',PRIVS:'PRIVS',PRIVSM:'PRIVS',PRIVM:'PRIVM',EXE:'EXEC',EXEC:'EXEC',SGE:'SGE' })[compact] || compact;
  }
  function roomNumber(value){
    const match = text(value).match(/\d{2,4}/);
    return match ? String(Number(match[0])) : '';
  }
  function sofaNeed(item){
    const control = item?.reservationControl || {};
    const value = Number(control.sofaNeed ?? item?.sofaNeed ?? 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(2, Math.round(value))) : 0;
  }
  function reservationId(item){
    return text(item?.dossierId || item?.reservationId || item?.folsReservationId);
  }
  function recoucheIdsForDate(source, key){
    const value = source?.[key];
    return value instanceof Set ? value : new Set(Array.isArray(value) ? value.map(String) : []);
  }
  function build(options = {}){
    const baseDate = dateKey(options.baseDate);
    const nextDate = addDays(baseDate, 1);
    const endDate = horizonEnd(baseDate);
    const rows = Array.isArray(options.rows) ? options.rows : [];
    const forecast = (Array.isArray(options.forecast) ? options.forecast : [])
      .filter(day => dateKey(day?.key) > baseDate && dateKey(day?.key) <= endDate)
      .sort((a,b) => dateKey(a.key).localeCompare(dateKey(b.key)));
    const items = Array.isArray(options.items) ? options.items : [];
    const forecastMeta = options.forecastMeta && typeof options.forecastMeta === 'object' ? options.forecastMeta : {};
    const sourceCount = Number.isFinite(Number(forecastMeta.sourceCount)) ? Number(forecastMeta.sourceCount) : (forecast.length ? 1 : 0);
    const sourceDate = dateKey(forecastMeta.activeDate) || baseDate;
    const coverageEnd = dateKey(forecastMeta.coverageEnd) || (forecast.length ? dateKey(forecast[forecast.length - 1]?.key) : '');
    const sourceLoaded = sourceCount > 0;
    const datesAligned = !!baseDate && sourceDate === baseDate;
    const hasNextDay = forecast.some(day => dateKey(day?.key) === nextDate);
    const ready = sourceLoaded && datesAligned && hasNextDay;
    const coverageComplete = ready && coverageEnd >= endDate;
    const closureSafe = coverageComplete;
    const status = !sourceLoaded ? 'missing_source'
      : !datesAligned ? 'date_mismatch'
      : !hasNextDay ? 'missing_j1'
      : !coverageComplete ? 'incomplete_horizon'
      : 'ready';
    if (!ready) {
      return {
        baseDate,
        nextDate,
        endDate,
        forecast,
        categories:[],
        recommendations:[],
        byRoom:new Map(),
        ready,
        status,
        sourceLoaded,
        sourceDate,
        datesAligned,
        coverageEnd,
        coverageComplete:false,
        closureSafe:false
      };
    }
    const margins = options.margins && typeof options.margins === 'object' ? options.margins : {};
    const rowByRoom = new Map(rows.map(row => [roomNumber(row?.roomNumber || row?.room?.room_num), row]));
    const assigned = new Map();

    items.forEach(item => {
      const arrival = dateKey(item?.arrivalDate || item?.ARRIVAL_DATE || item?.date);
      const room = roomNumber(item?.roomNumber || item?.ROOM_NUM);
      if (!room || !rowByRoom.has(room) || arrival <= baseDate || arrival > endDate || sofaNeed(item) <= 0) return;
      const id = reservationId(item);
      if (id && recoucheIdsForDate(options.recoucheIdsByDate, arrival).has(id)) return;
      const physicalRow = rowByRoom.get(room);
      const type = roomType(physicalRow?.roomType || physicalRow?.room?.roomType || item?.roomType || item?.ROOM_TYPE);
      const key = `${type}::${room}`;
      const current = assigned.get(key);
      if (!current || arrival < current.date) assigned.set(key, {
        roomNumber:room,
        category:type,
        date:arrival,
        offset:dayOffset(baseDate, arrival),
        need:sofaNeed(item),
        isGroup:!!text(item?.groupName || item?.GUES_GROUPNAME || item?.GROUP_NAME)
      });
    });

    const recommendations = [];
    const categories = CATEGORIES.map(category => {
      const inventory = rows.filter(row => roomType(row?.roomType || row?.room?.roomType) === category);
      const daily = forecast.map(day => ({ date:dateKey(day.key), need:Number(day?.sofaTypeCounts?.[category] || 0) }));
      const j1Need = Number(daily.find(day => day.date === nextDate)?.need || 0);
      const peakNeed = daily.reduce((max, day) => Math.max(max, day.need), 0);
      const margin = Math.max(0, Math.min(20, Math.round(Number(margins[category] || 0))));
      const target = Math.min(inventory.length, Math.max(j1Need, peakNeed + margin));
      const candidates = inventory.map(row => {
        const number = roomNumber(row?.roomNumber || row?.room?.room_num);
        const future = assigned.get(`${category}::${number}`);
        const blocked = row?.mode === 'blocked' || row?.folsStatus === 'hs';
        const currentKey = !!row?.current?.detected;
        let score = currentKey ? 500 : 0;
        if (row?.mode === 'free' || row?.mode === 'departure') score += 80;
        if (row?.mode === 'present') score -= 40;
        if (future?.date === nextDate && !future.isGroup) score += 100000;
        else if (future?.date === nextDate && future.isGroup) score += 8000;
        else if (future) score += 3000 - (future.offset * 100);
        return { row, roomNumber:number, category, blocked, currentKey, future, score };
      }).filter(candidate => !candidate.blocked)
        .sort((a,b) => (b.score - a.score) || Number(a.roomNumber) - Number(b.roomNumber));
      const selected = candidates.slice(0, target);
      const j1Assigned = candidates.filter(candidate => candidate.future?.date === nextDate && !candidate.future?.isGroup);
      j1Assigned.forEach(candidate => {
        if (selected.includes(candidate)) return;
        const replaceIndex = selected.findIndex(item => item.future?.date !== nextDate);
        if (replaceIndex >= 0) selected.splice(replaceIndex, 1, candidate);
        else if (selected.length < inventory.length) selected.push(candidate);
      });
      selected.sort((a,b) => Number(a.roomNumber) - Number(b.roomNumber));
      const selectedNumbers = new Set(selected.map(candidate => candidate.roomNumber));
      selected.forEach(candidate => {
        const priority = candidate.future?.isGroup ? 'group' : candidate.future?.date === nextDate ? 'j1' : candidate.future ? 'assigned' : candidate.currentKey ? 'keep' : 'pool';
        const action = candidate.currentKey ? 'keep' : 'open';
        const reason = priority === 'group' ? `Chambre groupe attribuée${candidate.future?.date ? ` le ${candidate.future.date.split('-').reverse().join('/')}` : ''}, prioritaire dans le parc sans modifier son volume`
          : priority === 'j1' ? 'Arrivée sofa individuelle attribuée demain'
          : priority === 'assigned' ? `Arrivée sofa attribuée le ${candidate.future.date.split('-').reverse().join('/')}`
          : priority === 'keep' ? 'Clé déjà présente, conservée pour stabiliser le parc'
          : 'Clé à ajouter pour couvrir le pic hebdomadaire';
        recommendations.push({ roomNumber:candidate.roomNumber, category, priority, action, reason, currentKey:candidate.currentKey, date:candidate.future?.date || '' });
      });
      const closeCandidates = candidates.filter(candidate => candidate.currentKey && !selectedNumbers.has(candidate.roomNumber));
      if (closureSafe) closeCandidates.forEach(candidate => recommendations.push({
        roomNumber:candidate.roomNumber,
        category,
        priority:'close',
        action:'close',
        reason:'Clé excédentaire jusqu’au dimanche couvert par le portefeuille',
        currentKey:true,
        date:''
      }));
      const currentKeys = candidates.filter(candidate => candidate.currentKey).length;
      const rawDelta = selected.length - currentKeys;
      return {
        category,
        inventory:inventory.length,
        currentKeys,
        j1Need,
        peakNeed,
        margin,
        target:selected.length,
        delta:closureSafe ? rawDelta : Math.max(0, rawDelta),
        closuresBlocked:closureSafe ? 0 : closeCandidates.length,
        openCount:selected.filter(candidate => !candidate.currentKey).length,
        keepCount:selected.filter(candidate => candidate.currentKey).length,
        closeCount:closureSafe ? closeCandidates.length : 0,
        daily
      };
    });
    const byRoom = new Map(recommendations.map(item => [item.roomNumber, item]));
    return { baseDate, nextDate, endDate, forecast, categories, recommendations, byRoom, ready, status, sourceLoaded, sourceDate, datesAligned, coverageEnd, coverageComplete, closureSafe };
  }

  window.ORIS_PLAN_SOFA_POOL = Object.freeze({ CATEGORIES:CATEGORIES.slice(), dateKey, addDays, horizonEnd, build });
})();
