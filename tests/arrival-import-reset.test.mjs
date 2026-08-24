import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('un nouvel import invalide les anciennes cibles sofa manuelles', async () => {
  const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
  const resetStart = source.indexOf('function resetFolsStateForNewImport()');
  const resetEnd = source.indexOf('\n  function ', resetStart + 1);
  const resetSource = source.slice(resetStart, resetEnd > resetStart ? resetEnd : undefined);

  assert.ok(resetSource.includes("'oris_opening_sofa_overrides_v1'"));
  assert.ok(resetSource.includes("'oris_plan_room_target_overrides_v2'"));
});

test('un import manuel bloque la restauration ultérieure d’un ancien portefeuille', async () => {
  const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
  const importStart = source.indexOf('function handleIndivFile(file)');
  const importEnd = source.indexOf('\n  function ', importStart + 1);
  const importSource = source.slice(importStart, importEnd > importStart ? importEnd : undefined);
  const restoreStart = source.indexOf('function restoreLocalPortfolioFromCache()');
  const restoreEnd = source.indexOf('\n  function ', restoreStart + 1);
  const restoreSource = source.slice(restoreStart, restoreEnd > restoreStart ? restoreEnd : undefined);

  assert.ok(importSource.includes('LOCAL_PORTFOLIO_RESTORE_DONE = true'));
  assert.ok(importSource.includes('clearTimeout(LOCAL_PORTFOLIO_RESTORE_TIMER)'));
  assert.ok(restoreSource.includes('const hasLiveImport ='));
  assert.ok(restoreSource.includes('if (hasLiveImport)'));
});
