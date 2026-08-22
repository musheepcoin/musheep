import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadLegacyBabyHelpers(initial = {}){
  const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
  const start = source.indexOf("  const INDIV_BABY_SOFA_DONE_KEY");
  const end = source.indexOf('\n  /* ---------- RENDER ARRIVALS ---------- */', start);
  assert.ok(start >= 0 && end > start, 'helpers lit bébé de l’ancien écran introuvables');
  const values = new Map(Object.entries(initial));
  const localStorage = {
    getItem(key){ return values.has(key) ? values.get(key) : null; },
    setItem(key, value){ values.set(key, String(value)); }
  };
  const sandbox = {
    localStorage,
    safeJsonParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source.slice(start, end)}\nObject.assign(this, { indivBabyReservationId, indivBabyDoneId, isIndivBabyDone, indivBabyFinalSofaNeed });`, sandbox);
  return sandbox;
}

test('l’ancien écran utilise la réservation FOLS et retire le suffixe du contrôle', async () => {
  const helpers = await loadLegacyBabyHelpers();
  assert.equal(helpers.indivBabyReservationId('RESA-123__row_8::baby_bed'), 'RESA-123__row_8');
  assert.equal(helpers.indivBabyDoneId('2026-08-22', 'RESA-123__row_8::baby_bed'), '2026-08-22::RESA-123__row_8');
});

test('l’état barré partagé est relu par l’ancien écran', async () => {
  const key = 'oris_assistant_baby_sofa_done_v1';
  const helpers = await loadLegacyBabyHelpers({
    [key]: JSON.stringify({ '2026-08-22::RESA-123__row_8':true })
  });
  assert.equal(helpers.isIndivBabyDone('2026-08-22', 'RESA-123__row_8::baby_bed'), true);
  assert.equal(helpers.isIndivBabyDone('2026-08-22', 'RESA-999__row_1::baby_bed'), false);
});

test('le remplacement du lit bébé reste plafonné à deux sofas', async () => {
  const helpers = await loadLegacyBabyHelpers();
  assert.equal(helpers.indivBabyFinalSofaNeed({ sofaNeed:0 }), 1);
  assert.equal(helpers.indivBabyFinalSofaNeed({ sofaNeed:1 }), 2);
  assert.equal(helpers.indivBabyFinalSofaNeed({ sofaNeed:2 }), 2);
});
