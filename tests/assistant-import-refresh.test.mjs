import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const script = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const assistant = await readFile(new URL('../assistant.module.js', import.meta.url), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `Section introuvable : ${startMarker}`);
  return source.slice(start, end);
}

function loadImport({ activeDate = '2026-08-31', rows, groupsFail = false, graphFail = false } = {}) {
  const storage = new Map();
  const messages = [];
  const renders = [];
  let finishRead;
  let resolveSave, rejectSave;
  const remote = new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; });
  const sandbox = {
    Date, console: { warn() {}, error() {} }, clearTimeout() {},
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    document: { querySelectorAll: () => [], getElementById: () => null },
    FileReader: class {
      readAsText() { finishRead = this.onload({ target: { result: 'synthetic CSV' } }); }
    },
    resetFolsStateForNewImport() {},
    parseCsvHeaderAndBlocks: () => ({ header: [], blocks: [] }),
    buildRowsFromBlocks: () => rows,
    invalidateHotelMemoryRowsCache() {}, invalidateAssignmentWatchIndex() {},
    renderArrivalsFOLS_fromRows() {}, syncMonthlyAlerts() {},
    refreshInventoryPressureCard() {}, renderImportDates() {},
    renderDashboardCurrentDate() {}, renderDashboardKpiSubLabels() {}, renderVacationCalendar() {},
    processGroupsFromRows() { if (groupsFail) throw Error('group panel'); },
    processHomeGraphFromRaw() { if (graphFail) throw Error('graph panel'); },
    ghSaveSnapshotPath: () => remote,
    toast: text => messages.push(text),
    views: {},
    LS_ARRIVALS_CSV: 'raw', LS_ACDC_SOFA: 'acdc',
    LOCAL_PORTFOLIO_RESTORE_DONE: false, LOCAL_PORTFOLIO_RESTORE_TIMER: null,
    LAST_FOLS_ROWS: [],
    DASHBOARD_ACTIVE_DATE: new Date(`${activeDate}T00:00:00Z`),
    window: { GH_PATHS: { portfolio: 'snapshot' } }
  };
  vm.createContext(sandbox);
  vm.runInContext([
    // Actual Assistant date selection + actual import orchestration. Only CSV
    // parsing, derived panels and network are replaced with controlled inputs.
    section(assistant, "  const LS_IMPORT_DATE_INDIV", '  function normalizeBookingName('),
    section(assistant, '  function forceDailyPeriod(', '  function cleanAiResult('),
    section(script, '  function pick(', '  function toFrLabel('),
    section(script, '  function toIsoDateUtc(', '\n  function '),
    section(script, '  function getDashboardActiveDateObj(', '  function saveDashboardActiveDate('),
    'function saveDashboardActiveDate() { localStorage.setItem("active-date", toIsoDateUtc(DASHBOARD_ACTIVE_DATE)); }',
    section(script, '  function getFirstImportArrivalDateKey(', '  /* =========================================================\n     GITHUB STORAGE'),
    section(script, '  function handleIndivFile(', '  function formatShortFrDayLabel('),
    'this.api = { handleIndivFile, processCsvText, getAssistantData, getTodayChecklistDateKey };'
  ].join('\n'), sandbox);
  sandbox.window.AAR = { getDashboardActiveDateObj: () => sandbox.DASHBOARD_ACTIVE_DATE };
  sandbox.window.ORIS_ASSISTANT = { refresh: () => renders.push(sandbox.api.getAssistantData()) };
  sandbox.window.RESERVATION_CONTROL = {
    processRows(imported) {
      sandbox.window.__AAR_RESERVATION_CONTROL = {
        items: imported.map(row => ({ arrivalDate: row.PSER_DATE, guestName: row.GUES_NAME })),
        boostBaseDate: sandbox.window.__AAR_RESERVATION_CONTROL_BASE_DATE_KEY
      };
      sandbox.window.ORIS_ASSISTANT.refresh();
    }
  };
  return {
    sandbox, storage, messages, renders,
    start: () => sandbox.api.handleIndivFile({ name: 'ArrivalList.csv' }),
    settle: async error => { if (error) rejectSave(error); else resolveSave(); await finishRead; }
  };
}

test('Assistant : le nouvel import est visible avant la fin de la sauvegarde réseau', async () => {
  const h = loadImport({ rows: [{ PSER_DATE: '2026-08-31', GUES_NAME: 'NOUVEAU' }] });
  h.start();
  try {
    assert.equal(h.renders.at(-1).dayItems[0].guestName, 'NOUVEAU');
    assert.ok(h.renders.at(-1).importDate, 'la date du nouvel import doit aussi être rafraîchie');
    assert.match(h.messages.at(-1) || '', /Portefeuille chargé/);
  } finally { await h.settle(); }
});

for (const activeDate of ['2026-04-04', '2026-09-30']) {
  test(`Assistant : une date hors du nouveau portefeuille (${activeDate}) est recalée`, async () => {
    const h = loadImport({ activeDate, rows: [{ PSER_DATE: '2026-08-31', GUES_NAME: 'NOUVEAU' }] });
    h.start();
    await h.settle();
    assert.equal(h.renders.at(-1).dayKey, '2026-08-31');
    assert.equal(h.renders.at(-1).dayItems.length, 1);
  });
}

test('Assistant : conserver une date consultée dans la période, même sans arrivée ce jour-là', async () => {
  const h = loadImport({ activeDate: '2026-09-01', rows: [
    { PSER_DATE: '2026-09-03' }, { PSER_DATE: '2026-08-31' }
  ] });
  h.start();
  await h.settle();
  assert.equal(h.renders.at(-1).dayKey, '2026-09-01');
});

test('Assistant : import vide et recalcul interne ne déplacent pas la date consultée', async () => {
  const empty = loadImport({ activeDate: '2026-09-01', rows: [] });
  empty.start();
  await empty.settle();
  assert.equal(empty.renders.at(-1).dayKey, '2026-09-01');
  const internal = loadImport({ activeDate: '2026-04-04', rows: [{ PSER_DATE: '2026-08-31' }] });
  internal.sandbox.api.processCsvText('synthetic CSV');
  assert.equal(internal.renders.at(-1).dayKey, '2026-04-04');
});

test('Assistant : une panne réseau ou des panneaux secondaires ne bloque pas le nouvel affichage', async () => {
  const h = loadImport({ groupsFail: true, graphFail: true, rows: [{ PSER_DATE: '2026-08-31' }] });
  h.start();
  try { assert.ok(h.renders.at(-1).importDate); }
  finally { await h.settle(Error('offline')); }
  assert.equal(h.messages.some(message => message.includes('impossible')), false);
});

test('Assistant : la checklist reste au jour réel après un import historique', async () => {
  const h = loadImport({ rows: [{ PSER_DATE: '2026-04-04' }] });
  h.start();
  await h.settle();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  assert.equal(h.sandbox.api.getTodayChecklistDateKey(), today);
});

test('Assistant : réimporter la même journée remplace immédiatement les anciennes réservations', async () => {
  const rows = [{ PSER_DATE: '2026-08-31', GUES_NAME: 'ANCIEN' }];
  const h = loadImport({ rows });
  h.start();
  await h.settle();
  rows.splice(0, rows.length,
    { PSER_DATE: '2026-08-31', GUES_NAME: 'NOUVEAU A' },
    { PSER_DATE: '2026-08-31', GUES_NAME: 'NOUVEAU B' }
  );
  h.start();
  assert.deepEqual(Array.from(h.renders.at(-1).dayItems, item => item.guestName), ['NOUVEAU A', 'NOUVEAU B']);
  await h.settle();
});
