import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../comment.module.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
function setup(saved = {}) {
  const elements = new Map(), storage = new Map([['oris_comment_preferences_v1', JSON.stringify(saved)]]), timers = new Map(), requests = [], copied = [];
  let timerId = 0;
  class Element {
    constructor() { this.value = ''; this.checked = false; this.dataset = {}; this.listeners = {}; this.attrs = {}; this.classList = { add() {}, remove() {} }; }
    addEventListener(event, callback) { (this.listeners[event] ||= []).push(callback); }
    async fire(event, extra = {}) { for (const callback of this.listeners[event] || []) await callback({ preventDefault() {}, ...extra }); }
    setAttribute(key, value) { this.attrs[key] = value; }
    reportValidity() { return !elements.get('signature').required || !!elements.get('signature').value; }
    focus() {} select() {}
  }
  const tones = ['professional', 'warm', 'empathetic', 'enthusiastic', 'concise', 'diplomatic'].map(tone => Object.assign(new Element(), { dataset: { commentTone: tone } }));
  const host = {
    set innerHTML(html) { for (const match of html.matchAll(/id="comment-([a-z-]+)"/g)) elements.set(match[1], new Element()); },
    querySelector(selector) { return elements.get(selector.replace('#comment-', '')); },
    querySelectorAll() { return tones; }
  };
  vm.runInNewContext(source, {
    document: { getElementById: () => host }, window: { location: { protocol: 'http:' } },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    navigator: { clipboard: { writeText: async value => copied.push(value) } }, AbortController,
    setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, clearTimeout: id => timers.delete(id),
    fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve: reply => resolve({ ok: true, json: async () => ({ reply }) }) }))
  });
  const get = id => elements.get(id);
  return { get, tones, storage, requests, copied,
    input: async (id, value) => { get(id).value = value; await get(id).fire('input'); },
    submit: async () => { await get('form').fire('submit'); await settle(); },
    flushPaste: async () => { for (const [id, timer] of timers) if (timer.ms < 1000) { timers.delete(id); timer.fn(); } await settle(); }
  };
}

test('commentaire UI : démarrage vide, aucun appel, signature obligatoire seulement si activée', async () => {
  const ui = setup();
  assert.equal(ui.get('generate').disabled, true);
  assert.equal(ui.get('auto-paste').checked, true);
  await ui.submit(); assert.equal(ui.requests.length, 0);
  await ui.input('source', 'Un avis fictif.');
  ui.get('with-signature').checked = true; await ui.get('with-signature').fire('input');
  assert.equal(ui.get('signature-wrap').hidden, false);
  await ui.submit(); assert.equal(ui.requests.length, 0);
  await ui.input('signature', 'La réception'); await ui.submit();
  assert.equal(ui.requests.length, 1);
});

test('commentaire UI : options et exemple transmis, un seul appel en cours, brouillon éditable et copiable', async () => {
  const ui = setup();
  await ui.input('source', 'Avis fictif.');
  await ui.tones[2].fire('click');
  await ui.input('examples', 'Avis : Exemple fictif.\nRéponse : Merci pour cet exemple.');
  await ui.submit(); await ui.submit();
  assert.equal(ui.requests.length, 1);
  const sent = JSON.parse(ui.requests[0].options.body);
  assert.equal(sent.tone, 'empathetic'); assert.equal(sent.examples, 'Avis : Exemple fictif.\nRéponse : Merci pour cet exemple.');
  assert.equal(ui.get('reply').readOnly, true);
  ui.requests[0].resolve('Réponse test.'); await settle();
  assert.equal(ui.get('reply').value, 'Réponse test.'); assert.equal(ui.get('reply').readOnly, false);
  await ui.input('reply', 'Réponse relue.'); await ui.get('copy').fire('click');
  assert.deepEqual(ui.copied, ['Réponse relue.']);
});

test('commentaire UI : changement de commentaire annule et rejette une ancienne réponse tardive', async () => {
  const ui = setup(); await ui.input('source', 'Avis A'); await ui.submit();
  await ui.input('source', 'Avis B');
  assert.equal(ui.requests[0].options.signal.aborted, true);
  await ui.submit(); ui.requests[1].resolve('Réponse B'); await settle();
  ui.requests[0].resolve('Réponse A tardive'); await settle();
  assert.equal(ui.get('reply').value, 'Réponse B');
  await ui.tones[1].fire('click');
  assert.equal(ui.get('copy').disabled, true);
  assert.equal(ui.get('status').dataset.state, 'stale');
});

test('commentaire UI : annulation et nouveau commentaire ne réaffichent pas une réponse obsolète', async () => {
  for (const action of ['cancel', 'clear']) {
    const ui = setup(); await ui.input('source', 'Avis'); await ui.submit();
    await ui.get(action).fire('click'); ui.requests[0].resolve('Trop tard'); await settle();
    assert.equal(ui.get('reply').value, ''); assert.equal(ui.get('copy').disabled, true);
    assert.equal(ui.requests[0].options.signal.aborted, true);
  }
});

test('commentaire UI : collage automatique activable, pas de génération pendant la saisie normale', async () => {
  for (const auto of [true, false]) {
    const ui = setup(); ui.get('auto-paste').checked = auto;
    await ui.input('source', 'Saisie'); await ui.flushPaste(); assert.equal(ui.requests.length, 0);
    await ui.get('source').fire('paste'); await ui.input('source', 'Texte collé'); await ui.flushPaste();
    assert.equal(ui.requests.length, auto ? 1 : 0);
  }
});

test('commentaire UI : avis et contexte non persistés, exemple uniquement sur consentement', async () => {
  const ui = setup();
  await ui.input('source', 'AVIS_PRIVE'); await ui.input('context', 'CONTEXTE_PRIVE');
  await ui.input('examples', 'EXEMPLE\nSTYLE');
  const prefs = () => ui.storage.get('oris_comment_preferences_v1');
  assert.doesNotMatch(prefs(), /AVIS_PRIVE|CONTEXTE_PRIVE|EXEMPLE|STYLE/);
  ui.get('remember-example').checked = true; await ui.get('remember-example').fire('change');
  assert.match(prefs(), /EXEMPLE/);
  ui.get('remember-example').checked = false; await ui.get('remember-example').fire('change');
  assert.doesNotMatch(prefs(), /EXEMPLE|STYLE/);
});

test('commentaire UI : longue bibliothèque transmise et mémorisée intégralement sans génération au collage', async () => {
  const examples = 'Avis : Très bien.\nRéponse : Merci !\n\n'.repeat(1000);
  const ui = setup();
  ui.get('remember-example').checked = true;
  await ui.input('examples', examples);
  await ui.get('examples').fire('paste'); await ui.flushPaste();
  assert.equal(ui.requests.length, 0);
  const prefs = JSON.parse(ui.storage.get('oris_comment_preferences_v1'));
  assert.equal(prefs.examples, examples);
  assert.equal(setup(prefs).get('examples').value, examples);
  await ui.input('source', 'Avis actuel'); await ui.submit();
  assert.equal(JSON.parse(ui.requests[0].options.body).examples, examples);
  assert.match(ui.get('examples-count').textContent, /60 000 caractères/);
});

test('commentaire UI : migration sans perte de l’ancien couple et consentement respecté', () => {
  const legacy = { rememberExample: true, exampleComment: 'Ancien avis', exampleReply: 'Ancienne réponse' };
  const ui = setup(legacy);
  assert.equal(ui.get('examples').value, 'Avis : Ancien avis\n\nRéponse : Ancienne réponse');
  assert.equal(setup({ ...legacy, rememberExample: false }).get('examples').value, '');
  assert.equal(setup({ ...legacy, examples: 'Nouvelle bibliothèque' }).get('examples').value, 'Nouvelle bibliothèque');
});

test('commentaire UI : collage trop long refusé sans troncature, remplacement sélectionné autorisé', async () => {
  const ui = setup();
  await ui.input('examples', 'x'.repeat(60000));
  const field = ui.get('examples'); field.selectionStart = 60000; field.selectionEnd = 60000;
  let prevented = false;
  await field.fire('paste', { preventDefault() { prevented = true; }, clipboardData: { getData: () => 'ajout' } });
  assert.equal(prevented, true); assert.equal(field.value.length, 60000);
  field.selectionStart = 0; prevented = false;
  await field.fire('paste', { preventDefault() { prevented = true; }, clipboardData: { getData: () => 'nouvelle liste' } });
  assert.equal(prevented, false);
  await ui.input('source', 'Avis'); await ui.input('examples', 'x'.repeat(60001)); await ui.submit();
  assert.equal(ui.requests.length, 0); assert.equal(ui.get('status').dataset.state, 'error');
});

test('commentaire UI : dépôt txt borné et lecture tardive ignorée après changement', async () => {
  const ui = setup();
  await ui.get('source').fire('drop', { dataTransfer: { files: [{ name: 'avis.csv', size: 10 }] } });
  assert.equal(ui.get('status').dataset.state, 'error');
  let resolve;
  const pending = ui.get('source').fire('drop', { dataTransfer: { files: [{ name: 'avis.txt', size: 10, text: () => new Promise(r => { resolve = r; }) }] } });
  await ui.input('source', 'Texte plus récent'); resolve('Ancien fichier'); await pending;
  assert.equal(ui.get('source').value, 'Texte plus récent');
});
