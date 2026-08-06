import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadPlanParser(){
  const source = await readFile(new URL('../plan.module.js', import.meta.url), 'utf8');
  const start = source.indexOf('  function parseDelimitedLine');
  const end = source.indexOf('  function normalizeImportHeader', start);
  assert.ok(start >= 0 && end > start, 'bloc du parseur Plan introuvable');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `${source.slice(start, end)}
     globalThis.__parseDelimitedTable = parseDelimitedTable;`,
    sandbox,
    { filename:'plan-csv-parser.js' }
  );
  return sandbox.__parseDelimitedTable;
}

test('le parseur du Plan conserve un commentaire HTML multiligne sans décaler les colonnes', async () => {
  const parseDelimitedTable = await loadPlanParser();
  const raw = [
    'GUES_ID;GUES_NAME;Message_HTML;Departure_Date',
    '2131793;VANDEN;"<p>Première ligne',
    'Deuxième ligne; avec séparateur</p>";18/07/2026'
  ].join('\r\n');

  const parsed = parseDelimitedTable(raw);

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].GUES_ID, '2131793');
  assert.equal(parsed.rows[0].GUES_NAME, 'VANDEN');
  assert.equal(parsed.rows[0].Message_HTML, '<p>Première ligne\nDeuxième ligne; avec séparateur</p>');
  assert.equal(parsed.rows[0].Departure_Date, '18/07/2026');
});

test('le parseur du Plan respecte les guillemets échappés', async () => {
  const parseDelimitedTable = await loadPlanParser();
  const parsed = parseDelimitedTable(
    'GUES_NAME;Message;Departure_Date\nTEST;"Demande ""calme""; confirmée";19/07/2026'
  );

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].Message, 'Demande "calme"; confirmée');
  assert.equal(parsed.rows[0].Departure_Date, '19/07/2026');
});

test('le parseur du Plan tolère les guillemets JSON non échappés produits par FOLS', async () => {
  const parseDelimitedTable = await loadPlanParser();
  const parsed = parseDelimitedTable(
    'GUES_NAME;TO_DO_TO_SAY;Departure_Date\nTEST;"Room Assignment (["High floor","Quiet Room"])";20/07/2026'
  );

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].GUES_NAME, 'TEST');
  assert.equal(parsed.rows[0].TO_DO_TO_SAY, 'Room Assignment (["High floor","Quiet Room"])');
  assert.equal(parsed.rows[0].Departure_Date, '20/07/2026');
});
