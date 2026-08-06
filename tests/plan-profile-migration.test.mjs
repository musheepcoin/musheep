import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

function createLocalStorage(initial = {}){
  const values = new Map(Object.entries(initial));
  return {
    getItem(key){ return values.has(key) ? values.get(key) : null; },
    setItem(key, value){ values.set(key, String(value)); },
    removeItem(key){ values.delete(key); }
  };
}

test('un ancien profil Plan est neutralisé et demande un seul réimport', async () => {
  const localStorage = createLocalStorage({
    aar_plan_arrivals_meta_v2: JSON.stringify({
      name: 'ancien.csv',
      sofaRooms: 1,
      capacityAlertCount: 0,
      criticalAlertCount: 1
    }),
    aar_plan_arrivals_requirements_v2: JSON.stringify({ PRIVM:1 }),
    aar_plan_arrivals_profile_v1: JSON.stringify([
      { roomType:'PRIVM', adults:2, children:4, babyDetected:false, count:1 }
    ])
  });
  const document = {
    addEventListener(){},
    getElementById(){ return null; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; }
  };
  const window = { localStorage, document };
  const sandbox = {
    window,
    document,
    localStorage,
    console,
    structuredClone,
    setTimeout,
    clearTimeout
  };
  vm.createContext(sandbox);

  const engineSource = await readFile(new URL('../sofa-engine.js', import.meta.url), 'utf8');
  vm.runInContext(engineSource, sandbox, { filename:'sofa-engine.js' });
  const planSource = await readFile(new URL('../plan.module.js', import.meta.url), 'utf8');
  vm.runInContext(planSource, sandbox, { filename:'plan.module.js' });

  const result = window.PLAN.refreshSofaRules({ renderViews:false });
  const meta = JSON.parse(localStorage.getItem('aar_plan_arrivals_meta_v2'));

  assert.equal(result.refreshed, false);
  assert.equal(result.requiresReimport, true);
  assert.equal(localStorage.getItem('aar_plan_arrivals_profile_v1'), null);
  assert.equal(localStorage.getItem('aar_plan_arrivals_requirements_v2'), null);
  assert.equal(meta.profileSchemaVersion, 2);
  assert.equal(meta.rulesRefreshRequired, true);
  assert.equal(meta.sofaRooms, 0);
  assert.equal(meta.capacityAlertCount, 0);
  assert.equal(meta.criticalAlertCount, 0);
});
