import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadEngine(){
  const source = await readFile(new URL('../plan-intelligent.engine.js', import.meta.url), 'utf8');
  const sandbox = { window:{} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename:'plan-intelligent.engine.js' });
  return sandbox.window.ORIS_PLAN_ENGINE;
}

function room(number, type, options = {}){
  return {
    room_num:String(number),
    roomType:type,
    roomState:options.roomState || 'Libre',
    meta:{
      Stay:options.stay || '',
      MinMainReason:options.reason || '',
      MinMainComment:options.comment || ''
    }
  };
}

function buildOptions(rooms, assignments, extra = {}){
  return {
    rooms,
    roomStateMeta:{ referenceDate:'2026-04-04', matched:193 },
    openingSnapshot:{ dateKey:'2026-04-04', importedAt:'2026-04-04T20:00:00Z', assignments, rows:assignments.filter(item => item.sofas > 0) },
    overrides:{},
    ...extra
  };
}

test('le plan calcule ouvrir, laisser et fermer depuis actuel vers cible', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions([
    room(261, 'STDM'),
    room(262, 'STDM', { reason:'Equipement Chambre', comment:'FAMILLE' }),
    room(263, 'STDM', { reason:'Equipement Chambre', comment:'2 SOFAS' })
  ], [
    { id:'a', room:'261', roomType:'STDM', sofas:1, name:'A' },
    { id:'b', room:'262', roomType:'STDM', sofas:2, name:'B' },
    { id:'c', room:'263', roomType:'STDM', sofas:0, name:'C' }
  ]));
  assert.equal(model.byRoom.get('261').action, 'open');
  assert.equal(model.byRoom.get('262').action, 'keep');
  assert.equal(model.byRoom.get('263').action, 'close');
  assert.equal(model.byRoom.get('261').requiresIntervention, true);
  assert.equal(model.byRoom.get('262').requiresIntervention, false);
  assert.equal(model.byRoom.get('263').requiresIntervention, true);
  assert.equal(model.byRoom.get('261').folsKeyAction, 'add');
  assert.equal(model.byRoom.get('262').folsKeyAction, 'none');
  assert.equal(model.byRoom.get('263').folsKeyAction, 'remove');
  assert.equal(model.byRoom.get('261').folsAction, 'open');
  assert.equal(model.byRoom.get('262').folsAction, 'keep');
  assert.equal(model.byRoom.get('263').folsAction, 'close');
  assert.deepEqual({ open:model.summary.open, keep:model.summary.keep, close:model.summary.close }, { open:1, keep:1, close:1 });
});

test('FOLS ne demande aucune intervention entre une clé 1 sofa et un besoin 2 sofas', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions([
    room(261, 'STDM', { reason:'Équipement Chambre', comment:'1 SOFA' }),
    room(262, 'STDM', { reason:'Équipement Chambre', comment:'2 SOFAS' })
  ], [
    { room:'261', roomType:'STDM', sofas:2, name:'Besoin deux' },
    { room:'262', roomType:'STDM', sofas:1, name:'Besoin un' }
  ]));
  assert.equal(model.byRoom.get('261').action, 'open');
  assert.equal(model.byRoom.get('262').action, 'close');
  assert.equal(model.byRoom.get('261').folsKeyAction, 'none');
  assert.equal(model.byRoom.get('262').folsKeyAction, 'none');
  assert.equal(model.byRoom.get('261').folsAction, 'keep');
  assert.equal(model.byRoom.get('262').folsAction, 'keep');
  assert.equal(model.byRoom.get('261').folsActionLabel, 'Clé correcte');
  assert.equal(model.byRoom.get('261').requiresIntervention, false);
  assert.equal(model.byRoom.get('262').requiresIntervention, false);
});

test('le fond des chambres suit les cinq états couleur FOLS', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions([
    room(220, 'TRI', { roomState:'Hors Service' }),
    room(221, 'TRI', { roomState:'Occupée', stay:'Départ attendu' }),
    room(222, 'TRI'),
    room(223, 'TRI'),
    room(224, 'TRI', { roomState:'Occupée', stay:'Présent' })
  ], [{ room:'223', roomType:'TRI', sofas:0, name:'Arrivée' }]));
  assert.equal(model.byRoom.get('220').folsStatus, 'hs');
  assert.equal(model.byRoom.get('221').folsStatus, 'departure');
  assert.equal(model.byRoom.get('222').folsStatus, 'available');
  assert.equal(model.byRoom.get('223').folsStatus, 'arrival');
  assert.equal(model.byRoom.get('224').folsStatus, 'present');
});

test('une chambre en départ montre son état futur après checkout', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions([
    room(221, 'TRI', { roomState:'Occupée', stay:'Départ attendu' }),
    room(223, 'TRI', { roomState:'Occupée', stay:'Départ attendu' })
  ], [{ room:'223', roomType:'TRI', sofas:0, name:'Arrivée suivante' }]));
  assert.equal(model.byRoom.get('221').folsStatus, 'departure');
  assert.equal(model.byRoom.get('221').turnoverStatus, 'available');
  assert.equal(model.byRoom.get('223').folsStatus, 'departure');
  assert.equal(model.byRoom.get('223').turnoverStatus, 'arrival');
});

test('une rotation ne mélange jamais des fichiers de dates différentes', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions(
    [room(223, 'TRI', { roomState:'Occupée', stay:'Départ attendu' })],
    [{ room:'223', roomType:'TRI', sofas:0, name:'Arrivée d’un autre jour' }],
    { roomStateMeta:{ referenceDate:'2026-04-05', matched:193 } }
  ));
  assert.equal(model.byRoom.get('223').folsStatus, 'departure');
  assert.equal(model.byRoom.get('223').turnoverStatus, '');
});

test('les filtres projettent correctement les rotations après checkout', async () => {
  const engine = await loadEngine();
  const arrivalTurnover = { folsStatus:'departure', turnoverStatus:'arrival' };
  const emptyTurnover = { folsStatus:'departure', turnoverStatus:'available' };
  assert.deepEqual(
    { ...engine.roomPresentation(arrivalTurnover, ['departure','arrival']) },
    { visible:true, folsStatus:'departure', turnoverStatus:'arrival' }
  );
  assert.deepEqual(
    { ...engine.roomPresentation(arrivalTurnover, ['arrival']) },
    { visible:true, folsStatus:'arrival', turnoverStatus:'' }
  );
  assert.deepEqual(
    { ...engine.roomPresentation(emptyTurnover, ['available']) },
    { visible:true, folsStatus:'available', turnoverStatus:'' }
  );
  assert.equal(engine.roomPresentation(arrivalTurnover, ['available']).visible, false);
});

test('une préaffectation FOLS reste jaune et ne devient jamais un présent vert', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions([
    room(268, 'STDM', { roomState:'Libre', stay:'Séjour avec préaffectation' })
  ], []));
  assert.equal(model.byRoom.get('268').mode, 'free');
  assert.equal(model.byRoom.get('268').folsStatus, 'arrival');
});

test('FAMILLE signifie la capacité sofa maximale de la catégorie', async () => {
  const engine = await loadEngine();
  assert.equal(engine.currentSofa(room(221, 'TRI', { reason:'Equipement Chambre', comment:'FAMILLE' })).count, 1);
  assert.equal(engine.currentSofa(room(261, 'STDM', { reason:'Equipement Chambre', comment:'FAMILLE' })).count, 2);
});

test('la clé correspond à toute fiche Équipement Chambre détectée', async () => {
  const engine = await loadEngine();
  assert.equal(engine.currentSofa(room(261, 'STDM', { reason:'Équipement Chambre', comment:'2 SOFAS' })).detected, true);
  assert.equal(engine.currentSofa(room(262, 'STDM')).detected, false);
  const unknown = engine.currentSofa(room(263, 'STDM', { reason:'Équipement Chambre', comment:'CONFIGURATION TEST' }));
  assert.equal(unknown.detected, true);
  assert.equal(unknown.valid, false);
});

test('une date différente bloque les actions automatiques sans créer de fausses alertes chambre', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions(
    [room(261, 'STDM', { roomState:'Occupée', stay:'Présent' })],
    [{ room:'261', roomType:'STDM', sofas:2, name:'A' }],
    { roomStateMeta:{ referenceDate:'2026-04-05', matched:193 } }
  ));
  assert.equal(model.ready, false);
  assert.equal(model.byRoom.get('261').action, 'none');
  assert.equal(model.summary.review, 0);
  assert.ok(model.issues.some(issue => issue.code === 'date_mismatch'));
});

test('un Room State absent ne fabrique aucune fausse action par chambre', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel({
    rooms:[room(261, 'STDM', { reason:'Equipement Chambre', comment:'2 SOFAS' })],
    openingSnapshot:{
      dateKey:'2026-04-04',
      importedAt:'2026-04-04T20:00:00Z',
      assignments:[{ room:'261', roomType:'STDM', sofas:1, name:'A' }]
    },
    roomStateMeta:null
  });
  assert.equal(model.ready, false);
  assert.equal(model.byRoom.get('261').action, 'none');
  assert.equal(model.summary.review, 0);
  assert.ok(model.issues.some(issue => issue.code === 'missing_room_state'));
});

test('une recouche reste intouchable et une arrivée affectée dessus passe en contrôle', async () => {
  const engine = await loadEngine();
  const baseRoom = room(261, 'STDM', { roomState:'Occupée', stay:'Présent', reason:'Equipement Chambre', comment:'FAMILLE' });
  const safe = engine.buildModel(buildOptions([baseRoom], []));
  assert.equal(safe.byRoom.get('261').action, 'present');
  assert.equal(safe.byRoom.get('261').folsStatus, 'present');
  assert.equal(safe.byRoom.get('261').actionShort, '');
  const conflict = engine.buildModel(buildOptions([baseRoom], [{ room:'261', roomType:'STDM', sofas:2, name:'A' }]));
  assert.equal(conflict.byRoom.get('261').action, 'review');
});

test('seule une recouche confirmée devient jaune avec un R', async () => {
  const engine = await loadEngine();
  const baseRoom = room(261, 'STDM', { roomState:'Occupée', stay:'Présent' });
  const model = engine.buildModel(buildOptions([baseRoom], [], {
    recoucheRooms:{ '261':{ id:'RESA-2', name:'CLIENT' } }
  }));
  const row = model.byRoom.get('261');
  assert.equal(row.action, 'recouche');
  assert.equal(row.folsStatus, 'arrival');
  assert.equal(row.actionShort, 'R');
});

test('un état 2 sofas sur une TRI est signalé comme impossible', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions(
    [room(252, 'TRI', { reason:'Equipement Chambre', comment:'2 SOFA' })],
    [{ room:'252', roomType:'TRI', sofas:1, name:'A' }]
  ));
  assert.equal(model.byRoom.get('252').action, 'review');
  assert.match(model.byRoom.get('252').reason, /capacité de 1/);
});

test('deux arrivées sur la même chambre ne sont jamais fusionnées', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions(
    [room(261, 'STDM')],
    [
      { id:'a', room:'261', roomType:'STDM', sofas:1, name:'A' },
      { id:'b', room:'261', roomType:'STDM', sofas:2, name:'B' }
    ]
  ));
  assert.equal(model.byRoom.get('261').action, 'review');
  assert.match(model.byRoom.get('261').reason, /2 arrivées/);
});

test('une correction manuelle est limitée à la date et à la chambre', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions(
    [room(261, 'STDM')],
    [{ room:'261', roomType:'STDM', sofas:2, name:'A' }],
    { overrides:{ '2026-04-04::261':{ target:1 } } }
  ));
  assert.equal(model.byRoom.get('261').forcedTarget, 1);
  assert.equal(model.byRoom.get('261').target, 1);
  assert.equal(model.byRoom.get('261').action, 'open');
});

test('un départ attendu mal encodé reste une chambre libérée pour le Night', async () => {
  const engine = await loadEngine();
  assert.equal(engine.roomMode(room(261, 'STDM', { roomState:'Occupée', stay:'D�part attendu' })), 'departure');
});

test('une arrivée sofa sans chambre remonte comme anomalie sans inventer de chambre', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions(
    [room(261, 'STDM')],
    [{ id:'a', room:'', roomType:'STDM', sofas:2, name:'SANS CHAMBRE' }]
  ));
  assert.equal(model.unassigned.length, 1);
  assert.equal(model.summary.open, 0);
  assert.ok(model.issues.some(issue => issue.code === 'unassigned_sofa'));
});

test('une chambre annoncée par l’Ouverture mais absente du Room State est signalée', async () => {
  const engine = await loadEngine();
  const model = engine.buildModel(buildOptions(
    [room(261, 'STDM')],
    [{ id:'a', room:'999', roomType:'STDM', sofas:1, name:'A' }]
  ));
  assert.equal(model.missingRooms.length, 1);
  assert.ok(model.issues.some(issue => issue.code === 'missing_room'));
});

test('le quatrième étage respecte exactement le couloir impair en haut et pair en bas', async () => {
  const engine = await loadEngine();
  const rows = [];
  for (let number = 460; number <= 487; number += 1) rows.push({ roomNumber:String(number) });
  const layout = engine.buildFloorLayout(rows.reverse());
  assert.deepEqual(Array.from(layout.upper), ['461','463','465','467','469','471','473','475','477','479','481','483','485','487']);
  assert.deepEqual(Array.from(layout.lower), ['460','462','464','466','468','470','472','474','476','478','480','482','484','486']);
  assert.equal(layout.positions['461'].row, 0);
  assert.equal(layout.positions['460'].row, 1);
  assert.equal(layout.positions['487'].col, 13);
  assert.equal(layout.positions['486'].col, 13);
});

test('le troisième étage conserve ses deux ailes et la rupture centrale des ascenseurs', async () => {
  const engine = await loadEngine();
  const rows = [];
  for (let number = 320; number <= 342; number += 1) {
    if (![339, 341].includes(number)) rows.push({ roomNumber:String(number) });
  }
  for (let number = 360; number <= 387; number += 1) rows.push({ roomNumber:String(number) });
  const layout = engine.buildHotelFloorLayout(rows, 'Étage 3');
  assert.equal(rows.length, 49);
  assert.equal(layout.positions['320'].row, 1);
  assert.equal(layout.positions['320'].col, 0);
  assert.equal(layout.positions['342'].row, 1);
  assert.equal(layout.positions['342'].col, 11);
  assert.equal(layout.liftCol, 16);
  assert.equal(layout.positions['361'].row, 0);
  assert.equal(layout.positions['361'].col, 18);
  assert.equal(layout.positions['387'].row, 0);
  assert.equal(layout.positions['387'].col, 31);
  assert.equal(layout.columns, 32);
});

test('le deuxième étage reproduit les deux ailes et la branche verticale centrale', async () => {
  const engine = await loadEngine();
  const rows = [];
  for (let number = 220; number <= 258; number += 1) rows.push({ roomNumber:String(number) });
  for (let number = 260; number <= 287; number += 1) rows.push({ roomNumber:String(number) });
  const layout = engine.buildHotelFloorLayout(rows, 'Étage 2');
  assert.equal(rows.length, 67);
  assert.deepEqual([layout.positions['221'].row, layout.positions['221'].col], [0,0]);
  assert.deepEqual([layout.positions['220'].row, layout.positions['220'].col], [1,0]);
  assert.deepEqual([layout.positions['241'].row, layout.positions['241'].col], [0,10]);
  assert.deepEqual([layout.positions['242'].row, layout.positions['242'].col], [1,11]);
  assert.deepEqual([layout.positions['243'].row, layout.positions['243'].col], [2,14]);
  assert.deepEqual([layout.positions['244'].row, layout.positions['244'].col], [2,13]);
  assert.deepEqual([layout.positions['257'].row, layout.positions['257'].col], [9,14]);
  assert.deepEqual([layout.positions['258'].row, layout.positions['258'].col], [9,13]);
  assert.equal(layout.liftCol, 16);
  assert.deepEqual([layout.positions['261'].row, layout.positions['261'].col], [0,18]);
  assert.deepEqual([layout.positions['260'].row, layout.positions['260'].col], [1,18]);
  assert.deepEqual([layout.positions['287'].row, layout.positions['287'].col], [0,31]);
  assert.deepEqual([layout.positions['286'].row, layout.positions['286'].col], [1,31]);
  assert.equal(layout.rows, 10);
  assert.equal(layout.columns, 32);
});

test('le premier étage respecte le petit bloc, la branche verticale et la grande aile droite', async () => {
  const engine = await loadEngine();
  const rows = [];
  for (let number = 129; number <= 150; number += 1) rows.push({ roomNumber:String(number) });
  for (let number = 160; number <= 186; number += 1) rows.push({ roomNumber:String(number) });
  const layout = engine.buildHotelFloorLayout(rows, 'Étage 1');
  assert.equal(rows.length, 49);
  assert.deepEqual([layout.positions['129'].row, layout.positions['129'].col], [0,0]);
  assert.deepEqual([layout.positions['130'].row, layout.positions['130'].col], [1,0]);
  assert.deepEqual([layout.positions['133'].row, layout.positions['133'].col], [0,2]);
  assert.deepEqual([layout.positions['134'].row, layout.positions['134'].col], [1,2]);
  assert.deepEqual([layout.positions['135'].row, layout.positions['135'].col], [2,14]);
  assert.deepEqual([layout.positions['136'].row, layout.positions['136'].col], [2,13]);
  assert.deepEqual([layout.positions['149'].row, layout.positions['149'].col], [9,14]);
  assert.deepEqual([layout.positions['150'].row, layout.positions['150'].col], [9,13]);
  assert.equal(layout.liftCol, 16);
  assert.deepEqual([layout.positions['161'].row, layout.positions['161'].col], [0,18]);
  assert.deepEqual([layout.positions['160'].row, layout.positions['160'].col], [1,18]);
  assert.deepEqual([layout.positions['185'].row, layout.positions['185'].col], [0,30]);
  assert.deepEqual([layout.positions['186'].row, layout.positions['186'].col], [1,31]);
  assert.equal(layout.rows, 10);
  assert.equal(layout.columns, 32);
});

test('les ailes droites et les ascenseurs sont alignés verticalement entre les étages', async () => {
  const engine = await loadEngine();
  const floor4 = engine.buildHotelFloorLayout([{ roomNumber:'460' }, { roomNumber:'461' }], 'Étage 4');
  const floor3 = engine.buildHotelFloorLayout([{ roomNumber:'360' }, { roomNumber:'361' }], 'Étage 3');
  const floor2 = engine.buildHotelFloorLayout([{ roomNumber:'260' }, { roomNumber:'261' }], 'Étage 2');
  const floor1 = engine.buildHotelFloorLayout([{ roomNumber:'160' }, { roomNumber:'161' }], 'Étage 1');
  assert.deepEqual([floor4.positions['460'].col, floor3.positions['360'].col, floor2.positions['260'].col, floor1.positions['160'].col], [18,18,18,18]);
  assert.deepEqual([floor4.liftCol, floor3.liftCol, floor2.liftCol, floor1.liftCol], [16,16,16,16]);
  assert.deepEqual([floor4.columns, floor3.columns, floor2.columns, floor1.columns], [32,32,32,32]);
});

test('les ailes gauches 320 et 220 partagent la même colonne', async () => {
  const engine = await loadEngine();
  const floor3 = engine.buildHotelFloorLayout([{ roomNumber:'320' }, { roomNumber:'321' }], 'Étage 3');
  const floor2 = engine.buildHotelFloorLayout([{ roomNumber:'220' }, { roomNumber:'221' }], 'Étage 2');
  assert.equal(floor3.positions['320'].col, floor2.positions['220'].col);
  assert.equal(floor3.positions['321'].col, floor2.positions['221'].col);
});

test('les branches verticales du premier et du deuxième étage partagent les mêmes colonnes', async () => {
  const engine = await loadEngine();
  const floor2 = engine.buildHotelFloorLayout([{ roomNumber:'243' }, { roomNumber:'244' }], 'Étage 2');
  const floor1 = engine.buildHotelFloorLayout([{ roomNumber:'135' }, { roomNumber:'136' }], 'Étage 1');
  assert.equal(floor1.positions['135'].col, floor2.positions['243'].col);
  assert.equal(floor1.positions['136'].col, floor2.positions['244'].col);
});
