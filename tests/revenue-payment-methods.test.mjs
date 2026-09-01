import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadRevenue(){
  const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
  const section = (startMarker, endMarker) => {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start + startMarker.length);
    assert.ok(start >= 0 && end > start, `Section Caisse introuvable : ${startMarker}`);
    return source.slice(start, end);
  };
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext([
    section('  function stripAccentsLower(', '  function parseList('),
    section('  function splitCSV(', '  function splitCsvLogicalRecords('),
    section('  const REVENUE_STATE =', '  function updateRevenueCheckboxOptions('),
    'this.revenue = { simplifyRevenueMethod, parseRevenueCsv, getRevenueFilterStats, getFilteredRevenuePayments, state: REVENUE_STATE };'
  ].join('\n'), sandbox);
  return sandbox.revenue;
}

test('les libellés FOLS des chèques vacances conservent leur suffixe distinctif', async () => {
  const revenue = await loadRevenue();
  for (const label of [
    'Chèque vacances', 'Chèque vacances I',
    'CV - Chèques Vacances', 'CVI - Chèques Vacances I',
    'CHEQUE VACANCES', 'CHEQUE VACANCES I', 'Chèque vacances Connect'
  ]) {
    assert.equal(revenue.simplifyRevenueMethod(label, ''), label);
    assert.equal(revenue.simplifyRevenueMethod('', label), label);
  }
});

test('import, totaux, filtres et pointage séparent les deux catégories vacances', async () => {
  const revenue = await loadRevenue();
  const csv = [
    'PAYM_ID;PAYM_DATE_CREA;paym_amount;PaymType;ENUM_SLABEL;GUES_FULLNAME;USER_FULLNAME',
    '1;30/08/2026 09:00:00;100;Chèque vacances;CV;CLIENT TEST;VT',
    '2;30/08/2026 09:01:00;75;Chèque vacances I;CVI;CLIENT TEST;VT',
    '3;30/08/2026 09:02:00;-20;Chèque vacances;CV;CLIENT TEST;VT',
    '4;30/08/2026 09:03:00;25;CH - Chèque;CH;CLIENT TEST;VT',
    '5;30/08/2026 09:04:00;-15;;Chèque vacances I;CLIENT TEST;VT'
  ].join('\n');
  revenue.state.payments = revenue.parseRevenueCsv(csv);
  const stats = revenue.getRevenueFilterStats('method');
  assert.equal(revenue.state.payments.length, 5);
  assert.equal(stats.size, 3);
  assert.equal(stats.get('Chèque vacances').count, 2);
  assert.equal(stats.get('Chèque vacances').amount, 80);
  assert.equal(stats.get('Chèque vacances I').count, 2);
  assert.equal(stats.get('Chèque vacances I').amount, 60);
  assert.equal(stats.get('Chèque').amount, 25);

  revenue.state.filters.methods.add('Chèque vacances');
  assert.deepEqual(Array.from(revenue.getFilteredRevenuePayments(), p => p.id), ['1', '3']);
  revenue.state.checked.add('1');
  revenue.state.filters.hideChecked = true;
  assert.deepEqual(Array.from(revenue.getFilteredRevenuePayments(), p => p.id), ['3']);
  revenue.state.filters.methods.clear();
  revenue.state.filters.methods.add('Chèque vacances I');
  assert.deepEqual(Array.from(revenue.getFilteredRevenuePayments(), p => p.id), ['2', '5']);
});

test('les autres moyens de paiement conservent leur classification', async () => {
  const revenue = await loadRevenue();
  for (const [label, expected] of [
    ['CH - Chèque', 'Chèque'], ['CB - Carte Bancaire', 'Carte'],
    ['American Express', 'Amex'], ['CBMI - CB manuelle', 'CBMI'],
    ['Espèces', 'Espèces'], ['Virement', 'Virement']
  ]) assert.equal(revenue.simplifyRevenueMethod(label, ''), expected);
});
