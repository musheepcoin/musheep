import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const assistant = readFileSync(new URL('../assistant.module.js', import.meta.url), 'utf8');
function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
}
function load(baseDate, rows = [], recouches = new Map()) {
  const sandbox = {
    Date, Map, Set, window: {}, localStorage: { getItem: () => '' }, LS_IMPORT_DATE_INDIV: 'import',
    getDashboardActiveDateObj: () => new Date(`${baseDate}T00:00:00Z`),
    getHotelMemoryRows: () => rows,
    addDaysUtc: (date, days) => { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; },
    toIsoDateUtc: date => date.toISOString().slice(0, 10),
    parseFolsDateCell: value => value ? new Date(`${value}T00:00:00Z`) : null,
    pick: (row, keys) => keys.map(key => row[key]).find(value => value != null) || '',
    stripAccentsLower: text => text.toLowerCase(), esc: value => String(value),
    buildTrueRecoucheByDate: () => ({ reservationIdsByDate: recouches }),
    buildFolsMultiRoomCoverage: () => new Map(), getFolsMessageText: () => '',
    getFolsReservationLineKey: (_row, index) => String(index), getFolsExplicitDossierId: row => row.id || '',
    hasBabyRequest: () => false, getSofaRoomTypeFromRow: () => 'TRI', getSofaRoomTypeDisplay: value => value,
    calculateSofaRequirement: () => ({ sofaNeed: 1, roomType: 'TRI' })
  };
  vm.createContext(sandbox);
  vm.runInContext(section(script, '  function formatShortFrDayLabel(', '  function renderHomeNextDays(') +
    section(assistant, '  function renderOpsForecast(', '  function renderOpsAssignment(') +
    '\nthis.api = { buildHomeNextDays, renderOpsForecast };', sandbox);
  return sandbox;
}

for (const [first, last] of [['2026-08-31', '2026-09-29'], ['2026-12-20', '2027-01-18'], ['2028-02-10', '2028-03-10'], ['2026-10-15', '2026-11-13']]) {
  test(`prévisionnel Assistant : 30 dates consécutives de ${first} à ${last}`, () => {
    const h = load(first), days = h.window.__AAR_GET_OCCUPANCY_FORECAST();
    assert.equal(days.length, 30); assert.equal(new Set(days.map(day => day.key)).size, 30);
    assert.equal(days[0].key, first); assert.equal(days.at(-1).key, last);
    assert.equal((h.api.renderOpsForecast().match(/class="assistant-ops-forecast-item"/g) || []).length, 30);
    assert.match(h.api.renderOpsForecast(), new RegExp(`data-forecast-date="${last}"`));
    assert.equal(h.api.buildHomeNextDays([], 10).length, 10);
    assert.equal(h.window.__AAR_GET_OCCUPANCY_FORECAST_META().coverageEnd, '');
  });
}

test('prévisionnel : mouvements J+29 inclus, J+30 exclus, groupes et recouches toujours exclus des sofas individuels', () => {
  const rows = [
    { PSER_DATE: '2026-09-29', PSER_DATFIN: '2026-09-30', id: 'arrival' },
    { PSER_DATE: '2026-09-29', id: 'recouche' },
    { PSER_DATE: '2026-09-29', GUES_GROUPNAME: 'Groupe test', NB_RESA: '4' },
    { PSER_DATE: '2026-08-01', PSER_DATFIN: '2026-09-29' },
    { PSER_DATE: '2026-09-30', id: 'outside' }
  ];
  const h = load('2026-08-31', rows, new Map([['2026-09-29', new Set(['recouche'])]]));
  const days = h.window.__AAR_GET_OCCUPANCY_FORECAST(), last = days.at(-1);
  assert.equal(last.indivArrivals, 2); assert.equal(last.departures, 1);
  assert.equal(last.groupCount, 1); assert.equal(last.groupRooms, 4); assert.equal(last.totalRooms, 6);
  assert.equal(last.sofaCount, 1); assert.equal(last.sofaTypeCounts.TRI, 1);
  assert.equal(days.some(day => day.key === '2026-09-30'), false);
  const meta = h.window.__AAR_GET_OCCUPANCY_FORECAST_META();
  assert.equal(meta.forecast.length, 30); assert.equal(meta.coverageEnd, '2026-09-30');
  assert.match(section(script, '  function renderHomeNextDays(', '  function getFirstImportArrivalDateKey('), /buildHomeNextDays\(rows, 10\)/);
});
