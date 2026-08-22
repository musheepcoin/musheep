(function(){
  'use strict';

  window.__ORIS_PLAN_INTELLIGENT_ACTIVE = true;
  const OVERRIDES_KEY = 'oris_plan_room_target_overrides_v2';
  const FILTER_KEY = 'oris_plan_intelligent_filter_v1';
  const FLOORS_KEY = 'oris_plan_intelligent_floors_v1';
  const FOLS_FILTER_KEY = 'oris_plan_fols_status_filters_v1';
  const ACTION_VIEW_KEY = 'oris_plan_fols_action_view_v1';
  const POOL_MARGINS_KEY = 'oris_plan_sofa_pool_margins_v1';
  const POOL_VIEW_KEY = 'oris_plan_sofa_pool_view_v1';
  const MIGRATION_KEY = 'oris_plan_intelligent_migration_v1';
  const LEGACY_BACKUP_KEY = 'oris_plan_legacy_backup_v1';
  const LEGACY_KEYS = [
    'aar_plan_night_input_v1',
    'aar_plan_crossed_equipment_v1',
    'aar_plan_manual_sofa_rooms_v1',
    'aar_plan_arrivals_meta_v2',
    'aar_plan_arrivals_requirements_v2',
    'aar_plan_arrivals_profile_v1'
  ];
  let selectedRoom = '';
  let actionFilter = localStorage.getItem(FILTER_KEY) || 'all';
  let visibleFloors = loadJson(FLOORS_KEY, []);
  const allFolsStatuses = ['hs','departure','arrival','available','present'];
  let visibleFolsStatuses = loadJson(FOLS_FILTER_KEY, allFolsStatuses.slice());
  let actionView = localStorage.getItem(ACTION_VIEW_KEY) === '1';
  let poolView = localStorage.getItem(POOL_VIEW_KEY) === '1';
  let mapScrollLeft = 0;
  let bound = false;
  let rendering = false;

  function byId(id){ return document.getElementById(id); }
  function esc(value){
    return String(value == null ? '' : value)
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'",'&#39;');
  }
  function loadJson(key, fallback){
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    } catch (_) { return fallback; }
  }
  function saveJson(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function formatDate(key){
    const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return 'Date inconnue';
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      .toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }
  function formatImport(meta){
    if (!meta) return 'Non chargé';
    const reference = window.ORIS_PLAN_ENGINE?.dateKey?.(meta.referenceDate);
    const count = Number(meta.matched || 0);
    return [reference ? formatDate(reference) : '', count ? `${count} chambres` : ''].filter(Boolean).join(' · ') || 'Chargé';
  }
  function floorLabel(room){
    const stored = String(room?.floor || '').trim();
    if (stored) return stored;
    const number = Number(String(room?.room_num || '').replace(/\D/g,''));
    return `Étage ${Math.max(1, Math.floor(number / 100) || 1)}`;
  }
  function floorRank(label){ return Number(String(label || '').match(/\d+/)?.[0] || 0); }
  function allFloors(model){
    return [...new Set(model.rows.map(row => floorLabel(row.room)))].sort((a,b) => floorRank(b) - floorRank(a));
  }
  function normalizeVisibleFloors(model){
    const floors = allFloors(model);
    if (!Array.isArray(visibleFloors) || !visibleFloors.length) visibleFloors = floors.slice();
    visibleFloors = visibleFloors.filter(floor => floors.includes(floor));
    if (!visibleFloors.length) visibleFloors = floors.slice();
    return floors;
  }
  function scopedRows(model){
    normalizeVisibleFloors(model);
    return model.rows.filter(row => visibleFloors.includes(floorLabel(row.room)));
  }
  function getLegacyState(){ return window.PLAN_LEGACY?.getState?.() || { rooms:[], roomStateMeta:null, elevators:[] }; }
  function getOpeningSnapshot(){
    return window.ORIS_OPENING?.getSnapshot?.() || { version:1, dateKey:'', importedAt:'', assignments:[], rows:[], unassigned:[] };
  }
  function getRecoucheRooms(dateKey){
    const source = window.__AAR_TRUE_RECOUCHE_IDS_BY_DATE?.[dateKey];
    const ids = source instanceof Set ? source : new Set(Array.isArray(source) ? source.map(String) : []);
    const items = Array.isArray(window.__AAR_RESERVATION_CONTROL?.items) ? window.__AAR_RESERVATION_CONTROL.items : [];
    const rooms = {};
    items.forEach(item => {
      const id = String(item?.dossierId || item?.reservationId || item?.folsReservationId || '').trim();
      if (!id || !ids.has(id)) return;
      const room = String(item?.roomNumber || item?.ROOM_NUM || '').match(/\d{2,4}/)?.[0] || '';
      if (room) rooms[String(Number(room))] = { id, name:String(item?.guestName || item?.name || '').trim() };
    });
    return rooms;
  }
  function getOverrides(){
    const value = loadJson(OVERRIDES_KEY, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
  function migrateLegacyOnce(){
    if (localStorage.getItem(MIGRATION_KEY) === '1') return;
    const backup = {};
    LEGACY_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value != null && value !== '' && value !== '{}' && value !== '[]') backup[key] = value;
    });
    if (Object.keys(backup).length) saveJson(LEGACY_BACKUP_KEY, { savedAt:new Date().toISOString(), values:backup });
    localStorage.setItem(MIGRATION_KEY, '1');
  }
  function buildModel(){
    const legacy = getLegacyState();
    const opening = getOpeningSnapshot();
    const model = window.ORIS_PLAN_ENGINE.buildModel({
      rooms: legacy.rooms,
      roomStateMeta: legacy.roomStateMeta,
      openingSnapshot: opening,
      recoucheRooms: getRecoucheRooms(opening.dateKey),
      overrides: getOverrides()
    });
    const forecastMeta = window.__AAR_GET_OCCUPANCY_FORECAST_META?.() || {
      forecast:window.__AAR_GET_OCCUPANCY_FORECAST?.() || [],
      sourceCount:Array.isArray(window.__AAR_RESERVATION_CONTROL?.items) ? window.__AAR_RESERVATION_CONTROL.items.length : 0,
      activeDate:model.openingDate,
      coverageEnd:''
    };
    model.sofaPool = window.ORIS_PLAN_SOFA_POOL?.build?.({
      baseDate:model.openingDate,
      forecast:forecastMeta.forecast,
      forecastMeta,
      items:window.__AAR_RESERVATION_CONTROL?.items || [],
      rows:model.rows,
      recoucheIdsByDate:window.__AAR_TRUE_RECOUCHE_IDS_BY_DATE || {},
      margins:loadJson(POOL_MARGINS_KEY, {})
    }) || null;
    return model;
  }
  function ensureShell(){
    const view = byId('view-plan');
    if (!view || view.dataset.intelligentPlan === '1') return view;
    view.dataset.intelligentPlan = '1';
    view.innerHTML = `
      <section class="plan-ai-shell">
        <header class="plan-ai-header">
          <div>
            <p class="plan-ai-eyebrow">Housekeeping assisté</p>
            <h1>Plan des ouvertures</h1>
            <p>État actuel du Room State comparé automatiquement à l’Ouverture.</p>
          </div>
          <div class="plan-ai-sync" id="plan-ai-sync"></div>
        </header>

        <section class="plan-ai-sources">
          <article class="plan-ai-source-card">
            <span class="plan-ai-source-icon">◎</span>
            <div><strong>Ouverture</strong><small id="plan-opening-status">Non chargée</small></div>
            <button type="button" id="plan-open-opening">Voir</button>
          </article>
          <article class="plan-ai-source-card plan-ai-source-drop" id="plan-roomstate-strip" role="button" tabindex="0">
            <span class="plan-ai-source-icon">▦</span>
            <div><strong>Room State</strong><small id="plan-roomstate-date">Non chargé</small></div>
            <button type="button" id="plan-roomstate-drop">Importer</button>
            <input id="plan-roomstate-file" type="file" accept=".csv,.txt,text/csv,text/plain" hidden>
          </article>
        </section>

        <section class="plan-ai-summary" id="plan-ai-summary" aria-label="Résumé des actions"></section>
        <section class="plan-sofa-pool" id="plan-sofa-pool"></section>

        <div class="plan-ai-workspace">
          <main class="plan-ai-map-panel">
            <div class="plan-ai-toolbar">
              <div class="plan-ai-floor-filters" id="plan-ai-floor-filters"></div>
              <button type="button" class="plan-ai-secondary-button" id="plan-ai-show-all">Tout afficher</button>
            </div>
            <div class="plan-ai-fols-legend" aria-label="Filtrer par couleur FOLS">
              <button type="button" class="fols-hs" data-fols-filter="hs">HS</button><button type="button" class="fols-departure" data-fols-filter="departure">En départ</button><button type="button" class="fols-arrival" data-fols-filter="arrival">Arrivée</button><button type="button" class="fols-available" data-fols-filter="available">Disponible</button><button type="button" class="fols-present" data-fols-filter="present">Présent</button><button type="button" class="plan-ai-action-view" id="plan-ai-action-view" aria-label="Afficher les chambres disponibles et les interventions FOLS">Action</button><button type="button" class="plan-ai-pool-view" id="plan-ai-pool-view" aria-label="Afficher le prévisionnel et les chambres recommandées">Prévisionnel</button>
            </div>
            <div class="plan-ai-alert" id="plan-ai-alert" hidden></div>
            <div class="plan-ai-map" id="plan-stage"></div>
          </main>

          <aside class="plan-ai-side">
            <section class="plan-ai-actions-panel">
              <div class="plan-ai-panel-head"><h2>Actions FOLS</h2><span id="plan-ai-action-count"></span></div>
              <div class="plan-ai-action-list" id="plan-ai-action-list"></div>
            </section>
          </aside>
        </div>
      </section>
      <dialog class="plan-ai-room-dialog" id="plan-room-dialog">
        <div class="plan-ai-dialog-head"><h2>Détail chambre</h2><span id="plan-inspector-state"></span><button type="button" id="plan-room-dialog-close" aria-label="Fermer">×</button></div>
        <div id="plan-inspector" class="plan-ai-inspector"></div>
      </dialog>`;
    return view;
  }
  function signed(value){ return Number(value) > 0 ? `+${Number(value)}` : String(Number(value || 0)); }
  function renderSofaPool(model){
    const host = byId('plan-sofa-pool');
    const pool = model.sofaPool;
    if (!host) return;
    host.hidden = !poolView;
    if (!poolView) {
      host.innerHTML = '';
      return;
    }
    if (!pool?.ready) {
      const messages = {
        missing_source:'Prévision sofa indisponible : aucun portefeuille de réservations chargé.',
        date_mismatch:`Prévision sofa indisponible : le prévisionnel est calé sur le ${esc(pool?.sourceDate?.split('-').reverse().join('/') || '—')}, mais le Plan travaille sur le ${esc(pool?.baseDate?.split('-').reverse().join('/') || '—')}.`,
        missing_j1:'Prévision sofa indisponible : la journée de demain n’est pas couverte.'
      };
      host.innerHTML = `<div class="plan-sofa-pool-empty">${messages[pool?.status] || 'Prévision sofa indisponible : portefeuille inexploitable.'}</div>`;
      return;
    }
    const endLabel = pool.endDate.split('-').reverse().join('/');
    const openings = pool.recommendations.filter(item => item.action === 'open');
    const keeps = pool.recommendations.filter(item => item.action === 'keep');
    const closes = pool.recommendations.filter(item => item.action === 'close');
    host.innerHTML = `
      <div class="plan-sofa-pool-head">
        <div><p>Prévision sofa</p><h2>Parc conseillé jusqu’au dimanche ${esc(endLabel)}</h2><small>Demain est prioritaire. Le reste de la semaine stabilise les clés sans jamais réduire le besoin J+1.</small></div>
      </div>
      ${!pool.closureSafe ? `<div class="plan-sofa-pool-warning">Portefeuille connu jusqu’au ${esc(pool.coverageEnd?.split('-').reverse().join('/') || '—')} seulement : les ouvertures restent proposées, mais aucune fermeture n’est autorisée.</div>` : ''}
      <div class="plan-sofa-pool-grid">
        ${pool.categories.filter(item => item.inventory > 0).map(item => `<article class="plan-sofa-pool-category">
          <div><strong>${esc(item.category)}</strong><span>${item.currentKeys} clés aujourd’hui</span></div>
          <dl><div><dt>Demain</dt><dd>${item.j1Need}</dd></div><div><dt>Pic</dt><dd>${item.peakNeed}</dd></div><div><dt>Conseillé</dt><dd>${item.target}</dd></div><div class="is-delta"><dt>Écart sûr</dt><dd>${signed(item.delta)}</dd></div></dl>
          <p class="plan-sofa-pool-counts"><span>+${item.openCount}</span><span>=${item.keepCount}</span><span>−${item.closeCount}</span></p>
          <label>Marge <b id="plan-pool-margin-value-${esc(item.category)}">+${item.margin}</b><input type="range" min="0" max="10" step="1" value="${item.margin}" data-plan-pool-margin="${esc(item.category)}"></label>
        </article>`).join('')}
      </div>
      <div class="plan-sofa-pool-recommendations">
        <strong>Ouvrir (${openings.length})</strong><span>${openings.map(item => item.roomNumber).join(', ') || 'Aucune'}</span>
        <strong>Conserver (${keeps.length})</strong><span>${keeps.map(item => item.roomNumber).join(', ') || 'Aucune'}</span>
        <strong>Fermer (${closes.length})</strong><span>${pool.closureSafe ? (closes.map(item => item.roomNumber).join(', ') || 'Aucune') : 'Bloqué : horizon incomplet'}</span>
        <small>Les arrivées J+1 restent absolues. Une fermeture n’est affichée que si le portefeuille couvre réellement tout l’horizon.</small>
      </div>`;
    host.querySelectorAll('[data-plan-pool-margin]').forEach(input => input.addEventListener('input', event => {
      const category = event.target.getAttribute('data-plan-pool-margin') || '';
      const value = Number(event.target.value || 0);
      const label = byId(`plan-pool-margin-value-${category}`);
      if (label) label.textContent = `+${value}`;
    }));
    host.querySelectorAll('[data-plan-pool-margin]').forEach(input => input.addEventListener('change', event => {
      const category = event.target.getAttribute('data-plan-pool-margin') || '';
      const margins = loadJson(POOL_MARGINS_KEY, {});
      margins[category] = Number(event.target.value || 0);
      saveJson(POOL_MARGINS_KEY, margins);
      render();
    }));
  }
  function actionDefinition(key, count){
    const labels = {
      all:'Toutes', open:'À ouvrir', keep:'À laisser', close:'À fermer', review:'À contrôler'
    };
    return `<button type="button" class="plan-ai-summary-card is-${key}${actionFilter === key ? ' is-active' : ''}" data-plan-action-filter="${key}"><strong>${Number(count || 0)}</strong><span>${labels[key]}</span></button>`;
  }
  function renderSummary(model){
    const host = byId('plan-ai-summary');
    if (!host) return;
    const summary = { open:0, keep:0, close:0, review:0 };
    scopedRows(model).forEach(row => {
      if (Object.prototype.hasOwnProperty.call(summary, row.folsAction)) summary[row.folsAction] += 1;
    });
    const actionable = summary.open + summary.keep + summary.close + summary.review;
    host.innerHTML = [
      actionDefinition('all', actionable),
      actionDefinition('open', summary.open),
      actionDefinition('keep', summary.keep),
      actionDefinition('close', summary.close),
      actionDefinition('review', summary.review)
    ].join('');
    host.querySelectorAll('[data-plan-action-filter]').forEach(button => button.addEventListener('click', () => {
      actionFilter = button.getAttribute('data-plan-action-filter') || 'all';
      localStorage.setItem(FILTER_KEY, actionFilter);
      render();
    }));
  }
  function renderSources(model){
    const openingStatus = byId('plan-opening-status');
    const roomStateStatus = byId('plan-roomstate-date');
    const sync = byId('plan-ai-sync');
    const legacy = getLegacyState();
    if (openingStatus) openingStatus.textContent = model.openingReady
      ? `${formatDate(model.openingDate)} · ${model.assignments.length} arrivée(s)`
      : 'Arrival List requise';
    if (roomStateStatus) roomStateStatus.textContent = formatImport(legacy.roomStateMeta);
    if (sync) {
      sync.className = `plan-ai-sync is-${model.ready ? 'ready' : 'warning'}`;
      sync.innerHTML = model.ready
        ? `<strong>Synchronisé</strong><span>${esc(formatDate(model.openingDate))}</span>`
        : `<strong>À synchroniser</strong><span>${esc(model.issues[0]?.label || 'Sources requises')}</span>`;
    }
    const alert = byId('plan-ai-alert');
    if (alert) {
      alert.hidden = model.ready;
      alert.textContent = model.ready ? '' : (model.issues[0]?.label || 'Charge l’Ouverture et le Room State de la même date.');
    }
  }
  function renderFloorFilters(model){
    const host = byId('plan-ai-floor-filters');
    if (!host) return;
    const floors = normalizeVisibleFloors(model);
    host.innerHTML = floors.map(floor => `<button type="button" class="plan-ai-floor-button${visibleFloors.includes(floor) ? ' is-active' : ''}" data-plan-floor="${esc(floor)}">${esc(floor)}</button>`).join('');
    host.querySelectorAll('[data-plan-floor]').forEach(button => button.addEventListener('click', () => {
      const floor = button.getAttribute('data-plan-floor') || '';
      if (visibleFloors.includes(floor) && visibleFloors.length > 1) visibleFloors = visibleFloors.filter(value => value !== floor);
      else if (!visibleFloors.includes(floor)) visibleFloors.push(floor);
      saveJson(FLOORS_KEY, visibleFloors);
      render();
    }));
  }
  function showRoomDialogNear(anchorRect){
    const dialog = byId('plan-room-dialog');
    if (!dialog || !anchorRect) return;
    if (!dialog.open) dialog.show();
    requestAnimationFrame(() => {
      const gap = 10;
      const edge = 8;
      const box = dialog.getBoundingClientRect();
      let left = Number(anchorRect.right) + gap;
      if (left + box.width > window.innerWidth - edge) left = Number(anchorRect.left) - box.width - gap;
      left = Math.max(edge, Math.min(left, window.innerWidth - box.width - edge));
      let top = Number(anchorRect.top) + (Number(anchorRect.height) / 2) - Math.min(box.height, window.innerHeight - edge * 2) / 2;
      top = Math.max(edge, Math.min(top, window.innerHeight - box.height - edge));
      dialog.style.inset = 'auto';
      dialog.style.left = `${Math.round(left)}px`;
      dialog.style.top = `${Math.round(top)}px`;
      dialog.style.right = 'auto';
      dialog.style.bottom = 'auto';
    });
  }
  function roomCard(row, position, presentation){
    const dim = !poolView && actionFilter !== 'all' && row.folsAction !== actionFilter;
    const currentTool = row.current?.detected
      ? `<span class="plan-ai-room-tool" aria-label="Équipement Chambre détecté${row.current.valid ? ` : ${Number(row.current.count)} sofa${Number(row.current.count) > 1 ? 's' : ''}` : ' : commentaire à contrôler'}" title="Équipement Chambre détecté${row.current.valid ? ` : ${Number(row.current.count)} sofa${Number(row.current.count) > 1 ? 's' : ''}` : ' : commentaire à contrôler'}">🔧</span>`
      : '';
    const interventionClass = !poolView && row.requiresIntervention ? ' is-intervention' : '';
    const poolRecommendation = row.poolRecommendation;
    const poolClass = poolView && poolRecommendation ? ` is-pool-recommended is-pool-${poolRecommendation.action} is-pool-priority-${poolRecommendation.priority}` : '';
    const poolBadge = poolView && poolRecommendation
      ? `<span class="plan-ai-room-pool-badge" title="${esc(poolRecommendation.reason)}">${poolRecommendation.action === 'open' ? '+' : poolRecommendation.action === 'close' ? '−' : '='}</span>`
      : '';
    const actionBadge = row.folsKeyAction === 'add'
      ? `<span class="plan-ai-room-badge">+${Number(row.target)}</span>`
      : row.action === 'recouche' ? '<span class="plan-ai-room-badge">R</span>' : '';
    const turnoverClass = presentation.turnoverStatus ? ` is-turnover-${presentation.turnoverStatus}` : '';
    const turnoverTitle = row.turnoverStatus === 'arrival'
      ? 'Départ puis arrivée attribuée'
      : row.turnoverStatus === 'available' ? 'Départ puis chambre vide' : '';
    return `<button type="button" class="plan-ai-room is-${esc(row.folsTone)} fols-${esc(presentation.folsStatus || 'available')}${esc(turnoverClass)}${interventionClass}${poolClass}${selectedRoom === row.roomNumber ? ' is-selected' : ''}${dim ? ' is-dimmed' : ''}" data-plan-room="${esc(row.roomNumber)}" style="grid-column:${position.col + 1};grid-row:${position.row + 1}" title="${esc(`${row.roomNumber} · ${poolRecommendation?.reason ? `${poolRecommendation.reason} · ` : ''}${turnoverTitle ? `${turnoverTitle} · ` : ''}${row.folsActionLabel} · ${row.folsActionReason}`)}">
      ${actionBadge}
      ${poolBadge}
      ${currentTool}
      <strong>${esc(row.roomNumber)}</strong>
    </button>`;
  }
  function renderMap(model){
    const host = byId('plan-stage');
    if (!host) return;
    model.rows.forEach(row => { row.poolRecommendation = model.sofaPool?.byRoom?.get(row.roomNumber) || null; });
    const grouped = new Map();
    model.rows.forEach(row => {
      const floor = floorLabel(row.room);
      if (!visibleFloors.includes(floor)) return;
      if (!grouped.has(floor)) grouped.set(floor, []);
      grouped.get(floor).push(row);
    });
    const floors = [...grouped.keys()].sort((a,b) => floorRank(b) - floorRank(a));
    const columnWidth = 44;
    const rowHeight = 48;
    const buildingWidth = 24 + 32 * (columnWidth + 4);
    const floorMarkup = floors.map(floor => {
      const rows = grouped.get(floor) || [];
      const layout = window.ORIS_PLAN_ENGINE.buildHotelFloorLayout(rows, floor);
      const presentedRows = poolView
        ? rows.map(row => ({
            row,
            presentation:window.ORIS_PLAN_ENGINE.roomPresentation(row, allFolsStatuses)
          })).filter(item => item.presentation.visible && !!item.row.poolRecommendation)
        : actionView
          ? rows.map(row => ({
            row,
            presentation:window.ORIS_PLAN_ENGINE.roomPresentation(row, ['hs','arrival','available','present'])
          })).filter(item => item.presentation.visible && (item.presentation.folsStatus === 'available' || item.row.requiresIntervention))
          : rows.map(row => ({ row, presentation:window.ORIS_PLAN_ENGINE.roomPresentation(row, visibleFolsStatuses) })).filter(item => item.presentation.visible);
      return `<section class="plan-ai-floor">
        <header><h2>${esc(floor)}</h2><span>${rows.length} chambres · ${esc(layout.description)}</span></header>
        <div class="plan-ai-floor-grid is-aligned is-compact" style="grid-template-columns:repeat(32,${columnWidth}px);grid-template-rows:repeat(${layout.rows},${rowHeight}px)">
          <div class="plan-ai-floor-lifts" style="grid-column:${layout.liftCol + 1};grid-row:${layout.liftRow + 1} / span ${layout.liftRowSpan}" aria-label="Ascenseur A2"><b>A2</b></div>
          ${presentedRows.map(item => roomCard(item.row, layout.positions[item.row.roomNumber], item.presentation)).join('')}
        </div>
      </section>`;
    }).join('');
    host.innerHTML = `<div class="plan-ai-building-scroll"><div class="plan-ai-building" style="width:${buildingWidth}px">${floorMarkup}</div></div>`;
    const buildingScroll = host.querySelector('.plan-ai-building-scroll');
    if (buildingScroll) {
      buildingScroll.scrollLeft = mapScrollLeft;
      buildingScroll.addEventListener('scroll', () => { mapScrollLeft = buildingScroll.scrollLeft; }, { passive:true });
    }
    host.querySelectorAll('[data-plan-room]').forEach(button => button.addEventListener('click', () => {
      const anchorRect = button.getBoundingClientRect();
      selectedRoom = button.getAttribute('data-plan-room') || '';
      render();
      showRoomDialogNear(anchorRect);
    }));
  }
  function filteredActions(model){
    const operational = scopedRows(model).filter(row => ['open','keep','close','review'].includes(row.folsAction));
    const filtered = actionFilter === 'all' ? operational : operational.filter(row => row.folsAction === actionFilter);
    const order = { review:0, open:1, close:2, keep:3 };
    return filtered.sort((a,b) => (order[a.folsAction] - order[b.folsAction]) || Number(a.roomNumber) - Number(b.roomNumber));
  }
  function renderActions(model){
    const host = byId('plan-ai-action-list');
    const counter = byId('plan-ai-action-count');
    if (!host) return;
    const rows = filteredActions(model);
    if (counter) counter.textContent = `${rows.length} action${rows.length > 1 ? 's' : ''}`;
    host.innerHTML = rows.length ? rows.map(row => `<button type="button" class="plan-ai-action-row is-${esc(row.folsTone)}" data-plan-action-room="${esc(row.roomNumber)}">
      <span class="plan-ai-action-room">${esc(row.roomNumber)}</span>
      <span><strong>${esc(row.folsActionLabel)}</strong><small>${esc(row.assignment?.name || row.folsActionReason)}</small></span>
      <em>${row.current.detected ? 1 : 0}→${Number(row.target) > 0 ? 1 : 0}</em>
    </button>`).join('') : '<div class="plan-ai-empty">Aucune action dans ce filtre.</div>';
    host.querySelectorAll('[data-plan-action-room]').forEach(button => button.addEventListener('click', () => {
      const anchorRect = button.getBoundingClientRect();
      selectedRoom = button.getAttribute('data-plan-action-room') || '';
      actionFilter = 'all';
      localStorage.setItem(FILTER_KEY, actionFilter);
      render();
      showRoomDialogNear(anchorRect);
    }));
  }
  function renderInspector(model){
    const host = byId('plan-inspector');
    const label = byId('plan-inspector-state');
    if (!host) return;
    const row = model.byRoom.get(String(selectedRoom || ''));
    if (!row) {
      if (label) label.textContent = 'Aucune sélection';
      host.innerHTML = '<div class="plan-ai-empty">Clique sur une chambre pour comprendre la décision et, si nécessaire, la corriger.</div>';
      return;
    }
    if (label) label.textContent = floorLabel(row.room);
    const overrideValue = row.forcedTarget == null ? 'auto' : String(row.forcedTarget);
    const assignmentText = row.assignment
      ? `${row.assignment.name || 'Client'} · ${row.assignment.adults || 0}A/${row.assignment.children || 0}E`
      : 'Aucune arrivée affectée';
    host.innerHTML = `
      <div class="plan-ai-inspector-hero is-${esc(row.folsTone)}"><strong>${esc(row.roomNumber)}</strong><span>${esc(row.roomType)}</span><b>${esc(row.folsActionLabel)}</b></div>
      <dl class="plan-ai-details">
        <div><dt>État chambre</dt><dd>${esc(row.room.roomState || '—')} · ${esc(row.room.meta?.Stay || '—')}</dd></div>
        <div><dt>Arrivée</dt><dd>${esc(assignmentText)}</dd></div>
        <div><dt>Recouche</dt><dd>${row.isRecouche ? 'Confirmée par l’Assistant' : 'Non détectée'}</dd></div>
        <div><dt>Configuration actuelle</dt><dd>${Number(row.current.count)} sofa(s) · ${esc(row.current.source)}</dd></div>
        <div><dt>Besoin housekeeping</dt><dd>${Number(row.automaticTarget)} sofa(s)</dd></div>
        <div><dt>Préparation housekeeping</dt><dd>${Number(row.current.count)} → ${Number(row.target)} sofa(s) · ${esc(row.actionLabel)}</dd></div>
        <div><dt>Décision FOLS</dt><dd>${esc(row.folsActionReason)}</dd></div>
        ${row.poolRecommendation ? `<div><dt>Prévision semaine</dt><dd>${esc(row.poolRecommendation.reason)} · ${esc(row.poolRecommendation.category)}</dd></div>` : ''}
      </dl>
      <label class="plan-ai-override-label">Correction pour cette chambre et cette date
        <select id="plan-ai-room-override">
          <option value="auto"${overrideValue === 'auto' ? ' selected' : ''}>Automatique</option>
          <option value="0"${overrideValue === '0' ? ' selected' : ''}>Forcer fermé</option>
          <option value="1"${overrideValue === '1' ? ' selected' : ''}>Forcer 1 sofa</option>
          <option value="2"${overrideValue === '2' ? ' selected' : ''}>Forcer 2 sofas</option>
        </select>
      </label>`;
    byId('plan-ai-room-override')?.addEventListener('change', event => {
      const overrides = getOverrides();
      const key = `${model.openingDate}::${row.roomNumber}`;
      if (event.target.value === 'auto') delete overrides[key];
      else overrides[key] = { target:Number(event.target.value), updatedAt:new Date().toISOString() };
      saveJson(OVERRIDES_KEY, overrides);
      window.AAR?.scheduleSaveState?.('intelligent plan room override');
      render();
    });
  }
  function bindOnce(){
    if (bound) return;
    bound = true;
    byId('plan-open-opening')?.addEventListener('click', () => window.ORIS_NAVIGATE?.('opening'));
    byId('plan-ai-show-all')?.addEventListener('click', () => {
      actionFilter = 'all';
      localStorage.setItem(FILTER_KEY, actionFilter);
      visibleFloors = [];
      visibleFolsStatuses = allFolsStatuses.slice();
      actionView = false;
      poolView = false;
      localStorage.setItem(ACTION_VIEW_KEY, '0');
      localStorage.setItem(POOL_VIEW_KEY, '0');
      saveJson(FLOORS_KEY, visibleFloors);
      saveJson(FOLS_FILTER_KEY, visibleFolsStatuses);
      render();
    });
    document.querySelectorAll('[data-fols-filter]').forEach(button => button.addEventListener('click', () => {
      actionView = false;
      poolView = false;
      localStorage.setItem(ACTION_VIEW_KEY, '0');
      localStorage.setItem(POOL_VIEW_KEY, '0');
      const status = button.getAttribute('data-fols-filter') || '';
      if (visibleFolsStatuses.includes(status)) visibleFolsStatuses = visibleFolsStatuses.filter(value => value !== status);
      else visibleFolsStatuses.push(status);
      saveJson(FOLS_FILTER_KEY, visibleFolsStatuses);
      render();
    }));
    byId('plan-ai-action-view')?.addEventListener('click', () => {
      actionView = !actionView;
      if (actionView) poolView = false;
      localStorage.setItem(ACTION_VIEW_KEY, actionView ? '1' : '0');
      localStorage.setItem(POOL_VIEW_KEY, poolView ? '1' : '0');
      render();
    });
    byId('plan-ai-pool-view')?.addEventListener('click', () => {
      poolView = !poolView;
      if (poolView) actionView = false;
      localStorage.setItem(POOL_VIEW_KEY, poolView ? '1' : '0');
      localStorage.setItem(ACTION_VIEW_KEY, actionView ? '1' : '0');
      render();
    });
    byId('plan-room-dialog-close')?.addEventListener('click', () => byId('plan-room-dialog')?.close());
    document.addEventListener('pointerdown', event => {
      const dialog = byId('plan-room-dialog');
      if (!dialog?.open) return;
      if (dialog.contains(event.target)) return;
      if (event.target.closest?.('[data-plan-room],[data-plan-action-room]')) return;
      dialog.close();
    });
    const strip = byId('plan-roomstate-strip');
    const trigger = byId('plan-roomstate-drop');
    const input = byId('plan-roomstate-file');
    const openPicker = () => input?.click();
    const importFile = file => {
      if (!file || !window.PLAN_LEGACY?.importRoomStateFromText) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const matched = window.PLAN_LEGACY.importRoomStateFromText(String(reader.result || ''), file);
          if (!matched) window.AAR?.toast?.('Room State : aucune chambre reconnue.');
          render();
        } catch (error) {
          window.AAR?.toast?.(`Room State invalide${error?.message ? ` : ${error.message}` : ''}`);
        }
      };
      reader.readAsText(file, 'utf-8');
    };
    strip?.addEventListener('click', event => { if (!event.target.closest('#plan-roomstate-drop')) openPicker(); });
    strip?.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPicker(); } });
    trigger?.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openPicker(); });
    ['dragenter','dragover'].forEach(type => strip?.addEventListener(type, event => { event.preventDefault(); strip.classList.add('is-dragover'); }));
    ['dragleave','dragend'].forEach(type => strip?.addEventListener(type, () => strip.classList.remove('is-dragover')));
    strip?.addEventListener('drop', event => { event.preventDefault(); strip.classList.remove('is-dragover'); importFile(event.dataTransfer?.files?.[0]); });
    input?.addEventListener('change', () => { importFile(input.files?.[0]); input.value = ''; });
  }
  function render(){
    if (rendering) return;
    rendering = true;
    try {
      ensureShell();
      migrateLegacyOnce();
      bindOnce();
      const model = buildModel();
      renderSources(model);
      renderFloorFilters(model);
      document.querySelectorAll('[data-fols-filter]').forEach(button => {
        const active = !actionView && visibleFolsStatuses.includes(button.getAttribute('data-fols-filter') || '');
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      const actionViewButton = byId('plan-ai-action-view');
      actionViewButton?.classList.toggle('is-active', actionView);
      actionViewButton?.setAttribute('aria-pressed', String(actionView));
      const poolViewButton = byId('plan-ai-pool-view');
      poolViewButton?.classList.toggle('is-active', poolView);
      poolViewButton?.setAttribute('aria-pressed', String(poolView));
      renderSummary(model);
      renderSofaPool(model);
      renderMap(model);
      renderActions(model);
      renderInspector(model);
    } finally {
      rendering = false;
    }
  }
  function refresh(){
    if (document.getElementById('view-plan')?.style.display !== 'none') render();
  }

  window.PLAN = { render, refresh, refreshSofaRules:refresh, getModel:buildModel };
  window.addEventListener('oris:opening-changed', refresh);
  window.addEventListener('oris:sofa-rules-changed', refresh);
  window.addEventListener('storage', event => {
    if ([OVERRIDES_KEY, 'aar_reservation_control_v3', 'oris_assistant_baby_sofa_done_v1'].includes(event.key)) refresh();
  });
  document.addEventListener('DOMContentLoaded', render);
})();
