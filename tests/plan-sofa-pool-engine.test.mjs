import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadEngine(){
  const source = await readFile(new URL('../plan-sofa-pool.engine.js', import.meta.url), 'utf8');
  const sandbox = { window:{} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename:'plan-sofa-pool.engine.js' });
  return sandbox.window.ORIS_PLAN_SOFA_POOL;
}
function row(number, type, options = {}){
  return { roomNumber:String(number), roomType:type, mode:options.mode || 'free', folsStatus:options.folsStatus || 'available', current:{ detected:!!options.key } };
}
function day(key, counts){ return { key, sofaTypeCounts:counts }; }
function item(date, roomNumber, roomType){ return { arrivalDate:date, roomNumber, roomType, reservationControl:{ sofaNeed:1 } }; }

test('le dimanche ouvre un horizon complet jusqu’au dimanche suivant', async () => {
  const engine = await loadEngine();
  assert.equal(engine.horizonEnd('2026-08-23'), '2026-08-30');
  assert.equal(engine.horizonEnd('2026-08-24'), '2026-08-30');
});

test('le besoin J+1 est absolu et passe avant une clé actuelle ou une attribution plus tardive', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(260,'STDM',{ key:true }), row(262,'STDM'), row(264,'STDM')],
    forecast:[day('2026-08-25',{ STDM:1 }), day('2026-08-27',{ STDM:1 })],
    items:[item('2026-08-25','264','STDM'), item('2026-08-27','262','STDM')],
    margins:{ STDM:0 }
  });
  assert.equal(model.categories.find(value => value.category === 'STDM').target, 1);
  assert.equal(model.recommendations.find(value => value.category === 'STDM').roomNumber, '264');
  assert.equal(model.byRoom.get('264').priority, 'j1');
});

test('le parc couvre le pic hebdomadaire puis ajoute la marge par catégorie', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(220,'TRI',{ key:true }),row(221,'TRI'),row(222,'TRI'),row(223,'TRI')],
    forecast:[day('2026-08-25',{ TRI:1 }),day('2026-08-28',{ TRI:2 })],
    margins:{ TRI:1 }
  });
  const tri = model.categories.find(value => value.category === 'TRI');
  assert.deepEqual({ j1:tri.j1Need, peak:tri.peakNeed, target:tri.target, delta:tri.delta }, { j1:1, peak:2, target:3, delta:2 });
  assert.equal(model.recommendations[0].roomNumber, '220');
});

test('une chambre HS est exclue et le choix reste déterministe', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(260,'STDM',{ mode:'blocked', folsStatus:'hs', key:true }),row(262,'STDM'),row(264,'STDM')],
    forecast:[day('2026-08-25',{ STDM:1 })]
  });
  assert.equal(model.recommendations.find(value => value.category === 'STDM').roomNumber, '262');
  assert.equal(model.byRoom.has('260'), false);
});

test('un portefeuille absent ne produit aucune recommandation exploitable', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(260,'STDM',{ key:true })],
    forecast:[day('2026-08-25',{})],
    forecastMeta:{ sourceCount:0, activeDate:'2026-08-24', coverageEnd:'2026-08-30' }
  });
  assert.equal(model.ready, false);
  assert.equal(model.status, 'missing_source');
});

test('des dates non alignées bloquent le prévisionnel', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(260,'STDM')],
    forecast:[day('2026-08-25',{ STDM:1 })],
    forecastMeta:{ sourceCount:10, activeDate:'2026-08-22', coverageEnd:'2026-08-30' }
  });
  assert.equal(model.ready, false);
  assert.equal(model.status, 'date_mismatch');
});

test('un horizon incomplet autorise les ouvertures mais interdit toutes les fermetures', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(260,'STDM',{ key:true }),row(262,'STDM',{ key:true }),row(264,'STDM')],
    forecast:[day('2026-08-25',{ STDM:1 })],
    forecastMeta:{ sourceCount:20, activeDate:'2026-08-24', coverageEnd:'2026-08-25' }
  });
  assert.equal(model.ready, true);
  assert.equal(model.closureSafe, false);
  assert.equal(model.recommendations.some(value => value.action === 'close'), false);
});

test('un horizon complet désigne précisément les clés à fermer', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(260,'STDM',{ key:true }),row(262,'STDM',{ key:true }),row(264,'STDM')],
    forecast:[day('2026-08-25',{ STDM:1 }),day('2026-08-30',{ STDM:0 })],
    forecastMeta:{ sourceCount:20, activeDate:'2026-08-24', coverageEnd:'2026-08-30' }
  });
  const closes = model.recommendations.filter(value => value.action === 'close');
  assert.equal(model.closureSafe, true);
  assert.equal(closes.map(value => value.roomNumber).join(','), '262');
});

test('une recouche confirmée ne devient jamais une attribution J+1 absolue', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(260,'STDM'),row(262,'STDM')],
    forecast:[day('2026-08-25',{ STDM:1 }),day('2026-08-30',{})],
    forecastMeta:{ sourceCount:20, activeDate:'2026-08-24', coverageEnd:'2026-08-30' },
    items:[{ ...item('2026-08-25','262','STDM'), dossierId:'R1' }],
    recoucheIdsByDate:{ '2026-08-25':['R1'] }
  });
  assert.equal(model.byRoom.get('262')?.priority === 'j1', false);
});

test('la catégorie physique de la chambre prime sur la catégorie réservée', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(260,'STDM'),row(220,'TRI')],
    forecast:[day('2026-08-25',{ STDM:1 }),day('2026-08-30',{})],
    forecastMeta:{ sourceCount:20, activeDate:'2026-08-24', coverageEnd:'2026-08-30' },
    items:[item('2026-08-25','260','TRI')]
  });
  assert.equal(model.byRoom.get('260')?.priority, 'j1');
  assert.equal(model.byRoom.get('260')?.category, 'STDM');
});

test('une clé située dans une chambre HS ne fausse pas le nombre de clés actives', async () => {
  const engine = await loadEngine();
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:[row(260,'STDM',{ key:true, mode:'blocked', folsStatus:'hs' }),row(262,'STDM')],
    forecast:[day('2026-08-25',{ STDM:1 }),day('2026-08-30',{})],
    forecastMeta:{ sourceCount:20, activeDate:'2026-08-24', coverageEnd:'2026-08-30' }
  });
  assert.equal(model.categories.find(value => value.category === 'STDM').currentKeys, 0);
});

test('les chambres groupe attribuées influencent le choix sans augmenter le volume individuel', async () => {
  const engine = await loadEngine();
  const groupItems = ['228','230','232','234'].map(roomNumber => ({
    ...item('2026-08-25', roomNumber, 'TRI'),
    groupName:'GROUPE TEST'
  }));
  const model = engine.build({
    baseDate:'2026-08-24',
    rows:['228','230','232','234','236'].map(number => row(number,'TRI')),
    forecast:[day('2026-08-25',{ TRI:2 }),day('2026-08-30',{})],
    forecastMeta:{ sourceCount:30, activeDate:'2026-08-24', coverageEnd:'2026-08-30' },
    items:groupItems
  });
  const tri = model.categories.find(value => value.category === 'TRI');
  const selected = model.recommendations.filter(value => value.category === 'TRI' && value.action !== 'close');
  assert.equal(tri.target, 2);
  assert.equal(selected.length, 2);
  assert.equal(selected.every(value => value.priority === 'group'), true);
  assert.equal(selected.map(value => value.roomNumber).join(','), '228,230');
});
