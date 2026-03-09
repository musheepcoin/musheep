(function(){
  const HOTEL_MODEL = {
    version: 3,
    generatedFrom: 'hotel_v3_digital_twin + site runtime',
    hotel: {
      id: 'novotel_collegien',
      name: 'Novotel Marne-la-Vallée Collégien',
      brand: 'Novotel',
      roomsTotal: 193,
      floors: [1,2,3,4],
      region: 'Paris',
      pms: 'FOLS'
    },
    lifts: {
      bank: 'A',
      lifts: [
        { id: 'A1', floors: [1,2,3] },
        { id: 'A2', floors: [1,2,3,4] }
      ]
    },
    roomTypes: {
      TRI:   { code:'TRI',   label:'Classique',  adults:2, children:1, sofa:1 },
      STDM:  { code:'STDM',  label:'Classique',  adults:2, children:2, sofa:2 },
      PRIVS: { code:'PRIVS', label:'Supérieure', adults:2, children:1, sofa:1 },
      PRIVM: { code:'PRIVM', label:'Supérieure', adults:2, children:2, sofa:2 },
      SGE:   { code:'SGE',   label:'Executive',  adults:2, children:1, sofa:1 },
      EXEC:  { code:'EXEC',  label:'Premium',    adults:2, children:2, sofa:2 }
    },
    noiseModel: {
      source: 'lift_shaft',
      levels: ['direct','near','low']
    },
    sofas: {
      theoreticalSource: 'room_type',
      actualSource: 'fols_icon_key_wrench'
    },
    operations: {
      role: 'first_reception',
      shifts: ['morning','evening'],
      deskSolo: true,
      mainConstraint: 'cognitive_load',
      strategy: 'externalized_structure'
    },
    semantics: {
      entities: [
        'reservation',
        'group',
        'inventory_section',
        'preference_signal',
        'assignment_watch',
        'vcc_signal',
        'dd_case',
        'checklist_day',
        'tariff_row'
      ],
      goal: 'build a hotel object understandable by the future AI layer'
    }
  };

  window.HOTEL_MODEL = HOTEL_MODEL;
})();
