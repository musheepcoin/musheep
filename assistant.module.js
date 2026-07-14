(function(){
  const LS_IMPORT_DATE_INDIV = 'aar_import_date_indiv_v1';
  const RC_STORAGE_KEY = 'aar_reservation_control_v3';

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
    const boostRecords = window.RESERVATION_CONTROL?.buildBoostRecords?.() || [];
    const tomorrow = addDays(new Date(), 1);
    const tomorrowKey = isoLocal(tomorrow);
    const tomorrowItems = (rc.items || []).filter(item => String(item.arrivalDate || '') === tomorrowKey);
    const tomorrowAiItems = tomorrowItems.flatMap(item =>
      (Array.isArray(item.aiItems) ? item.aiItems : []).map(ai => ({ item, ai }))
    );
    return { runtime, rc, importDate, boostRecords, tomorrow, tomorrowKey, tomorrowItems, tomorrowAiItems };
  }
  function statusLine(data){
    if (!data.importDate) return 'Import FOLS requis avant toute action.';
    if (!data.rc?.count) return 'Import chargé, mais Contrôle résa pas encore préparé.';
    if (!data.tomorrowItems.length) return 'Aucune réservation chargée pour demain dans Contrôle résa.';
    if (!data.tomorrowAiItems.length) return 'BOOST à lancer avant la synthèse de demain.';
    return 'Mémoire BOOST prête pour le contrôle de demain.';
  }
  function priorityRank(value){
    const v = String(value || '').toLowerCase();
    if (v === 'high') return 0;
    if (v === 'medium') return 1;
    return 2;
  }
  function cleanAiResult(ai){
    return String(ai?.result || ai?.summary || ai?.recommendedAction || '').replace(/\s+/g, ' ').trim();
  }
  function cleanAiQuote(ai){
    return String(ai?.quote || ai?.sourceComment || ai?.evidence || '').replace(/\s+/g, ' ').trim();
  }
  function buildTomorrowControlRows(data){
    return data.tomorrowAiItems
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
  function render(container){
    const host = container || byId('assistant-output');
    if (!host) return;
    const data = getAssistantData();
    const importText = formatImport(data.importDate);
    const boostReady = !!data.boostRecords.length;
    const boostText = data.tomorrowAiItems.length
      ? 'Mémoire BOOST prête'
      : boostReady
        ? 'Lancer l’analyse intelligente'
        : data.importDate
          ? 'Aucun commentaire a envoyer'
          : 'Import FOLS requis';

    host.innerHTML = `
      <section class="assistant-shell">
        <div class="assistant-topbar">
          <button type="button" class="assistant-core-button" id="assistant-back-core" aria-label="Retour au site core">↩</button>
          <button type="button" class="assistant-date-pill">${esc(formatDateLong(new Date()))}</button>
        </div>

        <section class="assistant-main assistant-main-simple">
          <div class="assistant-left">
            <div class="assistant-hello">
              <p class="assistant-eyebrow">Mode assistant</p>
              <h1>Bonjour Vincent 👋</h1>
              <p>Je lis la mémoire Hotel IA. Ici, pas de chat libre : seulement des actions guidées et vérifiables.</p>
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
                <span>⚡</span>
                <strong>BOOST</strong>
                <small>${esc(boostText)}</small>
              </button>
            </div>

            <div class="assistant-section-title">Actions disponibles</div>
            <div class="assistant-action-grid">
              <article class="assistant-action-card is-ready">
                <span class="assistant-action-icon">☑</span>
                <div class="assistant-action-copy">
                  <strong>Contrôle des réservations de demain</strong>
                  <small>${esc(formatDateLong(data.tomorrow))} · ${data.tomorrowItems.length} réservation(s) chargée(s)</small>
                </div>
                <button type="button" class="assistant-action-launch" id="assistant-action-tomorrow">Lancer</button>
              </article>
            </div>

            <div class="assistant-section-title assistant-response-title">Réponse ORIS</div>
            <div class="assistant-response-box" id="assistant-response">
              <strong>En attente</strong>
              <span>Lance une action pour obtenir une réponse opérationnelle.</span>
            </div>

            <div class="assistant-footnote" id="assistant-status-line">✦ ${esc(statusLine(data))}</div>
          </div>

          <aside class="assistant-right">
            <div class="assistant-bot" aria-hidden="true">
              <div class="assistant-bot-antenna"></div>
              <div class="assistant-bot-head"><span></span><span></span></div>
              <div class="assistant-bot-body">N</div>
            </div>
            <h2>Réflexion ORIS</h2>
            <p>Ici tu vois ce qu’ORIS ferait : lecture Hotel IA, lecture mémoire BOOST, puis préparation d’une synthèse ciblée.</p>
            <div class="assistant-simulation-box" id="assistant-simulation">
              <div class="assistant-simulation-empty">
                <strong>En attente</strong>
                <span>Aucune réflexion lancée.</span>
              </div>
            </div>
          </aside>
        </section>
      </section>
    `;

    bind(host);
  }
  function renderTomorrowAction(host){
    const data = getAssistantData();
    const reflectionBox = host.querySelector('#assistant-simulation');
    const responseBox = host.querySelector('#assistant-response');
    const status = host.querySelector('#assistant-status-line');
    if (!reflectionBox || !responseBox) return;

    reflectionBox.innerHTML = `
      <div class="assistant-simulation-steps">
        <div>
          <b>1</b>
          <strong>Hotel IA</strong>
          <span>${esc(data.tomorrowItems.length)} réservation(s) de demain trouvée(s).</span>
        </div>
        <div>
          <b>2</b>
          <strong>Mémoire BOOST</strong>
          <span>${esc(data.tomorrowAiItems.length)} résultat(s) intelligent(s) déjà inscrit(s).</span>
        </div>
        <div>
          <b>3</b>
          <strong>Réponse ORIS</strong>
          <span>ORIS reprend la logique de contrôle testée sur le 20 mars : citation courte + résultat utile.</span>
        </div>
      </div>
    `;

    if (!data.tomorrowItems.length) {
      responseBox.innerHTML = `
        <strong>Aucune réservation trouvée pour demain.</strong>
        <span>ORIS ne peut pas produire de contrôle sans données dans la mémoire Hotel IA.</span>
      `;
      if (status) status.textContent = '✦ Action lancée : aucune réservation demain dans Contrôle résa.';
      return;
    }

    const rows = buildTomorrowControlRows(data);
    if (!rows.length) {
      responseBox.innerHTML = `
        <strong>BOOST requis avant la réponse ORIS.</strong>
        <span>${esc(data.tomorrowItems.length)} réservation(s) de demain sont chargée(s), mais aucun résultat intelligent utile n’est encore inscrit dans Hotel IA.</span>
        <small>Lance BOOST : la réponse utilisera ensuite les commentaires utiles prémâchés.</small>
      `;
      if (status) status.textContent = '✦ Action lancée : il manque la mémoire BOOST pour répondre proprement.';
      return;
    }

    const itemsHtml = rows.slice(0, 12).map(row => `
      <li>
        <div class="assistant-control-head">
          <strong>${esc(row.guestName)}</strong>
          ${row.room ? `<em>${esc(row.room)}</em>` : ''}
        </div>
        ${row.quote ? `<span>“${esc(row.quote)}”</span>` : ''}
        ${row.result ? `<small>${esc(row.result)}</small>` : ''}
      </li>
    `).join('');

    responseBox.innerHTML = `
      <strong>Contrôle des réservations de demain</strong>
      <span>${esc(rows.length)} dossier(s) utile(s) ressortent de la mémoire BOOST.</span>
      <ul class="assistant-control-list">${itemsHtml}</ul>
    `;
    if (status) status.textContent = `✦ Réponse ORIS générée : ${rows.length} dossier(s) utile(s) pour demain.`;
  }
  function bind(host){
    host.querySelector('#assistant-back-core')?.addEventListener('click', () => {
      document.body.classList.remove('assistant-mode');
      document.getElementById('tab-home')?.click();
    });
    host.querySelector('#assistant-boost')?.addEventListener('click', async () => {
      const status = host.querySelector('#assistant-status-line');
      if (window.RESERVATION_CONTROL?.isBoostInFlight?.()) return;
      if (!window.RESERVATION_CONTROL?.runBoost) {
        if (status) status.textContent = 'BOOST indisponible : moteur Reservation non charge.';
        return;
      }
      await window.RESERVATION_CONTROL.runBoost({ statusEl: status });
      render(host);
    });
    host.querySelector('#assistant-action-tomorrow')?.addEventListener('click', () => {
      renderTomorrowAction(host);
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
          <button type="button" class="is-active" data-oris-pet-scope="reservations_tomorrow">Résas demain</button>
          <button type="button" data-oris-pet-scope="groups_30">Groupes 30j</button>
          <button type="button" data-oris-pet-scope="boost_memory">Mémoire BOOST</button>
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
    if (scope === 'boost_memory') return 'Mémoire BOOST';
    return 'Réservations de demain';
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
      if (!data.tomorrowItems.length) return `Périmètre ${label} : aucune réservation de demain trouvée dans Hotel IA.`;
      if (!rows.length) return `Périmètre ${label} : ${data.tomorrowItems.length} réservation(s) chargée(s), mais aucun résultat BOOST utile. Lance BOOST avant la synthèse.`;
      return `Périmètre ${label} : ${rows.length} dossier(s) utile(s) sont prêts dans la mémoire BOOST. Ouvre l’action “Contrôle des réservations de demain” pour les afficher proprement.`;
    }
    if (scope === 'groups_30') {
      const groups = data.runtime?.entities?.groups || [];
      return `Périmètre ${label} : ${groups.length} groupe(s) connu(s) dans Hotel IA. Prochaine étape : créer le cluster 30 jours avant d’envoyer la question à l’IA.`;
    }
    return `Périmètre ${label} : ORIS utiliserait les résultats BOOST déjà inscrits dans Hotel IA, sans relire tout le CSV.`;
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
