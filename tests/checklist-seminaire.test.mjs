import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
}
function load(saved) {
  const storage = new Map();
  if (saved) storage.set('rules', JSON.stringify(saved));
  const sandbox = {
    DEFAULT_KEYWORDS: { baby: [], comm: [], dayuse: [], early: [] },
    DEFAULT_VCC_RATES: [], DEFAULT_SOFA_RULES: {}, LS_RULES: 'rules',
    normalizeCoreKeywords: value => value || {},
    mergeVccRatesWithDefaults: value => value || [],
    mergeAssignmentWatchWithDefaults: value => value || [],
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }
  };
  vm.createContext(sandbox);
  vm.runInContext([
    section('  const DEFAULTS =', '  function stripAccentsLower('),
    section('  function stripAccentsLower(', '  function parseList('),
    section('  function makeChecklistRuleId(', '  function sanitizeBabyKeywordList('),
    section('  function loadRules(', '  let RULES ='),
    'this.api = { normalize: normalizeChecklistModelWithDefaults, loadRules };'
  ].join('\n'), sandbox);
  return { ...sandbox.api, stored: () => JSON.parse(storage.get('rules')) };
}
function expectAfter(model, side, anchorId) {
  const idx = model[side].findIndex(item => item.id === anchorId);
  assert.ok(idx >= 0);
  assert.equal(model[side][idx + 1].text, 'Contrôle chemise séminaire');
  assert.equal(model[side].filter(item => item.text === 'Contrôle chemise séminaire').length, 1);
}

test('les nouvelles checklists contiennent les deux contrôles aux bonnes positions et sont partagées', () => {
  const h = load();
  const rules = h.loadRules();
  expectAfter(rules.checklists, 'morning', 'm_ouverture');
  expectAfter(rules.checklists, 'evening', 'e_fermer_interfaces');
  assert.equal(rules.checklists.morning.length, 17);
  assert.equal(rules.checklists.evening.length, 15);
  assert.deepEqual(h.stored().checklists, JSON.parse(JSON.stringify(rules.checklists)));
});

test('migration des listes personnalisées : IDs et autres réglages préservés, aucun doublon au rechargement', () => {
  const h = load({ custom: 'conserver', checklists: {
    morning: [{ id: 'avant', text: 'Tâche personnalisée' }, { id: 'm_ouverture', text: 'Ouverture personnalisée' }, { id: 'apres', text: 'Suite' }],
    evening: [{ id: 'custom-id', text: 'Fermer interfaces' }, { id: 'fin', text: 'Fin' }]
  } });
  const once = h.loadRules().checklists;
  expectAfter(once, 'morning', 'm_ouverture');
  expectAfter(once, 'evening', 'custom-id');
  assert.deepEqual(Array.from(once.morning, x => x.id), ['avant', 'm_ouverture', 'm_controle_chemise_seminaire', 'apres']);
  assert.equal(h.stored().custom, 'conserver');
  assert.deepEqual(h.loadRules().checklists, once);
});

test('une consigne déjà ajoutée manuellement ne reçoit pas de doublon ni de nouvel ID', () => {
  const h = load();
  const result = h.normalize({ morning: [{ id: 'manuel', text: 'Contrôle chemise séminaire' }], evening: [] });
  assert.equal(result.morning.length, 1);
  assert.equal(result.morning[0].id, 'manuel');
});

test('la nouvelle ligne reste supprimable après la migration', () => {
  const h = load();
  const result = h.normalize({ morning: [], evening: [], seminarControlVersion: 1 });
  assert.equal(result.morning.length, 0);
  assert.equal(result.evening.length, 0);
});
