import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadMatcher(){
  const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
  const start = source.indexOf('  function matchesRevenueSearch');
  const end = source.indexOf('\n  function getFilteredRevenuePayments', start);
  assert.ok(start >= 0 && end > start, 'fonction de recherche Caisse introuvable');
  const sandbox = {
    normalizeRevenueText(value){ return String(value || '').toLowerCase().trim(); }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source.slice(start, end)}\nthis.matchesRevenueSearch = matchesRevenueSearch;`, sandbox);
  return sandbox.matchesRevenueSearch;
}

test('6 virgule ne retient que les montants 6.xx', async () => {
  const matches = await loadMatcher();
  const amounts = [276.98, 26, 6.5, 166.1, 6.4];
  assert.deepEqual(amounts.filter(amount => matches({ amount, searchText:'' }, '6,')), [6.5, 6.4]);
});

test('6 retient les montants commençant par 6 mais pas ceux qui contiennent 6 plus loin', async () => {
  const matches = await loadMatcher();
  const amounts = [6.5, 60, 65.2, 26, 166.1, 276.98];
  assert.deepEqual(amounts.filter(amount => matches({ amount, searchText:'' }, '6')), [6.5, 60, 65.2]);
});

test('le signe permet de cibler les montants négatifs', async () => {
  const matches = await loadMatcher();
  assert.equal(matches({ amount:-6.5, searchText:'' }, '-6,'), true);
  assert.equal(matches({ amount:6.5, searchText:'' }, '-6,'), false);
});

test('une recherche textuelle conserve le fonctionnement habituel', async () => {
  const matches = await loadMatcher();
  assert.equal(matches({ amount:12, searchText:'leo valere amex' }, 'valere'), true);
  assert.equal(matches({ amount:12, searchText:'leo valere amex' }, 'martin'), false);
});
