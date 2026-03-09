(function(){
  function esc(s){
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
  function pretty(obj){ return esc(JSON.stringify(obj, null, 2)); }
  function badge(ok, label){
    return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;background:${ok ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)'};color:${ok ? '#10b981' : '#ef4444'};font-size:12px;font-weight:700">${ok ? '●' : '●'} ${esc(label)}</span>`;
  }
  function renderCards(runtime){
    const sources = Object.entries(runtime?.state?.sources || {});
    const signals = runtime?.signals || [];
    const snapshot = runtime?.state?.snapshot || {};
    const reservations = runtime?.entities?.reservations || [];
    const groups = runtime?.entities?.groups || [];
    const prefs = runtime?.entities?.preferences || [];

    return `
      <div class="hotel-ia-layout" style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px">
        <section class="hotel-ia-card" style="grid-column:span 12;background:#121212;border:1px solid #2a2a2a;border-radius:16px;padding:16px;color:#e2e8f0">
          <h3 style="margin:0 0 10px;color:#7dd3fc">Hotel IA Runtime</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            ${badge(runtime?.meta?.visibleImports?.folsLoaded, 'FOLS')}
            ${badge(runtime?.meta?.visibleImports?.groupsLoaded, 'GROUPS')}
            ${badge(runtime?.meta?.visibleImports?.homeLoaded, 'HOME SOURCE')}
            ${badge(runtime?.meta?.visibleImports?.ddLoaded, 'DD')}
          </div>
          <div style="color:#cbd5e1">Le noyau IA lit le site actuel, reconstruit un état hôtel unifié, puis expose des entités et signaux descriptifs.</div>
        </section>

        <section class="hotel-ia-card" style="grid-column:span 4;background:#121212;border:1px solid #2a2a2a;border-radius:16px;padding:16px;color:#e2e8f0">
          <h3 style="margin:0 0 10px;color:#7dd3fc">Snapshot</h3>
          <pre style="white-space:pre-wrap;color:#f8fafc;background:#020617;border:1px solid #1e293b;border-radius:10px;padding:14px">${pretty(snapshot)}</pre>
        </section>

        <section class="hotel-ia-card" style="grid-column:span 4;background:#121212;border:1px solid #2a2a2a;border-radius:16px;padding:16px;color:#e2e8f0">
          <h3 style="margin:0 0 10px;color:#7dd3fc">Sources absorbées</h3>
          <pre style="white-space:pre-wrap;color:#f8fafc;background:#020617;border:1px solid #1e293b;border-radius:10px;padding:14px">${pretty(Object.fromEntries(sources))}</pre>
        </section>

        <section class="hotel-ia-card" style="grid-column:span 4;background:#121212;border:1px solid #2a2a2a;border-radius:16px;padding:16px;color:#e2e8f0">
          <h3 style="margin:0 0 10px;color:#7dd3fc">Signaux descriptifs</h3>
          <pre style="white-space:pre-wrap;color:#f8fafc;background:#020617;border:1px solid #1e293b;border-radius:10px;padding:14px">${pretty(signals)}</pre>
        </section>

        <section class="hotel-ia-card" style="grid-column:span 6;background:#121212;border:1px solid #2a2a2a;border-radius:16px;padding:16px;color:#e2e8f0">
          <h3 style="margin:0 0 10px;color:#7dd3fc">Réservations reconstruites</h3>
          <div style="margin-bottom:8px;color:#cbd5e1">${reservations.length} réservation(s)</div>
          <pre style="white-space:pre-wrap;max-height:340px;overflow:auto;color:#f8fafc;background:#020617;border:1px solid #1e293b;border-radius:10px;padding:14px">${pretty(reservations.slice(0, 20))}</pre>
        </section>

        <section class="hotel-ia-card" style="grid-column:span 6;background:#121212;border:1px solid #2a2a2a;border-radius:16px;padding:16px;color:#e2e8f0">
          <h3 style="margin:0 0 10px;color:#7dd3fc">Groupes + préférences</h3>
          <div style="margin-bottom:8px;color:#cbd5e1">${groups.length} groupe(s) • ${prefs.length} préférence(s)</div>
          <pre style="white-space:pre-wrap;max-height:340px;overflow:auto;color:#f8fafc;background:#020617;border:1px solid #1e293b;border-radius:10px;padding:14px">${pretty({ groups: groups.slice(0,12), preferences: prefs.slice(0,12) })}</pre>
        </section>

        <section class="hotel-ia-card" style="grid-column:span 12;background:#121212;border:1px solid #2a2a2a;border-radius:16px;padding:16px;color:#e2e8f0">
          <h3 style="margin:0 0 10px;color:#7dd3fc">Model + module slices</h3>
          <pre style="white-space:pre-wrap;max-height:380px;overflow:auto;color:#f8fafc;background:#020617;border:1px solid #1e293b;border-radius:10px;padding:14px">${pretty({ model: runtime.model, modules: runtime.modules, meta: runtime.meta })}</pre>
        </section>
      </div>
    `;
  }

  function render(container){
    if (!container) return;
    const runtime = window.HOTEL_RUNTIME?.buildRuntime ? window.HOTEL_RUNTIME.buildRuntime() : null;
    if (!runtime) {
      container.innerHTML = '<div class="muted">HOTEL_RUNTIME indisponible.</div>';
      return;
    }
    container.innerHTML = renderCards(runtime);
  }

  window.HOTELIA = Object.assign(window.HOTELIA || {}, {
    render,
    buildRuntime: function(){ return window.HOTEL_RUNTIME?.buildRuntime?.(); }
  });
})();
