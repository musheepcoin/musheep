import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadEngine(){
  const source = await readFile(new URL('../sofa-engine.js', import.meta.url), 'utf8');
  const localStorage = { getItem(){ return null; } };
  const window = { localStorage };
  const sandbox = { window, localStorage, console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename:'sofa-engine.js' });
  return sandbox.window.ORIS_SOFA_ENGINE;
}

function vandenEntries(){
  const common = {
    dossierId: '2131793',
    arrivalDate: '2026-07-17',
    departureDate: '2026-07-18',
    reference: 'CP 30810313127143EJ ------------1285',
    roomType: 'PRIVM',
    eligible: true
  };
  return [
    {
      ...common,
      entryKey: '2131793__row_146',
      guestName: 'VANDEN DAELE CHARLOTTE',
      adults: 2,
      children: 0
    },
    {
      ...common,
      entryKey: '2131793__row_147',
      guestName: 'VANDEN DAELE CHARLOTTE - VANDEN DAELE Charlotte - VANDEN DAELE Charlotte',
      adults: 2,
      children: 4
    }
  ];
}

test('un lit bébé avec 2 adultes et 3 enfants est associé à 2 sofas', async () => {
  const engine = await loadEngine();
  const result = engine.calculate({
    adults: 2,
    children: 3,
    roomType: 'PRIVM',
    babyDetected: true
  });

  assert.equal(result.ruleNeed, 2);
  assert.equal(result.sofaNeed, 2);
  assert.equal(result.babyPlusOneSofaRule, false);
  assert.equal(result.babySofaNeed, 2);
});

test('la règle spéciale à 4 occupants reste associée à 1 sofa', async () => {
  const engine = await loadEngine();
  const result = engine.calculate({
    adults: 2,
    children: 2,
    roomType: 'PRIVM',
    babyDetected: true
  });

  assert.equal(result.ruleNeed, 2);
  assert.equal(result.sofaNeed, 1);
  assert.equal(result.babyPlusOneSofaRule, true);
  assert.equal(result.babySofaNeed, 1);
});

test('VANDEN est couvert par le dispatch de deux PRIVM', async () => {
  const engine = await loadEngine();
  const coverage = engine.buildMultiRoomCoverage(vandenEntries());
  const context = coverage.get('2131793__row_147');

  assert.equal(context.roomCount, 2);
  assert.equal(context.totalOccupants, 8);
  assert.equal(context.totalCapacity, 8);
  assert.equal(context.occupancyCovered, true);

  const result = engine.calculate({
    adults: 2,
    children: 4,
    roomType: 'PRIVM',
    multiRoomContext: context
  });

  assert.equal(result.lineCriticalOccupancy, true);
  assert.equal(result.multiRoomOccupancyCovered, true);
  assert.equal(result.criticalOccupancy, false);
  assert.equal(result.hasAlert, false);
});

test('deux homonymes avec des identifiants differents ne sont jamais regroupes', async () => {
  const engine = await loadEngine();
  const entries = vandenEntries().map((entry, index) => ({
    ...entry,
    entryKey: `homonyme_${index + 1}`,
    dossierId: String(9000 + index)
  }));

  const coverage = engine.buildMultiRoomCoverage(entries);
  assert.equal(coverage.size, 0);
});

test('deux references differentes sous le meme profil ne sont pas fusionnees', async () => {
  const engine = await loadEngine();
  const entries = vandenEntries().map((entry, index) => ({
    ...entry,
    entryKey: `reference_${index + 1}`,
    reference: `DOSSIER_${index + 1}`
  }));

  const coverage = engine.buildMultiRoomCoverage(entries);
  assert.equal(coverage.size, 0);
});

test('un vrai depassement de capacite multi-chambres reste en alerte', async () => {
  const engine = await loadEngine();
  const common = {
    dossierId: '777',
    arrivalDate: '2026-07-17',
    departureDate: '2026-07-18',
    reference: 'DOSSIER-777',
    guestName: 'TEST CAPACITE',
    roomType: 'TRI',
    eligible: true
  };
  const entries = [
    { ...common, entryKey:'tri_1', adults:2, children:4 },
    { ...common, entryKey:'tri_2', adults:1, children:0 }
  ];
  const coverage = engine.buildMultiRoomCoverage(entries);
  const context = coverage.get('tri_1');

  assert.equal(context.totalOccupants, 7);
  assert.equal(context.totalCapacity, 6);
  assert.equal(context.occupancyCovered, false);

  const result = engine.calculate({
    adults: 2,
    children: 4,
    roomType: 'TRI',
    multiRoomContext: context
  });
  assert.equal(result.hasAlert, true);
  assert.equal(result.alertLevel, 'critical');
});

test('un type de chambre inconnu interdit toute neutralisation', async () => {
  const engine = await loadEngine();
  const common = {
    dossierId: '778',
    arrivalDate: '2026-07-17',
    departureDate: '2026-07-18',
    reference: 'DOSSIER-778',
    guestName: 'TEST INCONNU',
    eligible: true
  };
  const entries = [
    { ...common, entryKey:'known_1', roomType:'PRIVM', adults:2, children:4 },
    { ...common, entryKey:'unknown_2', roomType:'INCONNU', adults:2, children:0 }
  ];
  const context = engine.buildMultiRoomCoverage(entries).get('known_1');

  assert.equal(context.allRoomTypesKnown, false);
  assert.equal(context.occupancyCovered, false);
  const result = engine.calculate({
    adults: 2,
    children: 4,
    roomType: 'PRIVM',
    multiRoomContext: context
  });
  assert.equal(result.hasAlert, true);
  assert.equal(result.alertLevel, 'critical');
});

test('la couverture des pax ne masque jamais un depassement de sofas', async () => {
  const engine = await loadEngine();
  const common = {
    dossierId: '888',
    arrivalDate: '2026-07-17',
    departureDate: '2026-07-18',
    reference: 'DOSSIER-888',
    guestName: 'TEST SOFA',
    roomType: 'TRI',
    eligible: true
  };
  const entries = [
    { ...common, entryKey:'sofa_1', adults:1, children:2 },
    { ...common, entryKey:'sofa_2', adults:1, children:0 }
  ];
  const context = engine.buildMultiRoomCoverage(entries).get('sofa_1');
  assert.equal(context.occupancyCovered, true);

  const result = engine.calculate({
    adults: 1,
    children: 2,
    roomType: 'TRI',
    multiRoomContext: context
  });
  assert.equal(result.sofaCapacityExceeded, true);
  assert.equal(result.hasAlert, true);
  assert.equal(result.alertLevel, 'capacity');
  assert.equal(result.alertCode, 'room_sofa_capacity');
  assert.equal(result.alertReason, 'TRI avec 1/2');
});
