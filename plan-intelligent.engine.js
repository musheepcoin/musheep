(function(){
  'use strict';

  function text(value){ return String(value == null ? '' : value).trim(); }
  function loose(value){
    return text(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
  function roomNumber(value){
    const match = text(value).match(/\d{2,4}/);
    return match ? String(parseInt(match[0], 10)) : '';
  }
  function roomType(value){
    const compact = text(value).toUpperCase().replace(/[\s_-]+/g, '');
    return ({ STD:'STDM', STDM:'STDM', TRI:'TRI', PRIV:'PRIVS', PRIVS:'PRIVS', PRIVSM:'PRIVS', PRIVM:'PRIVM', EXE:'EXEC', EXEC:'EXEC', SGE:'SGE' })[compact] || compact;
  }
  function sofaCapacity(value){
    const type = roomType(value);
    if (['STDM','PRIVM','EXEC'].includes(type)) return 2;
    if (['TRI','PRIVS','SGE'].includes(type)) return 1;
    return 0;
  }
  function dateKey(value){
    const raw = text(value);
    let match = raw.match(/^(20\d{2})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    match = raw.match(/^(\d{2})\/(\d{2})\/(20\d{2})/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  }
  function roomMode(room){
    const state = loose(room?.roomState || room?.RoomState);
    const stay = loose(room?.meta?.Stay || room?.Stay);
    const departureExpected = (stay.includes('depart') || /^d\s*part/.test(stay)) && stay.includes('attendu');
    const arrivalExpected = stay.includes('preaffect') || stay.includes('arriv');
    if (state.includes('hors service')) return 'blocked';
    if (departureExpected) return 'departure';
    if (arrivalExpected) return 'free';
    if (state.startsWith('occup')) {
      return 'present';
    }
    if (stay.includes('present')) return 'present';
    return 'free';
  }
  function folsStatus(room, mode, assignment, isRecouche = false){
    const stay = loose(room?.meta?.Stay || room?.Stay);
    if (mode === 'blocked') return 'hs';
    if (isRecouche) return 'arrival';
    if (mode === 'departure') return 'departure';
    if (stay.includes('preaffect') || stay.includes('arriv')) return 'arrival';
    if (mode === 'present') return 'present';
    if (assignment) return 'arrival';
    return 'available';
  }
  function currentSofa(room){
    const meta = room?.meta || {};
    const reason = loose(meta.MinMainReason || meta.MINMAINREASON);
    const commentRaw = text(meta.MinMainComment || meta.MINMAINCOMMENT);
    const comment = loose(commentRaw);
    const capacity = sofaCapacity(room?.roomType || room?.RoomType);
    const detected = reason.includes('equipement chambre');
    if (!detected) {
      return { count:0, confidence:'exact', source:'Aucun équipement chambre', raw:commentRaw, valid:true, detected:false };
    }
    if (!comment) {
      return { count:0, confidence:'unknown', source:'Équipement Chambre sans commentaire', raw:commentRaw, valid:false, detected:true, reason:'Commentaire équipement manquant' };
    }
    let count = 0;
    let confidence = 'exact';
    let source = commentRaw;
    if (/\b2\s*sofas?\b/i.test(commentRaw)) count = 2;
    else if (/\b1\s*sofas?\b/i.test(commentRaw)) count = 1;
    else if (/\bsofas?\b/i.test(commentRaw)) { count = 1; confidence = 'inferred'; }
    else if (comment.includes('famille')) { count = capacity; confidence = 'inferred'; }
    else return { count:0, confidence:'unknown', source, raw:commentRaw, valid:false, detected:true, reason:'Configuration équipement non reconnue' };
    if (count > capacity) {
      return { count, confidence:'conflict', source, raw:commentRaw, valid:false, detected:true, reason:`${count} sofas indiqués pour une capacité de ${capacity}` };
    }
    return { count, confidence, source, raw:commentRaw, valid:true, detected:true };
  }
  function overrideTarget(overrides, key){
    if (!overrides || !Object.prototype.hasOwnProperty.call(overrides, key)) return null;
    const raw = overrides[key];
    const value = raw && typeof raw === 'object' ? raw.target : raw;
    if (value === '' || value == null || value === 'auto') return null;
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, Math.min(2, Math.round(count))) : null;
  }
  function actionMeta(action, current, target){
    if (action === 'open') return { label:`Ouvrir +${target - current}`, short:`+${target - current}`, tone:'open' };
    if (action === 'close') return { label:`Fermer ${current - target}`, short:`−${current - target}`, tone:'close' };
    if (action === 'keep') return { label:`Laisser ${target}`, short:`=${target}`, tone:'keep' };
    if (action === 'review') return { label:'À contrôler', short:'!', tone:'review' };
    if (action === 'recouche') return { label:'Recouche', short:'R', tone:'recouche' };
    if (action === 'present') return { label:'Présent', short:'', tone:'present' };
    if (action === 'blocked') return { label:'Hors service', short:'HS', tone:'blocked' };
    return { label:'Rien à faire', short:'0', tone:'none' };
  }

  function roomPresentation(row, visibleStatuses = []){
    const visible = new Set(Array.isArray(visibleStatuses) ? visibleStatuses : []);
    const currentStatus = text(row?.folsStatus) || 'available';
    const futureStatus = text(row?.turnoverStatus);
    if (!futureStatus) {
      return { visible:visible.has(currentStatus), folsStatus:currentStatus, turnoverStatus:'' };
    }
    const showDeparture = visible.has('departure');
    const showFuture = visible.has(futureStatus);
    if (showDeparture && showFuture) {
      return { visible:true, folsStatus:'departure', turnoverStatus:futureStatus };
    }
    if (showDeparture) {
      return { visible:true, folsStatus:'departure', turnoverStatus:'' };
    }
    if (showFuture) {
      return { visible:true, folsStatus:futureStatus, turnoverStatus:'' };
    }
    return { visible:false, folsStatus:currentStatus, turnoverStatus:'' };
  }

  function buildFloorLayout(rows = []){
    const roomNumbers = [...new Set((Array.isArray(rows) ? rows : []).map(item =>
      roomNumber(item?.roomNumber || item?.room?.room_num || item?.room_num || item)
    ).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
    const upper = roomNumbers.filter(number => Number(number) % 2 === 1);
    const lower = roomNumbers.filter(number => Number(number) % 2 === 0);
    const positions = {};
    upper.forEach((number, col) => { positions[number] = { row:0, col }; });
    lower.forEach((number, col) => { positions[number] = { row:1, col }; });
    return {
      upper,
      lower,
      columns:Math.max(upper.length, lower.length, 1),
      positions
    };
  }

  function buildHotelFloorLayout(rows = [], floor = ''){
    const floorNumber = Number(text(floor).match(/\d+/)?.[0] || 0);
    if (floorNumber === 1) {
      const numbers = [...new Set(rows.map(item => roomNumber(item?.roomNumber || item?.room?.room_num || item?.room_num || item)).filter(Boolean))];
      const positions = {};
      const entranceBlock = numbers.filter(number => Number(number) >= 129 && Number(number) <= 134).sort((a,b) => Number(a) - Number(b));
      const verticalBranch = numbers.filter(number => Number(number) >= 135 && Number(number) <= 150).sort((a,b) => Number(a) - Number(b));
      const rightWing = numbers.filter(number => Number(number) >= 160).sort((a,b) => Number(a) - Number(b));
      const placeHorizontal = (list, offset) => {
        const upper = list.filter(number => Number(number) % 2 === 1);
        const lower = list.filter(number => Number(number) % 2 === 0);
        upper.forEach((number, col) => { positions[number] = { row:0, col:offset + col }; });
        lower.forEach((number, col) => { positions[number] = { row:1, col:offset + col }; });
      };
      placeHorizontal(entranceBlock, 0);
      verticalBranch.forEach(number => {
        const numeric = Number(number);
        positions[number] = { row:2 + Math.floor((numeric - 135) / 2), col:numeric % 2 === 0 ? 13 : 14 };
      });
      placeHorizontal(rightWing, 18);
      return {
        columns:32,
        rows:10,
        positions,
        liftCol:16,
        liftRow:0,
        liftRowSpan:2,
        description:'bloc 129–134 à gauche · branche 135–150 · ascenseurs · aile 160–186 à droite'
      };
    }
    if (floorNumber === 2) {
      const numbers = [...new Set(rows.map(item => roomNumber(item?.roomNumber || item?.room?.room_num || item?.room_num || item)).filter(Boolean))];
      const positions = {};
      const leftHorizontal = numbers.filter(number => Number(number) >= 220 && Number(number) <= 242).sort((a,b) => Number(a) - Number(b));
      const centerVertical = numbers.filter(number => Number(number) >= 243 && Number(number) <= 258).sort((a,b) => Number(a) - Number(b));
      const rightHorizontal = numbers.filter(number => Number(number) >= 260).sort((a,b) => Number(a) - Number(b));
      const placeHorizontal = (list, offset) => {
        const upper = list.filter(number => Number(number) % 2 === 1);
        const lower = list.filter(number => Number(number) % 2 === 0);
        upper.forEach((number, col) => { positions[number] = { row:0, col:offset + col }; });
        lower.forEach((number, col) => { positions[number] = { row:1, col:offset + col }; });
      };
      placeHorizontal(leftHorizontal, 0);
      centerVertical.forEach(number => {
        const numeric = Number(number);
        positions[number] = {
          row:2 + Math.floor((numeric - 243) / 2),
          col:numeric % 2 === 0 ? 13 : 14
        };
      });
      placeHorizontal(rightHorizontal, 18);
      return {
        columns:32,
        rows:10,
        positions,
        liftCol:16,
        liftRow:0,
        liftRowSpan:2,
        description:'aile 220 à gauche · branche 243–258 au centre · aile 260 à droite'
      };
    }
    if (floorNumber === 3) {
      const leftRows = rows.filter(item => Number(roomNumber(item?.roomNumber || item?.room?.room_num || item?.room_num || item)) < 360);
      const rightRows = rows.filter(item => Number(roomNumber(item?.roomNumber || item?.room?.room_num || item?.room_num || item)) >= 360);
      const left = buildFloorLayout(leftRows);
      const right = buildFloorLayout(rightRows);
      const leftOffset = 0;
      const rightOffset = 18;
      const positions = {};
      Object.entries(left.positions).forEach(([number, position]) => { positions[number] = { row:position.row, col:leftOffset + position.col }; });
      Object.entries(right.positions).forEach(([number, position]) => { positions[number] = { row:position.row, col:rightOffset + position.col }; });
      return {
        columns:32,
        positions,
        liftCol:16,
        liftRow:0,
        liftRowSpan:2,
        rows:2,
        description:'aile 320 à gauche · ascenseurs au centre · aile 360 à droite'
      };
    }
    const base = buildFloorLayout(rows);
    const positions = {};
    Object.entries(base.positions).forEach(([number, position]) => { positions[number] = { row:position.row, col:position.col + 18 }; });
    return {
      columns:32,
      positions,
      liftCol:16,
      liftRow:0,
      liftRowSpan:2,
      rows:2,
      description:'impaires en haut, paires en bas'
    };
  }

  function buildModel(options = {}){
    const rooms = Array.isArray(options.rooms) ? options.rooms : [];
    const opening = options.openingSnapshot && typeof options.openingSnapshot === 'object'
      ? options.openingSnapshot
      : { assignments:[], rows:[], dateKey:'', importedAt:'' };
    const assignments = Array.isArray(opening.assignments) ? opening.assignments : [];
    const roomStateMeta = options.roomStateMeta && typeof options.roomStateMeta === 'object' ? options.roomStateMeta : null;
    const overrides = options.overrides && typeof options.overrides === 'object' ? options.overrides : {};
    const recoucheRooms = options.recoucheRooms && typeof options.recoucheRooms === 'object' ? options.recoucheRooms : {};
    const openingDate = dateKey(opening.dateKey);
    const roomStateDate = dateKey(roomStateMeta?.referenceDate);
    const openingReady = !!(opening.importedAt || assignments.length);
    const roomStateReady = !!(roomStateMeta && rooms.length);
    const datesMatch = !!(openingDate && roomStateDate && openingDate === roomStateDate);
    const ready = openingReady && roomStateReady && datesMatch;
    const roomMap = new Map(rooms.map(room => [roomNumber(room?.room_num), room]).filter(([key]) => key));
    const byAssignedRoom = new Map();
    const unassigned = [];
    const missingRooms = [];

    assignments.forEach(assignment => {
      const number = roomNumber(assignment?.room);
      if (!number) {
        unassigned.push(assignment);
        return;
      }
      if (!roomMap.has(number)) {
        missingRooms.push({ room:number, assignment });
        return;
      }
      if (!byAssignedRoom.has(number)) byAssignedRoom.set(number, []);
      byAssignedRoom.get(number).push(assignment);
    });

    const issues = [];
    if (!openingReady) issues.push({ code:'missing_opening', label:'Arrival List / Ouverture absente' });
    if (!roomStateReady) issues.push({ code:'missing_room_state', label:'Room State absent' });
    if (openingReady && roomStateReady && !datesMatch) issues.push({ code:'date_mismatch', label:`Dates différentes : Ouverture ${openingDate || '?'} / Room State ${roomStateDate || '?'}` });
    missingRooms.forEach(item => issues.push({ code:'missing_room', room:item.room, assignment:item.assignment, label:`Chambre ${item.room} absente du Room State` }));
    unassigned.filter(item => Number(item?.sofas || 0) > 0).forEach(item => issues.push({ code:'unassigned_sofa', assignment:item, label:`${text(item?.name) || 'Client'} : ${Number(item?.sofas || 0)} sofa(s) sans chambre` }));

    const byRoom = new Map();
    const rows = rooms.map(room => {
      const number = roomNumber(room?.room_num);
      const mode = roomMode(room);
      const current = currentSofa(room);
      const linked = byAssignedRoom.get(number) || [];
      const assignment = linked[0] || null;
      const recouche = recoucheRooms[number] || null;
      const isRecouche = !!recouche;
      const type = roomType(room?.roomType || room?.RoomType);
      const capacity = sofaCapacity(type);
      const key = `${openingDate}::${number}`;
      const forcedTarget = overrideTarget(overrides, key);
      const automaticTarget = assignment ? Math.max(0, Number(assignment?.sofas || 0)) : 0;
      const target = forcedTarget == null ? automaticTarget : forcedTarget;
      let action = 'none';
      let reason = '';

      if (!openingReady || !roomStateReady) {
        action = 'none';
        reason = issues[0]?.label || 'Sources à synchroniser';
      } else if (!datesMatch) {
        action = 'none';
        reason = issues[0]?.label || 'Sources à synchroniser';
      } else if (mode === 'blocked') {
        action = assignment ? 'review' : 'blocked';
        reason = assignment ? 'Une arrivée est affectée à une chambre hors service' : 'Chambre hors service';
      } else if (isRecouche) {
        action = 'recouche';
        reason = 'Recouche confirmée par les deux réservations détectées dans l’Assistant';
      } else if (mode === 'present') {
        action = assignment ? 'review' : 'present';
        reason = assignment ? 'Une arrivée est affectée à une chambre occupée' : 'Séjour continu présent : aucune action Night';
      } else if (linked.length > 1) {
        action = 'review';
        reason = `${linked.length} arrivées affectées à la même chambre`;
      } else if (assignment && roomType(assignment?.roomType) !== type) {
        action = 'review';
        reason = `Catégorie Ouverture ${roomType(assignment?.roomType) || '?'} / Room State ${type || '?'}`;
      } else if (!current.valid) {
        action = 'review';
        reason = current.reason || 'Configuration actuelle incertaine';
      } else if (target > capacity) {
        action = 'review';
        reason = `Cible ${target} sofas supérieure à la capacité ${capacity}`;
      } else if (target > current.count) {
        action = 'open';
        reason = `${current.count} actuellement → ${target} nécessaire${forcedTarget == null ? '' : ' (correction manuelle)'}`;
      } else if (target < current.count) {
        action = 'close';
        reason = `${current.count} actuellement → ${target} nécessaire${forcedTarget == null ? '' : ' (correction manuelle)'}`;
      } else if (target > 0) {
        action = 'keep';
        reason = `${target} sofa${target > 1 ? 's' : ''} déjà prêt${target > 1 ? 's' : ''}`;
      } else {
        action = 'none';
        reason = 'Aucun sofa nécessaire';
      }

      if (action === 'review') issues.push({ code:'room_review', room:number, assignment, label:`Chambre ${number} : ${reason}` });
      const meta = actionMeta(action, current.count, target);
      const turnoverStatus = datesMatch && mode === 'departure'
        ? (assignment ? 'arrival' : 'available')
        : '';
      const keyDecisionSafe = ready
        && mode !== 'blocked'
        && mode !== 'present'
        && !isRecouche
        && linked.length <= 1
        && (!assignment || roomType(assignment?.roomType) === type)
        && target <= capacity;
      const folsKeyAction = !keyDecisionSafe
        ? 'none'
        : !current.detected && target > 0
          ? 'add'
          : current.detected && target === 0 ? 'remove' : 'none';
      const folsAction = folsKeyAction === 'add'
        ? 'open'
        : folsKeyAction === 'remove'
          ? 'close'
          : action === 'review'
            ? 'review'
            : ['open','keep','close'].includes(action) ? 'keep' : 'none';
      const folsMeta = folsAction === 'open'
        ? { label:'Ajouter la clé', reason:`Clé absente · ${target} sofa${target > 1 ? 's' : ''} nécessaire${target > 1 ? 's' : ''}`, tone:'open' }
        : folsAction === 'close'
          ? { label:'Retirer la clé', reason:'Clé présente · aucun sofa nécessaire', tone:'close' }
          : folsAction === 'keep'
            ? { label:'Clé correcte', reason:target > 0 ? 'Clé présente · besoin sofa couvert dans FOLS' : 'Clé absente · aucun sofa nécessaire', tone:'keep' }
            : folsAction === 'review'
              ? { label:'À contrôler', reason, tone:'review' }
              : { label:meta.label, reason, tone:meta.tone };
      const row = {
        room,
        roomNumber:number,
        roomType:type,
        mode,
        current,
        target,
        automaticTarget,
        forcedTarget,
        assignment,
        assignments:linked,
        recouche,
        isRecouche,
        folsStatus:folsStatus(room, mode, assignment, isRecouche),
        turnoverStatus,
        action,
        folsKeyAction,
        folsAction,
        folsActionLabel:folsMeta.label,
        folsActionReason:folsMeta.reason,
        folsTone:folsMeta.tone,
        requiresIntervention:folsKeyAction !== 'none',
        actionLabel:meta.label,
        actionShort:meta.short,
        tone:meta.tone,
        reason
      };
      byRoom.set(number, row);
      return row;
    });

    const summary = { open:0, keep:0, close:0, review:0, none:0, present:0, recouche:0, blocked:0 };
    rows.forEach(row => { summary[row.action] = Number(summary[row.action] || 0) + 1; });
    return {
      version:1,
      ready,
      openingReady,
      roomStateReady,
      datesMatch,
      openingDate,
      roomStateDate,
      rows,
      byRoom,
      assignments,
      unassigned,
      missingRooms,
      issues,
      summary
    };
  }

  window.ORIS_PLAN_ENGINE = Object.freeze({
    loose,
    roomNumber,
    roomType,
    sofaCapacity,
    dateKey,
    roomMode,
    currentSofa,
    buildFloorLayout,
    buildHotelFloorLayout,
    folsStatus,
    roomPresentation,
    buildModel
  });
})();
