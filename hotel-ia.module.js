(function(){
  function esc(s){
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function sourceLabel(src){
    return src?.present ? `${Number(src.rows || 0)} ligne(s)` : 'non chargé';
  }

  function statusClass(ok){ return ok ? 'is-ok' : 'is-empty'; }

  function miniStat(label, value, hint){
    return `
      <div class="hotel-ia-stat">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        ${hint ? `<small>${esc(hint)}</small>` : ''}
      </div>
    `;
  }

  function sourceRow(label, src, hint){
    const ok = !!src?.present;
    return `
      <li class="${statusClass(ok)}">
        <span>${esc(label)}</span>
        <strong>${esc(sourceLabel(src))}</strong>
        ${hint ? `<small>${esc(hint)}</small>` : ''}
      </li>
    `;
  }

  function signalRow(signal){
    return `
      <li>
        <span>${esc(signal.title || signal.kind || 'Signal')}</span>
        <small>${esc(signal.text || '')}</small>
      </li>
    `;
  }

  function render(container){
    if (!container) return;
    const runtime = window.HOTEL_RUNTIME?.buildRuntime ? window.HOTEL_RUNTIME.buildRuntime() : null;
    if (!runtime) {
      container.innerHTML = '<div class="muted">Hotel IA indisponible.</div>';
      return;
    }

    const state = runtime.state || {};
    const model = runtime.model || {};
    const sources = state.sources || {};
    const snapshot = state.snapshot || {};
    const reservationControl = state.dynamic?.reservationControl || {};
    const signals = Array.isArray(runtime.signals) ? runtime.signals : [];
    const roomTypes = Array.isArray(state.roomTypes) ? state.roomTypes : [];
    const readySources = Object.values(sources).filter(s => s?.present).length;
    const totalSources = Object.keys(sources).length || 1;

    container.innerHTML = `
      <section class="hotel-ia-hero card">
        <div>
          <p class="hotel-ia-kicker">Socle central ORIS</p>
          <h2>Hotel IA</h2>
          <p>
            Hotel IA est la mémoire structurée de l’hôtel : il connaît le bâtiment même sans import,
            reçoit les données FOLS quand tu les charges, puis fournit un contexte propre aux futures analyses IA.
          </p>
        </div>
        <div class="hotel-ia-readiness">
          <strong>${esc(snapshot.readinessScore || 0)}%</strong>
          <span>${readySources}/${totalSources} sources chargées</span>
        </div>
      </section>

      <section class="hotel-ia-flow">
        <article class="card hotel-ia-step">
          <span class="hotel-ia-step-number">1</span>
          <h3>Socle hôtel permanent</h3>
          <p>Disponible même sans fichier FOLS : chambres, étages, types, capacités, règles sofa et contraintes hôtel.</p>
          <div class="hotel-ia-stats">
            ${miniStat('Chambres', model.hotel?.roomsTotal || 0)}
            ${miniStat('Étages', Array.isArray(model.hotel?.floors) ? model.hotel.floors.length : 0)}
            ${miniStat('Types', roomTypes.length)}
          </div>
        </article>

        <article class="card hotel-ia-step">
          <span class="hotel-ia-step-number">2</span>
          <h3>Import FOLS / modules</h3>
          <p>Les imports ne remplacent pas le socle : ils ajoutent l’état du jour et les informations d’exploitation.</p>
          <ul class="hotel-ia-source-list">
            ${sourceRow('Portefeuille FOLS', sources.fols, 'réservations et arrivées')}
            ${sourceRow('Groupes', sources.groups, 'groupes détectés')}
            ${sourceRow('Contrôle résa', { present: !!reservationControl.count, rows: reservationControl.count }, 'commentaires prêts pour lecture IA')}
          </ul>
        </article>

        <article class="card hotel-ia-step">
          <span class="hotel-ia-step-number">3</span>
          <h3>Couche IA</h3>
          <p>L’IA ne lit pas le CSV brut complet : elle reçoit une sélection propre depuis Hotel IA pour éviter bruit, mémoire et coût inutile.</p>
          <div class="hotel-ia-stats">
            ${miniStat('Contrôle résa', reservationControl.count || 0, 'dossiers prêts')}
            ${miniStat('Résultats IA', snapshot.reservationControlAiResults || 0, 'dossiers utiles')}
            ${miniStat('Date système', runtime.meta?.today || '')}
          </div>
        </article>
      </section>

      <section class="hotel-ia-grid">
        <article class="card hotel-ia-panel">
          <h3>Ce que Hotel IA sait actuellement</h3>
          <div class="hotel-ia-stats is-wide">
            ${miniStat('Arrivées aujourd’hui', snapshot.arrivalsToday || 0)}
            ${miniStat('Départs aujourd’hui', snapshot.departuresToday || 0)}
            ${miniStat('In-house', snapshot.inHouse || 0)}
            ${miniStat('Chambres non attribuées', snapshot.unassignedCount || 0)}
          </div>
        </article>

        <article class="card hotel-ia-panel">
          <h3>Signaux disponibles</h3>
          ${
            signals.length
              ? `<ul class="hotel-ia-signal-list">${signals.slice(0, 8).map(signalRow).join('')}</ul>`
              : '<div class="hotel-ia-empty">Aucun signal opérationnel pour l’instant.</div>'
          }
        </article>
      </section>

      <section class="card hotel-ia-panel">
        <h3>Direction cible</h3>
        <div class="hotel-ia-roadmap">
          <div><strong>Dashboard</strong><span>lit les compteurs fiables depuis Hotel IA.</span></div>
          <div><strong>Réservation</strong><span>continue ses contrôles automatiques.</span></div>
          <div><strong>Contrôle résa IA</strong><span>compare les commentaires aux données déjà structurées.</span></div>
          <div><strong>Future API</strong><span>recevra seulement les extraits utiles, pas tout le fichier.</span></div>
        </div>
      </section>
    `;
  }

  window.HOTELIA = Object.assign(window.HOTELIA || {}, {
    render,
    buildRuntime: function(){ return window.HOTEL_RUNTIME?.buildRuntime?.(); },
    buildKnowledgeBase: function(){
      const runtime = window.HOTEL_RUNTIME?.buildRuntime?.();
      return window.HOTEL_RUNTIME?.buildHotelKnowledgeBase?.(runtime);
    }
  });
})();
