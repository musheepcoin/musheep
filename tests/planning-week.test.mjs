import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const planning = readFileSync(new URL('../planning.module.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function section(source, start, end){
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `section introuvable: ${start}`);
  return source.slice(from, to);
}

function loadRuntime(rows, recouches = new Map()){
  const sandbox = {
    Date, Map, Set, Intl,
    window: {},
    localStorage: { getItem: () => '2026-09-01T08:00:00.000Z' },
    LS_IMPORT_DATE_INDIV: 'import-date',
    getHotelMemoryRows: () => rows,
    getDashboardActiveDateObj: () => new Date('2026-09-02T00:00:00Z'),
    startOfWeekUtc: date => {
      const next = new Date(date);
      next.setUTCDate(next.getUTCDate() + (next.getUTCDay() === 0 ? -6 : 1 - next.getUTCDay()));
      return next;
    },
    addDaysUtc: (date, days) => { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; },
    toIsoDateUtc: date => date.toISOString().slice(0, 10),
    parseFolsDateCell: value => value ? new Date(`${value}T00:00:00Z`) : null,
    formatShortFrDayLabel: date => date.toISOString().slice(0, 10),
    pick: (row, keys) => keys.map(key => row[key]).find(value => value != null && value !== '') || '',
    parsePositiveIntLoose: value => { const number = Number(value); return number > 0 ? number : null; },
    normalizeGroupLabel: value => String(value).trim().toUpperCase(),
    getSofaRoomTypeFromRow: row => row.ROOM_TYPE || '',
    getSofaRoomTypeDisplay: value => String(value || '').toUpperCase(),
    buildTrueRecoucheByDate: () => ({ reservationIdsByDate: recouches }),
    buildFolsMultiRoomCoverage: () => new Map(),
    getFolsExplicitDossierId: row => row.id || '',
    getFolsMessageText: () => '',
    getFolsReservationLineKey: (_row, index) => String(index),
    hasBabyRequest: () => false,
    calculateSofaRequirement: (adults, children, options) => ({
      sofaNeed: children >= 2 ? 2 : 1,
      roomType: options.roomType
    })
  };
  vm.createContext(sandbox);
  vm.runInContext(
    section(script, '  function buildPlanningWeek(', '  window.__AAR_GET_OCCUPANCY_FORECAST = function(){'),
    sandbox
  );
  return sandbox;
}

function load(rows, recouches = new Map()){
  return loadRuntime(rows, recouches).window.__AAR_GET_PLANNING_WEEK('2026-09-02');
}

test('Planning : semaine lundi-dimanche, sofas individuels et groupes strictement séparés', () => {
  const rows = [
    { id:'indiv', PSER_DATE:'2026-09-02', PSER_DATFIN:'2026-09-04', ROOM_TYPE:'TRI', NB_OCC_AD:'2', NB_OCC_CH:'2' },
    { id:'recouche', PSER_DATE:'2026-09-02', PSER_DATFIN:'2026-09-03', ROOM_TYPE:'PRIVM', NB_OCC_AD:'2', NB_OCC_CH:'1' },
    { PSER_DATE:'2026-09-03', PSER_DATFIN:'2026-09-05', GUES_GROUPNAME:'Séminaire Alpha', ROOM_TYPE:'TRI', NB_RESA:'12', NB_OCC_AD:'1' },
    { PSER_DATE:'2026-09-03', PSER_DATFIN:'2026-09-05', GUES_GROUPNAME:'Séminaire Alpha', ROOM_TYPE:'PRIVM', NB_RESA:'10', NB_OCC_AD:'2' }
  ];
  const model = load(rows, new Map([['2026-09-02', new Set(['recouche'])]]));
  assert.equal(model.weekStart, '2026-08-31');
  assert.equal(model.weekEnd, '2026-09-06');
  assert.equal(model.days.length, 7);
  const wednesday = model.days.find(day => day.key === '2026-09-02');
  assert.equal(wednesday.indivArrivals, 2);
  assert.equal(wednesday.sofaCount, 1);
  assert.equal(wednesday.sofaTypeCounts.TRI, 1);
  const thursday = model.days.find(day => day.key === '2026-09-03');
  assert.equal(thursday.groupCount, 1);
  assert.equal(thursday.groupRooms, 22);
  assert.equal(thursday.sofaCount, 0);
  assert.equal(thursday.groups[0].composition.TRI, 12);
  assert.equal(thursday.groups[0].composition.PRIVM, 10);
});

test('Planning : navigation, impression et absence de noms individuels dans le module', () => {
  assert.match(html, /id="tab-planning"/);
  assert.match(html, /id="view-planning"/);
  assert.match(html, /planning\.module\.js/);
  assert.match(planning, /Imprimer le planning/);
  assert.match(planning, /Sofas individuels/);
  assert.match(planning, /Groupes en arrivée/);
  assert.match(planning, /id="planning-import-dropzone"/);
  assert.match(planning, /window\.ORIS_IMPORT_SOURCE_FILE\(file\)/);
  assert.doesNotMatch(planning, /SIGNATURE|planning-sheet-sign/);
  assert.doesNotMatch(planning, /planning-sheet-total|>TOTAL</);
  assert.match(planning, /heading\.name/);
  assert.doesNotMatch(planning, /heading\.letter/);
  assert.match(planning, /planning-sofa-types/);
  assert.match(planning, /\['TRI', 'STDM', 'PRIVM', 'PRIVS', 'EXEC', 'SGE'\]/);
  assert.match(styles, /planning-sheet-cell strong\{font-size:15px;font-weight:500/);
  assert.doesNotMatch(planning, /GUES_NAME|GUEST_NAME|Nom du client/);
  assert.match(planning, /A4 landscape/);
  assert.match(styles, /is-blue[^}]*#83add0/);
  assert.match(styles, /is-orange[^}]*#d89525/);
  assert.match(styles, /is-yellow[^}]*#e2dd16/);
  assert.match(styles, /is-green[^}]*#76a984/);
});

test('Plan : la source groupe distingue les chambres attribuées de celles encore à placer', () => {
  const rows = [
    { PSER_DATE:'2026-09-02', GUES_GROUPNAME:'Alpha', ROOM_TYPE:'TRI', NB_RESA:'3', ROOM_NUM:'Grp -' },
    { PSER_DATE:'2026-09-02', GUES_GROUPNAME:'Beta', ROOM_TYPE:'STDM', NB_RESA:'2', RoomNumPref:'261, 263' },
    { PSER_DATE:'2026-09-02', ROOM_TYPE:'PRIVM', NB_RESA:'1', ROOM_NUM:'Ind -' },
    { PSER_DATE:'2026-09-03', GUES_GROUPNAME:'Demain', ROOM_TYPE:'EXEC', NB_RESA:'4', ROOM_NUM:'Grp -' }
  ];
  const demand = loadRuntime(rows).window.__AAR_GET_SAME_DAY_GROUP_DEMAND('2026-09-02');
  assert.equal(demand.covered, true);
  assert.equal(demand.counts.TRI, 3);
  assert.equal(demand.unassignedCounts.TRI, 3);
  assert.equal(demand.counts.STDM, 2);
  assert.equal(demand.unassignedCounts.STDM, 0);
  assert.deepEqual(Array.from(demand.entries.find(entry => entry.category === 'STDM').assignedRooms), ['261', '263']);
  assert.equal(demand.entries.some(entry => entry.category === 'PRIVM'), false);
  assert.equal(demand.entries.some(entry => entry.category === 'EXEC'), false);
});
