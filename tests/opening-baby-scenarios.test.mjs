import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const DATE_KEY = '2026-08-20';
const RESERVATION_ID = 'scenario';
const DONE_KEY = `${DATE_KEY}::${RESERVATION_ID}`;
const OVERRIDE_KEY = `${DATE_KEY}::${RESERVATION_ID}`;

const RULES = new Map([
  ['1A+0E', 0], ['1A+1E', 1], ['1A+2E', 2], ['1A+3E', 2],
  ['2A+0E', 0], ['2A+1E', 1], ['2A+2E', 2], ['2A+3E', 2], ['2A+4E', 2],
  ['3A+0E', 1], ['3A+1E', 2]
]);

async function loadOpening({ adults, children, babyDetected, babyDone = false, babyOverride, dossierId = '', recoucheIds = [] } = {}){
  const storage = new Map();
  if (babyDone) storage.set('oris_assistant_baby_sofa_done_v1', JSON.stringify({ [DONE_KEY]: true }));
  if (babyOverride !== undefined) {
    storage.set('oris_opening_baby_overrides_v1', JSON.stringify({ [OVERRIDE_KEY]: babyOverride }));
  }
  const localStorage = {
    getItem(key){ return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value){ storage.set(key, String(value)); }
  };
  const window = {
    localStorage,
    __AAR_TRUE_RECOUCHE_IDS_BY_DATE: { [DATE_KEY]: recoucheIds },
    __AAR_RESERVATION_CONTROL: {
      items: [{
        id: RESERVATION_ID,
        dossierId,
        guestName: 'TEST Client',
        arrivalDate: DATE_KEY,
        adults,
        children,
        roomType: 'PRIVM',
        reservationControl: { babyDetected }
      }]
    }
  };
  const sandbox = { window, localStorage, document: { getElementById(){ return null; } }, console };
  vm.createContext(sandbox);

  const engineSource = await readFile(new URL('../sofa-engine.js', import.meta.url), 'utf8');
  vm.runInContext(engineSource, sandbox, { filename:'sofa-engine.js' });

  const openingSource = (await readFile(new URL('../opening.module.js', import.meta.url), 'utf8'))
    .replace('window.ORIS_OPENING = { render };', 'window.ORIS_OPENING = { render, automaticRows };');
  vm.runInContext(openingSource, sandbox, { filename:'opening.module.js' });
  return window.ORIS_OPENING.automaticRows(DATE_KEY);
}

for (const [composition, ruleNeed] of RULES) {
  const [adults, children] = composition.match(/\d+/g).map(Number);

  test(`${composition} sans lit bébé suit la règle sofa`, async () => {
    const rows = await loadOpening({ adults, children, babyDetected:false });
    assert.equal(rows.length, ruleNeed > 0 ? 1 : 0);
    if (rows[0]) {
      assert.equal(rows[0].sofas, ruleNeed);
      assert.equal(rows[0].babyBedActive, false);
    }
  });

  test(`${composition} avec lit bébé non barré`, async () => {
    const rows = await loadOpening({ adults, children, babyDetected:true });
    const total = adults + children;
    const expectedSofas = total >= 4 ? (total === 4 ? 1 : ruleNeed) : 0;
    assert.equal(rows.length, expectedSofas > 0 ? 1 : 0);
    if (rows[0]) {
      assert.equal(rows[0].sofas, expectedSofas);
      assert.equal(rows[0].babyBedActive, true);
    }
  });

  test(`${composition} avec lit bébé barré ajoute le sofa de remplacement`, async () => {
    const rows = await loadOpening({ adults, children, babyDetected:true, babyDone:true });
    const total = adults + children;
    const baseSofas = total >= 4 ? (total === 4 ? 1 : ruleNeed) : 0;
    const expectedSofas = Math.min(2, Math.max(1, baseSofas + 1));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sofas, expectedSofas);
    assert.equal(rows[0].babyBedActive, false);
  });
}

test('un ancien réglage Lit bébé OUI ne réactive pas un lit barré', async () => {
  const rows = await loadOpening({
    adults:2,
    children:2,
    babyDetected:true,
    babyDone:true,
    babyOverride:true
  });
  assert.equal(rows[0].sofas, 2);
  assert.equal(rows[0].babyBedActive, false);
});

test('un ancien réglage parallèle Lit bébé NON est ignoré au profit de l’état partagé', async () => {
  const rows = await loadOpening({
    adults:2,
    children:2,
    babyDetected:true,
    babyOverride:false
  });
  assert.equal(rows[0].sofas, 1);
  assert.equal(rows[0].babyBedActive, true);
});

test('une recouche portant exactement le même ID FOLS est absente des sofas', async () => {
  const rows = await loadOpening({
    adults:2,
    children:2,
    babyDetected:false,
    dossierId:'RESA-123',
    recoucheIds:['RESA-123']
  });
  assert.equal(rows.length, 0);
});

test('un ID différent de celui de la recouche reste affiché dans les sofas', async () => {
  const rows = await loadOpening({
    adults:2,
    children:2,
    babyDetected:false,
    dossierId:'RESA-456',
    recoucheIds:['RESA-123']
  });
  assert.equal(rows.length, 1);
});

test('sans ID explicite aucune réservation n’est masquée par simple ressemblance de nom', async () => {
  const rows = await loadOpening({
    adults:2,
    children:2,
    babyDetected:false,
    recoucheIds:['RESA-123']
  });
  assert.equal(rows.length, 1);
});
