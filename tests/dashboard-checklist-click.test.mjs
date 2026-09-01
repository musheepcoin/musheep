import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../todo.module.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
class Element {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.hidden = false; }
  append(...elements) { this.children.push(...elements); }
  appendChild(element) { this.append(element); }
  setAttribute(key, value) { this[key] = value; }
  focus() { this.focused = true; }
}
function loadRows() {
  const db = { days: { today: {
    morningFixedDone: {}, eveningFixedDone: {},
    morningExtra: [{ text: 'Tâche test', done: false }], eveningExtra: []
  } } };
  const sandbox = {
    document: { createElement: tag => new Element(tag) },
    loadHomeCheckDB: () => db, ensureHomeCheckDay: (db, key) => db.days[key],
    getCurrentHomeCheckDateKey: () => 'today',
    saveHomeCheckDB() {}, refreshHomeChecklist() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(source.indexOf('  function renderFixedRows('), source.indexOf('  function renderHomeChecklistColumn(')) +
    '\nthis.renderers = { renderFixedRows, renderExtraRows };', sandbox);
  return { db, ...sandbox.renderers };
}

test('les lignes fixes utilisent le même label natif que l’Assistant, avec un seul changement d’état', () => {
  const h = loadRows();
  for (const side of ['morning', 'evening']) {
    const host = new Element('div');
    h.renderFixedRows([{ id: 'test', text: 'Tâche' }], {}, host, side);
    const [row] = host.children;
    assert.equal(row.tagName, 'label');
    assert.equal(row.onclick, undefined, 'aucun handler click doublant le comportement natif');
    const [checkbox, text] = row.children;
    assert.equal(text.tagName, 'span');
    checkbox.checked = true;
    checkbox.onchange();
    assert.equal(h.db.days.today[`${side}FixedDone`].test, true);
    checkbox.checked = false;
    checkbox.onchange();
    assert.equal(h.db.days.today[`${side}FixedDone`].test, false);
  }
});

test('les tâches ajoutées sont cliquables sans confondre validation, édition et suppression', () => {
  const h = loadRows();
  const host = new Element('div');
  h.renderExtraRows(h.db.days.today.morningExtra, host, 'morning');
  const [toggle, input, edit, del] = host.children[0].children;
  assert.equal(toggle.tagName, 'label');
  assert.equal(input.hidden, true);
  assert.equal(toggle.children.length, 2, 'les boutons restent hors du label');
  const [checkbox, text] = toggle.children;
  checkbox.checked = true;
  checkbox.onchange();
  assert.equal(h.db.days.today.morningExtra[0].done, true);
  edit.onclick();
  assert.equal(input.hidden, false);
  assert.equal(toggle.hidden, true);
  input.value = 'Tâche corrigée';
  input.oninput();
  input.onkeydown({ key: 'Enter', preventDefault() {} });
  assert.equal(h.db.days.today.morningExtra[0].text, 'Tâche corrigée');
  assert.equal(text.textContent, 'Tâche corrigée');
  assert.equal(toggle.hidden, false);
  assert.equal(input.hidden, true);
  assert.equal(h.db.days.today.morningExtra[0].done, true);
  del.onclick();
  assert.equal(h.db.days.today.morningExtra.length, 0);
});

test('une nouvelle tâche vide reste immédiatement éditable', () => {
  const h = loadRows();
  const host = new Element('div');
  h.renderExtraRows([{ text: '', done: false }], host, 'morning');
  const [toggle, input] = host.children[0].children;
  assert.equal(toggle.hidden, true);
  assert.equal(input.hidden, false);
});

test('Dashboard et Assistant partagent la même règle visuelle de texte barré', () => {
  assert.match(css, /\.assistant-ops-check-item input:checked \+ span,\s*\.home-check-row input\[type="checkbox"\]:checked \+ \.home-check-fixed-text\{\s*color:#94a3b8;\s*text-decoration:line-through;/);
});
