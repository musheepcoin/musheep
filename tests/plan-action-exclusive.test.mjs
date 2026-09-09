import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('le mode Action remplace les autres vues et remet les sous-filtres à zéro', async () => {
  const source = await readFile(new URL('../plan-intelligent.module.js', import.meta.url), 'utf8');

  assert.match(source, /function setExclusiveView\(mode, resetStatusFilters = false\)/);
  assert.match(source, /setExclusiveView\('action', true\)/);
  assert.match(source, /setExclusiveView\('pool', true\)/);
  assert.match(source, /if \(actionView \|\| poolView\) \{\s*actionFilter = 'all'/);
  assert.match(source, /const active = !actionView && !poolView && actionFilter === key/);
  assert.match(source, /const dim = !actionView && !poolView && actionFilter !== 'all'/);
});

test('les filtres couleur ajoutent et retirent des chambres sans quitter Action', async () => {
  const source = await readFile(new URL('../plan-intelligent.module.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /const leavingExclusiveView = actionView \|\| poolView/);
  assert.match(source, /if \(visibleFolsStatuses\.includes\(status\)\) visibleFolsStatuses = visibleFolsStatuses\.filter/);
  assert.match(source, /presentation:row\.requiresIntervention \? base : extra/);
  assert.match(source, /const active = visibleFolsStatuses\.includes/);
});

test('les ouvertures et fermetures ont des contours d’intervention distincts', async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL('../plan-intelligent.module.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(source, /row\.folsKeyAction === 'add' \? 'open'/);
  assert.match(source, /row\.folsKeyAction === 'remove' \? 'close'/);
  assert.match(styles, /\.plan-ai-room\.is-intervention-open\{border-color:#2563eb/);
  assert.match(styles, /\.plan-ai-room\.is-intervention-close\{border-color:#d97706/);
});

test('le Plan affiche le maximum de sofas ouverts en plus par catégorie', async () => {
  const source = await readFile(new URL('../plan-intelligent.module.js', import.meta.url), 'utf8');

  assert.match(source, /id="plan-day-capacity"/);
  assert.match(source, /Max sofas ouverts en plus/);
  assert.match(source, /Ouvrables en plus/);
  assert.match(source, /Marge supplémentaire pouvant rester ouverte sans conflit/);
  assert.doesNotMatch(source, /<th scope="row">Arrivées sans sofa/);
  assert.doesNotMatch(source, /<th scope="row">Groupes à placer/);
});
