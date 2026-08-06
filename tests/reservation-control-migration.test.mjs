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

async function loadEngine(localStorage){
  const source = await readFile(new URL('../sofa-engine.js', import.meta.url), 'utf8');
  const window = { localStorage };
  const sandbox = { window, localStorage, console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename:'sofa-engine.js' });
  return { engine:sandbox.window.ORIS_SOFA_ENGINE, sandbox, window };
}

test('un ancien cache Contrôle résa est migré au chargement sans ouvrir son onglet', async () => {
  const localStorage = createLocalStorage();
  const runtime = await loadEngine(localStorage);
  const { engine, sandbox, window } = runtime;
  const common = {
    reservationId: '2131793',
    folsReservationId: '2131793',
    arrivalDate: '2026-07-17',
    departureDate: '2026-07-18',
    guaranty: 'CP 30810313127143EJ ------------1285',
    roomType: 'PRIVM',
    groupName: '',
    comments: { message:'', preferences:'', todo:'', roomPref:'', arrivalHour:'' },
    aiItems: []
  };
  const oldPayload = {
    version: 2,
    sofaRulesSignature: engine.getRuleSignature(),
    items: [
      {
        ...common,
        id: '2131793__row_1',
        reservationLineKey: '2131793__row_1',
        guestName: 'VANDEN DAELE CHARLOTTE',
        adults: 2,
        children: 0,
        reservationControl: { babyDetected:false, capacityAlert:false }
      },
      {
        ...common,
        id: '2131793__row_2',
        reservationLineKey: '2131793__row_2',
        guestName: 'VANDEN DAELE CHARLOTTE - VANDEN DAELE Charlotte',
        adults: 2,
        children: 4,
        reservationControl: {
          babyDetected:false,
          capacityAlert:true,
          capacityAlertLevel:'critical',
          capacityAlertCode:'occupancy_critical'
        }
      }
    ]
  };
  localStorage.setItem('aar_reservation_control_v3', JSON.stringify(oldPayload));

  const document = {
    getElementById(){ return null; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    createElement(){ return {}; }
  };
  Object.assign(window, {
    document,
    ORIS_DEFAULT_KEYWORDS: {},
    __AAR_LAST_FOLS_ROWS: []
  });
  Object.assign(sandbox, {
    document,
    fetch: async () => { throw new Error('fetch inattendu'); },
    setTimeout,
    clearTimeout
  });
  const source = await readFile(new URL('../reservation-control.module.js', import.meta.url), 'utf8');
  vm.runInContext(source, sandbox, { filename:'reservation-control.module.js' });

  const migrated = JSON.parse(localStorage.getItem('aar_reservation_control_v3'));
  const vandenSix = migrated.items.find(item => Number(item.adults) + Number(item.children) === 6);

  assert.equal(migrated.multiRoomCoverageVersion, 1);
  assert.equal(vandenSix.reservationControl.multiRoomOccupancyCovered, true);
  assert.equal(vandenSix.reservationControl.multiRoomRoomCount, 2);
  assert.equal(vandenSix.reservationControl.multiRoomTotalOccupants, 8);
  assert.equal(vandenSix.reservationControl.multiRoomTotalCapacity, 8);
  assert.equal(vandenSix.reservationControl.capacityAlert, false);
});
