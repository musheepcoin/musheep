(function(){
  const LS_IMPORT_DATE_INDIV = 'aar_import_date_indiv_v1';
  const RC_STORAGE_KEY = 'aar_reservation_control_v3';
  const LS_RULES = 'aar_soiree_rules_v2';
  const LS_HOME_CHECK_DB = 'aar_home_check_db_v3';
  const LS_HOME_CHECK_CURRENT_DATE = 'aar_home_check_current_date_v1';
  let activeOpsTab = 'checklist';
  const OPS_TABS = new Set(['checklist', 'vcc', 'forecast', 'assignment']);

  function byId(id){ return document.getElementById(id); }
  function esc(value){
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  function safeJsonParse(raw, fallback){
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function isoLocal(date){
    return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
  }
  function dateFromKey(key){
    const m = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  function addDays(date, days){
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + Number(days || 0));
    return d;
  }
  function formatDateLong(date){
    const d = date instanceof Date && !isNaN(date) ? date : new Date();
    const label = d.toLocaleDateString('fr-FR', {
      weekday:'long',
      day:'numeric',
      month:'long',
      year:'numeric'
    });
    return label.charAt(0).toLocaleUpperCase('fr-FR') + label.slice(1);
  }
  function formatDateFromKey(key){
    return formatDateLong(dateFromKey(key) || new Date());
  }
  function formatImport(ts){
    if (!ts) return 'Aucun import chargé';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return 'Import chargé';
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return `${sameDay ? 'Aujourd’hui' : d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`;
  }
  function getReservationControlPayload(){
    if (window.__AAR_RESERVATION_CONTROL?.items) return window.__AAR_RESERVATION_CONTROL;
    return safeJsonParse(localStorage.getItem(RC_STORAGE_KEY) || 'null', { items: [], count: 0 });
  }
  function getAssistantData(){
    const runtime = window.HOTEL_RUNTIME?.buildRuntime?.() || null;
    const rc = getReservationControlPayload();
    const importDate = localStorage.getItem(LS_IMPORT_DATE_INDIV) || '';
    forceDailyPeriod();
    const boostRecords = window.RESERVATION_CONTROL?.buildBoostRecords?.() || [];
    const dayKey = String(window.__AAR_RESERVATION_CONTROL_BASE_DATE_KEY || rc.boostBaseDate || rc.commentWindowStart || rc.windowStart || (rc.items || [])[0]?.arrivalDate || isoLocal(new Date())).trim();
    const day = dateFromKey(dayKey) || new Date();
    const dayItems = (rc.items || []).filter(item => String(item.arrivalDate || '') === dayKey);
    const dayAiItems = dayItems.flatMap(item =>
      (Array.isArray(item.aiItems) ? item.aiItems : []).map(ai => ({ item, ai }))
    );
    return {
      runtime, rc, importDate, boostRecords, day, dayKey, dayItems, dayAiItems,
      // Compatibilité avec l'ancien assistant/pet : ces noms pointent maintenant vers la journée Daily.
      tomorrow: day,
      tomorrowKey: dayKey,
      tomorrowItems: dayItems,
      tomorrowAiItems: dayAiItems
    };
  }
  function statusLine(data){
    if (!data.importDate) return 'Import FOLS requis avant toute action.';
    if (!data.rc?.count) return 'Import chargé, mais la mémoire réservations n’est pas encore préparée.';
    if (!data.dayItems.length) return 'Aucune réservation chargée pour cette journée.';
    if (!data.dayAiItems.length) return 'Analyse Luna 1j à lancer pour lire les commentaires utiles.';
    return 'Analyse Luna prête pour cette journée.';
  }
  function priorityRank(value){
    const v = String(value || '').toLowerCase();
    if (v === 'high') return 0;
    if (v === 'medium') return 1;
    return 2;
  }
  function forceDailyPeriod(){
    document.querySelectorAll('[data-reservation-control-period]').forEach(btn => {
      const isDaily = btn.getAttribute('data-reservation-control-period') === 'daily';
      btn.classList.toggle('is-active', isDaily);
    });
    const badge = byId('reservation-control-active-period');
    if (badge) badge.textContent = 'Daily';
  }
  function cleanAiResult(ai){
    return String(ai?.result || ai?.summary || ai?.recommendedAction || '').replace(/\s+/g, ' ').trim();
  }
  function cleanAiQuote(ai){
    return String(ai?.quote || ai?.sourceComment || ai?.evidence || '').replace(/\s+/g, ' ').trim();
  }
  function isControlAudit(ai){
    const kind = String(ai?.kind || '').trim();
    const type = String(ai?.controlType || ai?.control || '').trim();
    return kind === 'control_audit' || type === 'baby_bed' || type === 'communicating_room';
  }
  function buildDayLunaRows(data){
    return data.dayAiItems
      .filter(({ ai }) => !isControlAudit(ai))
      .map(({ item, ai }) => ({
        guestName: item.guestName || 'Client',
        room: [item.roomType || '', item.roomNumber ? `Ch. ${item.roomNumber}` : ''].filter(Boolean).join(' · '),
        quote: cleanAiQuote(ai),
        result: cleanAiResult(ai),
        priority: ai.priority || 'medium'
      }))
      .filter(row => row.quote || row.result)
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.guestName.localeCompare(b.guestName, 'fr'));
  }
  function buildTomorrowControlRows(data){
    return buildDayLunaRows(data);
  }
  function summarizeDayControls(data){
    const summary = window.__AAR_INDIV_DAY_SUMMARY?.[data.dayKey];
    if (summary && Array.isArray(summary.lines)) return summary.lines;
    window.__AAR_REFRESH_INDIV_FUSED_VIEW?.();
    const refreshed = window.__AAR_INDIV_DAY_SUMMARY?.[data.dayKey];
    if (refreshed && Array.isArray(refreshed.lines)) return refreshed.lines;
    return [];
  }
  function cleanControlText(value){
    return String(value || '')
      .replace(/\s*\[\[LUNA_OK\]\]/g, ' ✓')
      .replace(/\s*\[\[LUNA_KO\]\]/g, ' ✕')
      .replace(/\s*\[\[LUNA_Q\]\]/g, ' ?');
  }
  function renderControlName(value){
    const cleaned = cleanControlText(value);
    return esc(cleaned)
      .replace(/✓/g, '<span class="assistant-luna-confirm is-ok">✓</span>')
      .replace(/✕/g, '<span class="assistant-luna-confirm is-ko">✕</span>');
  }
  function normalizeChecklistItems(list, prefix){
    return (Array.isArray(list) ? list : []).map((item, idx) => {
      if (typeof item === 'string') return { id: `${prefix}_${idx}`, text: item };
      return {
        id: String(item?.id || `${prefix}_${idx}`).trim(),
        text: String(item?.text || '').trim()
      };
    }).filter(x => x.text);
  }
  function loadOpsChecklistRules(){
    const parsed = safeJsonParse(localStorage.getItem(LS_RULES) || 'null', {});
    return {
      morning: normalizeChecklistItems(parsed?.checklists?.morning, 'm'),
      evening: normalizeChecklistItems(parsed?.checklists?.evening, 'e')
    };
  }
  function loadOpsChecklistDb(){
    const parsed = safeJsonParse(localStorage.getItem(LS_HOME_CHECK_DB) || 'null', null);
    return parsed && typeof parsed === 'object' && parsed.days ? parsed : { days: {} };
  }
  function saveOpsChecklistDb(db){
    localStorage.setItem(LS_HOME_CHECK_DB, JSON.stringify(db));
    window.AAR?.scheduleSaveState?.('assistant checklist update');
    window.TODO?.refreshHomeChecklist?.();
  }
  function updateOpsChecklistCounters(host){
    const root = host?.querySelector?.('.assistant-ops-check-grid');
    if (!root) return;
    root.querySelectorAll('.assistant-ops-check-column').forEach(column => {
      const total = column.querySelectorAll('[data-assistant-check-id]').length;
      const done = column.querySelectorAll('[data-assistant-check-id]:checked').length;
      const counter = column.querySelector('.assistant-ops-check-head span');
      if (counter) counter.textContent = `${done} / ${total}`;
    });
  }
  function ensureOpsChecklistDay(db, dateKey){
    if (!db.days || typeof db.days !== 'object') db.days = {};
    if (!db.days[dateKey]) {
      db.days[dateKey] = {
        morningFixedDone: {},
        eveningFixedDone: {},
        morningExtra: [],
        eveningExtra: []
      };
    }
    const day = db.days[dateKey];
    day.morningFixedDone = day.morningFixedDone && typeof day.morningFixedDone === 'object' ? day.morningFixedDone : {};
    day.eveningFixedDone = day.eveningFixedDone && typeof day.eveningFixedDone === 'object' ? day.eveningFixedDone : {};
    day.morningExtra = Array.isArray(day.morningExtra) ? day.morningExtra : [];
    day.eveningExtra = Array.isArray(day.eveningExtra) ? day.eveningExtra : [];
    return day;
  }
  function buildOpsChecklist(data){
    const official = window.TODO?.getHomeChecklistModel?.(data.dayKey);
    if (official && official.morning && official.evening && official.day && official.db) return official;
    const rules = loadOpsChecklistRules();
    const db = loadOpsChecklistDb();
    const dateKey = data.dayKey || localStorage.getItem(LS_HOME_CHECK_CURRENT_DATE) || isoLocal(new Date());
    const day = ensureOpsChecklistDay(db, dateKey);
    const buildSide = (side, title, items, doneMap, extras) => {
      const fixed = items.map(item => ({
        id: item.id,
        text: item.text,
        done: !!doneMap[item.id],
        fixed: true,
        side
      }));
      const extra = (extras || []).map((item, idx) => ({
        id: String(item?.id || `extra_${idx}`),
        text: String(item?.text || '').trim(),
        done: !!item?.done,
        fixed: false,
        side
      })).filter(x => x.text);
      const all = [...fixed, ...extra];
      return {
        side,
        title,
        items: all,
        done: all.filter(x => x.done).length,
        total: all.length
      };
    };
    return {
      dateKey,
      db,
      day,
      morning: buildSide('morning', 'Matin', rules.morning, day.morningFixedDone, day.morningExtra),
      evening: buildSide('evening', 'Soir', rules.evening, day.eveningFixedDone, day.eveningExtra)
    };
  }
  function renderOpsChecklist(data){
    const model = buildOpsChecklist(data);
    const renderSide = side => `
      <div class="assistant-ops-check-column">
        <div class="assistant-ops-check-head">
          <strong>${esc(side.title)}</strong>
          <span>${esc(side.done)} / ${esc(side.total)}</span>
        </div>
        <div class="assistant-ops-check-list">
          ${side.items.length ? side.items.map(item => `
            <label class="assistant-ops-check-item">
              <input type="checkbox"
                ${item.done ? 'checked' : ''}
                data-assistant-check-side="${esc(item.side)}"
                data-assistant-check-id="${esc(item.id)}"
                data-assistant-check-fixed="${item.fixed ? '1' : '0'}" />
              <span>${esc(item.text)}</span>
            </label>
          `).join('') : '<div class="assistant-empty-soft">Aucune tâche.</div>'}
        </div>
      </div>
    `;
    return `
      <div class="assistant-ops-check-grid">
        ${renderSide(model.morning)}
        ${renderSide(model.evening)}
      </div>
    `;
  }
  function renderOpsVcc(){
    const entries = typeof window.__AAR_GET_VCC_MISSING_ENTRIES === 'function'
      ? window.__AAR_GET_VCC_MISSING_ENTRIES()
      : [];
    if (!entries.length) {
      return '<div class="assistant-empty-soft">Aucune VCC à signaler.</div>';
    }
    return `
      <div class="assistant-ops-vcc-list">
        ${entries.slice(0, 12).map(item => `
          <div class="assistant-ops-vcc-item">
            <span>${esc(item.date || '—')}</span>
            <strong>${esc(item.name || 'Client')}</strong>
          </div>
        `).join('')}
        ${entries.length > 12 ? `<div class="assistant-ops-more">+ ${esc(entries.length - 12)} autre(s) client(s)</div>` : ''}
      </div>
    `;
  }
  function renderOpsForecast(){
    const days = typeof window.__AAR_GET_OCCUPANCY_FORECAST === 'function'
      ? window.__AAR_GET_OCCUPANCY_FORECAST()
      : [];
    if (!days.length) {
      return '<div class="assistant-empty-soft">Aucun prévisionnel disponible.</div>';
    }
    return `
      <div class="assistant-ops-forecast-list">
        <div class="assistant-ops-forecast-head">
          <span>Date</span>
          <span>Dép.</span>
          <span>Arr.</span>
          <span>Grp.</span>
          <span>Total</span>
          <span>Sofa</span>
        </div>
        ${days.slice(0, 10).map(day => `
          <div class="assistant-ops-forecast-item">
            <strong>${esc(day.label || day.key || 'Date')}</strong>
            <button type="button" class="assistant-ops-pill is-departures" data-forecast-detail="departures" data-forecast-date="${esc(day.key)}">${esc(day.departures || 0)}</button>
            <button type="button" class="assistant-ops-pill" data-forecast-detail="arrivals" data-forecast-date="${esc(day.key)}">${esc(day.indivArrivals || 0)}</button>
            <button type="button" class="assistant-ops-pill is-groups" data-forecast-detail="groups" data-forecast-date="${esc(day.key)}">${esc(day.groupCount || 0)}${Number(day.groupRooms || 0) ? ` <small>(${esc(day.groupRooms)})</small>` : ''}</button>
            <button type="button" class="assistant-ops-pill is-total" data-forecast-detail="total" data-forecast-date="${esc(day.key)}">${esc(day.totalRooms || 0)}</button>
            <button type="button" class="assistant-ops-pill is-sofa" data-forecast-detail="sofas" data-forecast-date="${esc(day.key)}">${esc(day.sofaCount || 0)}</button>
          </div>
        `).join('')}
      </div>
    `;
  }
  function renderOpsAssignment(){
    const alerts = typeof window.__AAR_GET_ASSIGNMENT_WATCH_ALERTS === 'function'
      ? window.__AAR_GET_ASSIGNMENT_WATCH_ALERTS()
      : [];
    if (!alerts.length) {
      return '<div class="assistant-empty-soft">Aucune attribution à vérifier.</div>';
    }
    return `
      <div class="assistant-ops-assignment-list">
        ${alerts.slice(0, 10).map(alert => {
          const meta = alert?.meta || {};
          const details = Array.isArray(meta.details) ? meta.details : [];
          return `
            <div class="assistant-ops-assignment-item">
              <div>
                <strong>${esc(meta.name || alert?.text || 'Attribution')}</strong>
                ${meta.expected ? `<span>Attendu : ${esc(meta.expected)}</span>` : ''}
              </div>
              ${details.length ? `
                <ul>
                  ${details.slice(0, 4).map(d => `<li>${esc(d.date || 'Date ?')} · détecté : ${esc(d.detected || 'N/A')}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        }).join('')}
        ${alerts.length > 10 ? `<div class="assistant-ops-more">+ ${esc(alerts.length - 10)} autre(s) attribution(s)</div>` : ''}
      </div>
    `;
  }
  function renderOpsBody(tab, data){
    if (tab === 'vcc') return renderOpsVcc(data);
    if (tab === 'forecast') return renderOpsForecast(data);
    if (tab === 'assignment') return renderOpsAssignment(data);
    return renderOpsChecklist(data);
  }
  function renderOpsPanel(data){
    const tab = OPS_TABS.has(activeOpsTab) ? activeOpsTab : 'checklist';
    return `
      <section class="assistant-ops-card">
        <div class="assistant-ops-tabs" role="tablist" aria-label="Exploitation">
          <button type="button" class="${tab === 'checklist' ? 'is-active' : ''}" data-assistant-ops-tab="checklist">Checklist</button>
          <button type="button" class="${tab === 'vcc' ? 'is-active' : ''}" data-assistant-ops-tab="vcc">VCC</button>
          <button type="button" class="${tab === 'forecast' ? 'is-active' : ''}" data-assistant-ops-tab="forecast">Prévisionnel</button>
          <button type="button" class="${tab === 'assignment' ? 'is-active' : ''}" data-assistant-ops-tab="assignment">Attribution</button>
        </div>
        <div class="assistant-ops-body">
          ${renderOpsBody(tab, data)}
        </div>
      </section>
    `;
  }
  function render(container){
    const host = container || byId('assistant-output');
    if (!host) return;
    const data = getAssistantData();
    const importText = formatImport(data.importDate);
    const boostReady = !!data.boostRecords.length;
    const boostText = data.dayAiItems.length
      ? 'Analyse déjà prête'
      : boostReady
        ? 'Lire les commentaires utiles'
        : data.importDate
          ? 'Aucun commentaire a envoyer'
          : 'Import FOLS requis';
    const lunaRows = buildDayLunaRows(data);
    const controlLines = summarizeDayControls(data);
    const controlHtml = controlLines.length
      ? controlLines.map(line => `
        <div class="assistant-daily-line">
          <strong>${esc(line.label)}</strong>
          <span>${line.names.map(renderControlName).join(', ')}</span>
        </div>
      `).join('')
      : '<div class="assistant-empty-soft">Aucun contrôle automatique particulier.</div>';
    const lunaHtml = lunaRows.length
      ? lunaRows.slice(0, 10).map(row => `
        <article class="assistant-luna-card">
          <div class="assistant-luna-head">
            <strong>${esc(row.guestName)}</strong>
            ${row.room ? `<span>${esc(row.room)}</span>` : ''}
          </div>
          ${row.quote ? `<p>“${esc(row.quote)}”</p>` : ''}
          ${row.result ? `<small>${esc(row.result)}</small>` : ''}
        </article>
      `).join('')
      : '<div class="assistant-empty-soft">Aucune information utile inscrite pour cette journée.</div>';

    host.innerHTML = `
      <section class="assistant-shell">
        <div class="assistant-topbar">
          <button type="button" class="assistant-core-button" id="assistant-back-core" aria-label="Retour au site core">↩</button>
          <button type="button" class="assistant-date-pill">${esc(formatDateFromKey(data.dayKey))}</button>
        </div>

        <section class="assistant-main assistant-main-daily">
          <div class="assistant-left">
            <div class="assistant-hello">
              <p class="assistant-eyebrow">Mode assistant</p>
              <h1>Bonjour Vincent 👋</h1>
              <p>Vue claire de la journée : contrôles automatiques à gauche, lecture Luna des commentaires utiles à droite.</p>
            </div>

            <div class="assistant-boost-card">
              <div class="assistant-import-state">
                <span class="assistant-db-icon">◎</span>
                <div>
                  <strong>Import FOLS</strong>
                  <small class="${data.importDate ? 'is-green' : 'is-warn'}">${esc(importText)}</small>
                </div>
              </div>
              <div class="assistant-boost-separator"></div>
              <button type="button" class="assistant-boost-button" id="assistant-boost" ${boostReady ? '' : 'disabled'}>
                <span>☾</span>
                <strong>Analyse Luna</strong>
                <small>${esc(boostText)}</small>
              </button>
            </div>

            ${renderOpsPanel(data)}

            <div class="assistant-footnote" id="assistant-status-line">✦ ${esc(statusLine(data))}</div>
          </div>

          <div class="assistant-day-board">
            <section class="assistant-daily-panel">
              <div class="assistant-daily-title">
                <span>Contrôles automatiques</span>
                <em>${esc(data.dayItems.length)} arrivée(s)</em>
              </div>
              ${controlHtml}
            </section>

            <section class="assistant-daily-panel assistant-daily-panel-luna">
              <div class="assistant-daily-title">
                <span>Commentaires utiles Luna</span>
                <em>${esc(lunaRows.length)} info(s)</em>
              </div>
              ${lunaHtml}
            </section>
          </div>

          <aside class="assistant-right assistant-right-compact">
            <div class="assistant-bot assistant-bot-small" aria-hidden="true">
              <div class="assistant-bot-antenna"></div>
              <div class="assistant-bot-head"><span></span><span></span></div>
              <div class="assistant-bot-body">N</div>
            </div>
            <h2>1 jour seulement</h2>
            <p>Pour garder une lecture précise, l’assistant lance uniquement l’analyse de la journée affichée.</p>
            <div class="assistant-simulation-box assistant-simulation-box-small" id="assistant-simulation">
              <div class="assistant-simulation-empty">
                <strong>${esc(lunaRows.length ? 'Prêt' : 'À analyser')}</strong>
                <span>${esc(lunaRows.length ? 'Les commentaires utiles sont affichés.' : 'Clique sur Analyse Luna pour lire cette journée.')}</span>
              </div>
            </div>
          </aside>
        </section>
      </section>
    `;

    bind(host);
  }
  function bind(host){
    host.querySelector('#assistant-back-core')?.addEventListener('click', () => {
      document.body.classList.remove('assistant-mode');
      document.getElementById('tab-home')?.click();
    });
    host.querySelectorAll('[data-assistant-ops-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-assistant-ops-tab');
        activeOpsTab = OPS_TABS.has(next) ? next : 'checklist';
        render(host);
      });
    });
    host.querySelectorAll('[data-forecast-detail]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-forecast-detail') || '';
        const dateKey = btn.getAttribute('data-forecast-date') || '';
        if (typeof window.__AAR_OPEN_HOME_KPI_DETAIL === 'function') {
          window.__AAR_OPEN_HOME_KPI_DETAIL(type, dateKey, btn);
        }
      });
    });
    host.querySelectorAll('[data-assistant-check-id]').forEach(cb => {
      cb.addEventListener('change', () => {
        const data = getAssistantData();
        const model = buildOpsChecklist(data);
        const side = cb.getAttribute('data-assistant-check-side') === 'evening' ? 'evening' : 'morning';
        const id = String(cb.getAttribute('data-assistant-check-id') || '');
        const isFixed = cb.getAttribute('data-assistant-check-fixed') === '1';
        const day = model.day;
        if (isFixed) {
          const target = side === 'evening' ? day.eveningFixedDone : day.morningFixedDone;
          target[id] = cb.checked;
        } else {
          const arr = side === 'evening' ? day.eveningExtra : day.morningExtra;
          const item = arr.find(x => String(x?.id || '') === id);
          if (item) item.done = cb.checked;
        }
        saveOpsChecklistDb(model.db);
        updateOpsChecklistCounters(host);
      });
    });
    host.querySelector('#assistant-boost')?.addEventListener('click', async () => {
      const status = host.querySelector('#assistant-status-line');
      if (window.RESERVATION_CONTROL?.isBoostInFlight?.()) return;
      if (!window.RESERVATION_CONTROL?.runBoost) {
        if (status) status.textContent = 'Analyse Luna indisponible : moteur Réservation non chargé.';
        return;
      }
      forceDailyPeriod();
      await window.RESERVATION_CONTROL.runBoost({ statusEl: status });
      render(host);
    });
  }

  function initFloatingPet(){
    if (document.getElementById('oris-pet-widget')) return;
    const pet = document.createElement('div');
    pet.id = 'oris-pet-widget';
    pet.className = 'oris-pet-widget';
    pet.innerHTML = `
      <div class="oris-pet-panel" id="oris-pet-panel" aria-live="polite">
        <div class="oris-pet-panel-head">
          <div>
            <strong>ORIS Assistant</strong>
            <span>Dialogue guidé par cluster</span>
          </div>
          <button type="button" id="oris-pet-close" aria-label="Réduire ORIS">×</button>
        </div>
        <div class="oris-pet-scope">
          <button type="button" class="is-active" data-oris-pet-scope="reservations_tomorrow">Journée</button>
          <button type="button" data-oris-pet-scope="groups_30">Groupes 30j</button>
          <button type="button" data-oris-pet-scope="boost_memory">Analyse Luna</button>
        </div>
        <div class="oris-pet-messages" id="oris-pet-messages">
          <div class="oris-pet-message is-oris">
            Choisis un périmètre, puis pose une question. Pour l’instant je simule la logique : aucun appel IA réel.
          </div>
        </div>
        <div class="oris-pet-input-row">
          <input id="oris-pet-input" type="text" placeholder="Question sur le périmètre choisi..." />
          <button type="button" id="oris-pet-send" aria-label="Envoyer">↑</button>
        </div>
      </div>

      <div class="oris-pet-toast-stack" id="oris-pet-toast-stack" aria-live="polite"></div>

      <div class="oris-pet-avatar" aria-hidden="true">
        <div class="oris-pet-head"><span></span><span></span></div>
        <div class="oris-pet-body">›</div>
      </div>
      <button type="button" class="oris-pet-toggle" id="oris-pet-toggle" aria-label="Ouvrir ORIS Assistant">⌃</button>
    `;
    document.body.appendChild(pet);
    bindFloatingPet(pet);
  }

  function activePetScope(root){
    return root.querySelector('[data-oris-pet-scope].is-active')?.dataset?.orisPetScope || 'reservations_tomorrow';
  }

  function scopeLabel(scope){
    if (scope === 'groups_30') return 'Groupes 30 jours';
    if (scope === 'boost_memory') return 'Analyse Luna';
    return 'Journée affichée';
  }

  function appendPetMessage(root, kind, text){
    const host = root.querySelector('#oris-pet-messages');
    if (!host) return;
    const msg = document.createElement('div');
    msg.className = `oris-pet-message is-${kind}`;
    msg.textContent = text;
    host.appendChild(msg);
    host.scrollTop = host.scrollHeight;
  }

  function notify(text, options = {}){
    const root = document.getElementById('oris-pet-widget');
    if (!root) return false;
    const message = String(text || '').trim();
    if (!message) return true;
    appendPetMessage(root, 'oris', message);
    pushPetToast(root, message);
    if (options.open) root.classList.add('is-open');
    pulsePet(root);
    return true;
  }

  function notifyPersistent(key, text, options = {}){
    const root = document.getElementById('oris-pet-widget');
    if (!root) return false;
    const message = String(text || '').trim();
    const toastKey = String(key || '').trim();
    if (!message || !toastKey) return true;
    appendPetMessage(root, 'oris', message);
    upsertPetToast(root, toastKey, message, { persistent: true });
    if (options.open) root.classList.add('is-open');
    pulsePet(root);
    return true;
  }

  function resolveNotification(key, text, options = {}){
    const root = document.getElementById('oris-pet-widget');
    if (!root) return false;
    const message = String(text || '').trim();
    const toastKey = String(key || '').trim();
    if (!message || !toastKey) return true;
    appendPetMessage(root, 'oris', message);
    upsertPetToast(root, toastKey, message, { persistent: false, resolve: true });
    if (options.open) root.classList.add('is-open');
    pulsePet(root);
    return true;
  }

  function pulsePet(root){
    root.classList.add('has-notification');
    clearTimeout(root.__orisPetNotifyTimer);
    root.__orisPetNotifyTimer = setTimeout(() => {
      root.classList.remove('has-notification');
    }, 6400);
  }

  function ensurePetToastMap(root){
    if (!root.__orisPetToasts) root.__orisPetToasts = new Map();
    return root.__orisPetToasts;
  }

  function trimPetToastStack(stack){
    while (stack.children.length > 3) {
      const children = Array.from(stack.children);
      const removable = children.reverse().find(node => !node.classList.contains('is-persistent')) || stack.lastElementChild;
      removable?.remove();
    }
  }

  function schedulePetToastRemoval(root, toast, delay = 10400){
    clearTimeout(toast.__orisPetLeaveTimer);
    clearTimeout(toast.__orisPetRemoveTimer);
    toast.__orisPetLeaveTimer = setTimeout(() => toast.classList.add('is-leaving'), delay);
    toast.__orisPetRemoveTimer = setTimeout(() => {
      const map = ensurePetToastMap(root);
      const key = toast.dataset.orisPetToastKey;
      if (key && map.get(key) === toast) map.delete(key);
      toast.remove();
    }, delay + 700);
  }

  function upsertPetToast(root, key, text, options = {}){
    const stack = root.querySelector('#oris-pet-toast-stack');
    if (!stack) return null;
    const map = ensurePetToastMap(root);
    let toast = map.get(key);
    if (!toast || !toast.isConnected) {
      toast = document.createElement('div');
      toast.className = 'oris-pet-toast';
      toast.dataset.orisPetToastKey = key;
      stack.prepend(toast);
      map.set(key, toast);
    } else if (toast.parentElement === stack) {
      stack.prepend(toast);
    }
    toast.textContent = text;
    toast.classList.remove('is-leaving');
    toast.classList.toggle('is-persistent', !!options.persistent);
    toast.classList.toggle('is-resolved', !!options.resolve);
    clearTimeout(toast.__orisPetLeaveTimer);
    clearTimeout(toast.__orisPetRemoveTimer);
    if (!options.persistent) {
      schedulePetToastRemoval(root, toast, options.resolve ? 8400 : 10400);
    }
    trimPetToastStack(stack);
    return toast;
  }

  function pushPetToast(root, text){
    const stack = root.querySelector('#oris-pet-toast-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'oris-pet-toast';
    toast.textContent = text;
    stack.prepend(toast);
    trimPetToastStack(stack);
    schedulePetToastRemoval(root, toast);
  }

  function simulatePetAnswer(scope, question){
    const data = getAssistantData();
    const label = scopeLabel(scope);
    if (!question.trim()) return `Je suis sur le périmètre ${label}. Pose une question courte.`;
    if (!data.importDate) return 'Je ne peux pas répondre : aucun import FOLS n’est chargé dans Hotel IA.';
    if (scope === 'reservations_tomorrow') {
      const rows = buildTomorrowControlRows(data);
      if (!data.tomorrowItems.length) return `Périmètre ${label} : aucune réservation trouvée dans Hotel IA.`;
      if (!rows.length) return `Périmètre ${label} : ${data.tomorrowItems.length} réservation(s) chargée(s), mais aucune information Luna utile. Lance Analyse Luna avant la synthèse.`;
      return `Périmètre ${label} : ${rows.length} dossier(s) utile(s) sont prêts dans Analyse Luna.`;
    }
    if (scope === 'groups_30') {
      const groups = data.runtime?.entities?.groups || [];
      return `Périmètre ${label} : ${groups.length} groupe(s) connu(s) dans Hotel IA. Prochaine étape : créer le cluster 30 jours avant d’envoyer la question à l’IA.`;
    }
    return `Périmètre ${label} : ORIS utiliserait les résultats Analyse Luna déjà inscrits dans Hotel IA, sans relire tout le CSV.`;
  }

  function bindFloatingPet(root){
    const toggle = root.querySelector('#oris-pet-toggle');
    const close = root.querySelector('#oris-pet-close');
    const input = root.querySelector('#oris-pet-input');
    const send = root.querySelector('#oris-pet-send');
    const setOpen = (open) => {
      root.classList.toggle('is-open', !!open);
      if (open) setTimeout(() => input?.focus(), 0);
    };
    toggle?.addEventListener('click', () => setOpen(!root.classList.contains('is-open')));
    close?.addEventListener('click', () => setOpen(false));
    root.querySelectorAll('[data-oris-pet-scope]').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('[data-oris-pet-scope]').forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        appendPetMessage(root, 'oris', `Périmètre sélectionné : ${scopeLabel(activePetScope(root))}.`);
      });
    });
    const submit = () => {
      const question = String(input?.value || '').trim();
      if (!question) return;
      appendPetMessage(root, 'user', question);
      input.value = '';
      appendPetMessage(root, 'oris', simulatePetAnswer(activePetScope(root), question));
    };
    send?.addEventListener('click', submit);
    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') submit();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingPet);
  } else {
    initFloatingPet();
  }

  window.ORIS_ASSISTANT = { render, initFloatingPet, notify, notifyPersistent, resolveNotification };
})();
