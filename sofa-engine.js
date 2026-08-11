(function(){
  'use strict';

  const STORAGE_KEY = 'aar_soiree_rules_v2';
  const DEFAULT_RULES = Object.freeze({
    '1A+0E':'0','1A+1E':'1','1A+2E':'2','1A+3E':'2',
    '2A+0E':'0','2A+1E':'1','2A+2E':'2','2A+3E':'2','2A+4E':'2',
    '3A+0E':'1','3A+1E':'2'
  });
  const FALLBACK_ROOM_TYPES = Object.freeze({
    TRI:   Object.freeze({ adults:2, children:1, sofa:1 }),
    STDM:  Object.freeze({ adults:2, children:2, sofa:2 }),
    PRIVS: Object.freeze({ adults:2, children:1, sofa:1 }),
    PRIVM: Object.freeze({ adults:2, children:2, sofa:2 }),
    SGE:   Object.freeze({ adults:2, children:1, sofa:1 }),
    EXEC:  Object.freeze({ adults:2, children:2, sofa:2 })
  });

  function safeJsonParse(raw, fallback){
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function normalizeCount(value){
    const number = parseInt(String(value == null ? '' : value).replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function normalizeNeed(value){
    const number = Number(value);
    if (number >= 2) return 2;
    if (number >= 1) return 1;
    return 0;
  }

  function normalizeRuleMap(value){
    const source = value && typeof value === 'object' ? value : {};
    const merged = { ...DEFAULT_RULES };
    Object.entries(source).forEach(([key, need]) => {
      const cleanKey = String(key || '').trim().toUpperCase();
      if (!/^\d+A\+\d+E$/.test(cleanKey)) return;
      merged[cleanKey] = String(normalizeNeed(need));
    });
    return merged;
  }

  function loadRuleMap(){
    try {
      const stored = safeJsonParse(localStorage.getItem(STORAGE_KEY) || 'null', null);
      return normalizeRuleMap(stored?.sofa);
    } catch (_) {
      return normalizeRuleMap({});
    }
  }

  function getRuleSignature(value){
    const source = value && typeof value === 'object' && value.sofa ? value.sofa : value;
    const rules = normalizeRuleMap(source || loadRuleMap());
    return Object.keys(rules)
      .sort()
      .map(key => `${key}:${rules[key]}`)
      .join('|');
  }

  function normalizeRoomType(value){
    const compact = String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[\s_-]+/g, '');
    const aliases = {
      TRI: 'TRI',
      STD: 'STDM',
      STDM: 'STDM',
      PRIV: 'PRIVS',
      PRIVS: 'PRIVS',
      PRIVSM: 'PRIVS',
      PRIVM: 'PRIVM',
      EXE: 'EXEC',
      EXEC: 'EXEC',
      SGE: 'SGE'
    };
    return aliases[compact] || '';
  }

  function getRoomTypeModel(roomType){
    const normalized = normalizeRoomType(roomType);
    if (!normalized) return null;
    const runtimeModel = window.HOTEL_MODEL?.roomTypes?.[normalized];
    const fallback = FALLBACK_ROOM_TYPES[normalized];
    const source = runtimeModel || fallback;
    if (!source) return null;
    const adults = normalizeCount(source.adults);
    const children = normalizeCount(source.children);
    return {
      code: normalized,
      adults,
      children,
      maxOccupants: adults + children,
      sofaCapacity: normalizeNeed(source.sofa)
    };
  }

  function normalizeIdentity(value){
    return String(value == null ? '' : value)
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function normalizeBaseGuestName(value){
    const firstGuest = String(value == null ? '' : value)
      .split(/\s+-\s+/)[0]
      .trim();
    return normalizeIdentity(firstGuest)
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeCoverageEntry(entry){
    const source = entry && typeof entry === 'object' ? entry : {};
    return {
      entryKey: String(source.entryKey == null ? '' : source.entryKey).trim(),
      dossierId: normalizeIdentity(source.dossierId),
      arrivalDate: String(source.arrivalDate == null ? '' : source.arrivalDate).trim(),
      departureDate: String(source.departureDate == null ? '' : source.departureDate).trim(),
      reference: normalizeIdentity(source.reference),
      guestName: String(source.guestName == null ? '' : source.guestName).trim(),
      baseGuestName: normalizeBaseGuestName(source.guestName),
      roomType: normalizeRoomType(source.roomType),
      adults: normalizeCount(source.adults),
      children: normalizeCount(source.children),
      eligible: source.eligible === true
    };
  }

  function buildMultiRoomCoverage(entries = []){
    const contexts = new Map();
    const groups = new Map();

    (Array.isArray(entries) ? entries : []).forEach(rawEntry => {
      const entry = normalizeCoverageEntry(rawEntry);
      if (!entry.entryKey) return;

      const roomModel = getRoomTypeModel(entry.roomType);
      if (
        !entry.eligible ||
        !entry.dossierId ||
        !entry.arrivalDate ||
        !entry.departureDate ||
        !entry.baseGuestName
      ) {
        return;
      }

      const groupKey = JSON.stringify([
        entry.dossierId,
        entry.arrivalDate,
        entry.departureDate,
        entry.baseGuestName,
        entry.reference
      ]);
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push({ entry, roomModel, groupKey });
    });

    groups.forEach(groupEntries => {
      const roomCount = groupEntries.length;
      if (roomCount < 2) return;
      const allRoomTypesKnown = groupEntries.every(item => !!item.roomModel);
      const totalOccupants = groupEntries.reduce(
        (sum, item) => sum + item.entry.adults + item.entry.children,
        0
      );
      const totalCapacity = groupEntries.reduce(
        (sum, item) => sum + Number(item.roomModel?.maxOccupants || 0),
        0
      );
      const occupancyCovered =
        allRoomTypesKnown &&
        totalOccupants <= totalCapacity;
      const first = groupEntries[0]?.entry || {};
      const entryKeys = groupEntries.map(item => item.entry.entryKey);

      groupEntries.forEach(({ entry, groupKey }) => {
        contexts.set(entry.entryKey, {
          entryKey: entry.entryKey,
          dossierId: entry.dossierId,
          arrivalDate: entry.arrivalDate,
          departureDate: entry.departureDate,
          reference: entry.reference,
          guestName: entry.guestName,
          baseGuestName: entry.baseGuestName,
          roomType: entry.roomType,
          adults: entry.adults,
          children: entry.children,
          eligible: entry.eligible,
          groupKey,
          entryKeys: entryKeys.slice(),
          roomCount,
          totalOccupants,
          totalCapacity,
          allRoomTypesKnown,
          occupancyCovered,
          groupGuestName: first.guestName || ''
        });
      });
    });

    return contexts;
  }

  function calculate(options = {}){
    const adults = normalizeCount(options.adults);
    const children = normalizeCount(options.children);
    const totalOccupants = adults + children;
    const ruleKey = `${adults}A+${children}E`;
    const sofaRules = normalizeRuleMap(options.sofaRules || options.rules?.sofa || loadRuleMap());
    const ruleNeed = normalizeNeed(sofaRules[ruleKey]);
    const babyDetected = !!options.babyDetected;
    const applyBabyAdjustment = options.applyBabyAdjustment !== false;
    const babyPlusOneSofaRule = applyBabyAdjustment && babyDetected && totalOccupants === 4;
    const sofaNeed = babyPlusOneSofaRule ? 1 : ruleNeed;
    const babySofaNeed = babyDetected && totalOccupants >= 4 ? sofaNeed : 0;
    const roomType = normalizeRoomType(options.roomType);
    const roomModel = getRoomTypeModel(roomType);
    const sofaCapacity = Number(roomModel?.sofaCapacity || 0);
    const maxOccupants = Number(roomModel?.maxOccupants || 0);
    const sofaCapacityExceeded = !!roomModel && sofaNeed > sofaCapacity;
    const lineOccupancyCapacityExceeded = !!roomModel && totalOccupants > maxOccupants;
    const lineCriticalOccupancy = totalOccupants >= 5;
    const suppliedMultiRoomContext =
      options.multiRoomContext && typeof options.multiRoomContext === 'object'
        ? options.multiRoomContext
        : null;
    const multiRoomOccupancyCovered = suppliedMultiRoomContext?.occupancyCovered === true;
    const multiRoomContext = suppliedMultiRoomContext
      ? {
          entryKey: String(suppliedMultiRoomContext.entryKey || '').trim(),
          dossierId: String(suppliedMultiRoomContext.dossierId || '').trim(),
          arrivalDate: String(suppliedMultiRoomContext.arrivalDate || '').trim(),
          departureDate: String(suppliedMultiRoomContext.departureDate || '').trim(),
          reference: String(suppliedMultiRoomContext.reference || '').trim(),
          baseGuestName: String(suppliedMultiRoomContext.baseGuestName || '').trim(),
          groupKey: String(suppliedMultiRoomContext.groupKey || '').trim(),
          entryKeys: Array.isArray(suppliedMultiRoomContext.entryKeys)
            ? suppliedMultiRoomContext.entryKeys.map(value => String(value || '').trim()).filter(Boolean)
            : [],
          roomCount: normalizeCount(suppliedMultiRoomContext.roomCount),
          totalOccupants: normalizeCount(suppliedMultiRoomContext.totalOccupants),
          totalCapacity: normalizeCount(suppliedMultiRoomContext.totalCapacity),
          allRoomTypesKnown: suppliedMultiRoomContext.allRoomTypesKnown === true,
          occupancyCovered: multiRoomOccupancyCovered
        }
      : null;
    const occupancyCapacityExceeded = multiRoomOccupancyCovered
      ? false
      : lineOccupancyCapacityExceeded;
    const criticalOccupancy = multiRoomOccupancyCovered
      ? false
      : lineCriticalOccupancy;

    let alertLevel = '';
    let alertCode = '';
    let alertReason = '';
    let alertTechnicalReason = '';
    if (criticalOccupancy) {
      alertLevel = 'critical';
      alertCode = 'five_plus_occupants';
      alertReason = roomType ? `${roomType} avec ${totalOccupants} pax` : `${totalOccupants} pax`;
      alertTechnicalReason = `${totalOccupants} occupants`;
    } else if (occupancyCapacityExceeded || sofaCapacityExceeded) {
      alertLevel = 'capacity';
      alertCode = occupancyCapacityExceeded ? 'room_occupancy_capacity' : 'room_sofa_capacity';
      const reasons = [];
      if (occupancyCapacityExceeded) reasons.push(`${totalOccupants} pax / capacité ${maxOccupants}`);
      if (sofaCapacityExceeded) reasons.push(`${sofaNeed} sofas / capacité ${sofaCapacity}`);
      alertReason = roomType ? `${roomType} avec ${adults}/${children}` : `${adults}/${children}`;
      alertTechnicalReason = [roomType, ...reasons].filter(Boolean).join(' · ');
    }

    return {
      adults,
      children,
      totalOccupants,
      ruleKey,
      ruleNeed,
      sofaNeed,
      babyDetected,
      babyPlusOneSofaRule,
      babySofaNeed,
      roomType,
      sofaCapacity,
      maxOccupants,
      sofaCapacityExceeded,
      lineOccupancyCapacityExceeded,
      lineCriticalOccupancy,
      occupancyCapacityExceeded,
      criticalOccupancy,
      multiRoomOccupancyCovered,
      multiRoomContext,
      alertLevel,
      alertCode,
      alertReason,
      alertTechnicalReason,
      hasAlert: !!alertLevel
    };
  }

  window.ORIS_SOFA_ENGINE = Object.freeze({
    version: 3,
    STORAGE_KEY,
    DEFAULT_RULES,
    normalizeRuleMap,
    loadRuleMap,
    getRuleSignature,
    normalizeRoomType,
    getRoomTypeModel,
    buildMultiRoomCoverage,
    calculate
  });
})();
