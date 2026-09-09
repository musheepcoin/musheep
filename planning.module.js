(function(){
  let selectedWeekStart = '';

  const byId = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function dateFromKey(key){
    const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateKey(date){
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  }

  function addDays(key, days){
    const date = dateFromKey(key);
    if (!date) return '';
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return dateKey(date);
  }

  function mondayKey(key){
    const date = dateFromKey(key);
    if (!date) return '';
    date.setUTCDate(date.getUTCDate() + (date.getUTCDay() === 0 ? -6 : 1 - date.getUTCDay()));
    return dateKey(date);
  }

  function longDate(key){
    const date = dateFromKey(key);
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
  }

  function dayHeading(key){
    const date = dateFromKey(key);
    if (!date) return { name: 'Date', day: '—' };
    const name = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long' }).format(date);
    return {
      name: name.charAt(0).toLocaleUpperCase('fr-FR') + name.slice(1),
      day: String(date.getUTCDate()).padStart(2, '0')
    };
  }

  function number(value){
    return Number(value || 0).toLocaleString('fr-FR');
  }

  function getWeek(){
    if (typeof window.__AAR_GET_PLANNING_WEEK !== 'function') return null;
    const model = window.__AAR_GET_PLANNING_WEEK(selectedWeekStart || undefined);
    if (!selectedWeekStart && model?.weekStart) selectedWeekStart = model.weekStart;
    return model;
  }

  function coveredValue(day, value){
    return day?.covered ? number(value) : '—';
  }

  function orderedSofaTypes(roomTypes){
    const preferred = ['TRI', 'STDM', 'PRIVM', 'PRIVS', 'EXEC', 'SGE'];
    const available = new Set((Array.isArray(roomTypes) ? roomTypes : []).map(type => String(type || '').trim()).filter(Boolean));
    const known = preferred.filter(type => available.has(type));
    const others = Array.from(available)
      .filter(type => !preferred.includes(type))
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
    return [...known, ...others];
  }

  function sofaComposition(day, roomTypes){
    if (!day?.covered) return '';
    const types = orderedSofaTypes(roomTypes);
    if (!types.length) return '';
    return `<div class="planning-sofa-types">${types.map(type => {
      const count = Number(day.sofaTypeCounts?.[type] || 0);
      return `<span class="planning-sofa-type${count ? '' : ' is-zero'}"><em>${esc(type)}</em><span>${esc(number(count))}</span></span>`;
    }).join('')}</div>`;
  }

  function groupComposition(day){
    if (!day?.covered || !Array.isArray(day.groups) || !day.groups.length) return '';
    return day.groups.map(group => {
      const rooms = Object.entries(group.composition || {})
        .filter(([, count]) => Number(count) > 0)
        .sort(([a], [b]) => String(a).localeCompare(String(b), 'fr', { numeric: true }))
        .map(([type, count]) => `${number(count)} ${type}`)
        .join(' · ');
      return `${group.name} : ${rooms || `${number(group.rooms)} ch.`}`;
    }).join(' / ');
  }

  function simpleRow(label, days, field, tone){
    return `
      <div class="planning-sheet-row is-${esc(tone)}">
        <div class="planning-sheet-label">${esc(label)}</div>
        ${days.map(day => `<div class="planning-sheet-cell${day.covered ? '' : ' is-uncovered'}"><strong>${esc(coveredValue(day, day[field]))}</strong></div>`).join('')}
      </div>`;
  }

  function detailedRow(label, days, field, detailBuilder, tone, options = {}){
    const className = String(options.className || '').trim();
    return `
      <div class="planning-sheet-row planning-sheet-detail-row is-${esc(tone)}${className ? ` ${esc(className)}` : ''}">
        <div class="planning-sheet-label">${esc(label)}</div>
        ${days.map(day => {
          const detail = detailBuilder(day);
          const detailMarkup = detail ? (options.detailHtml ? detail : `<small>${esc(detail)}</small>`) : '';
          return `<div class="planning-sheet-cell${day.covered ? '' : ' is-uncovered'}"><strong>${esc(coveredValue(day, day[field]))}</strong>${detailMarkup}</div>`;
        }).join('')}
      </div>`;
  }

  function render(host){
    const target = host || byId('planning-output');
    if (!target) return;
    const model = getWeek();
    if (!model) {
      target.innerHTML = '<div class="planning-empty">Le prévisionnel est indisponible.</div>';
      return;
    }
    const days = Array.isArray(model.days) ? model.days : [];
    const importDate = String(model.importedAt || '').trim();
    const parsedImportDate = importDate ? new Date(importDate) : null;
    const uncovered = days.filter(day => !day.covered).length;
    const importStatus = model.sourceCount
      ? `Chargé${parsedImportDate && !Number.isNaN(parsedImportDate.getTime()) ? ` le ${new Intl.DateTimeFormat('fr-FR', { dateStyle:'short', timeStyle:'short' }).format(parsedImportDate)}` : ''}`
      : 'Aucun portefeuille chargé';
    const coverage = !model.sourceCount
      ? 'Glisser le portefeuille ici'
      : uncovered
        ? `${uncovered} jour${uncovered > 1 ? 's' : ''} non couvert${uncovered > 1 ? 's' : ''}`
        : `Semaine couverte · ${number(model.sourceCount)} lignes`;

    target.innerHTML = `
      <section class="planning-shell">
        <div class="assistant-topbar planning-topbar no-print">
          <button type="button" class="assistant-dashboard-button" id="planning-back">Dashboard</button>
          <button type="button" class="planning-print-button" id="planning-print">Imprimer le planning</button>
        </div>

        <div class="planning-workspace">
          <aside class="planning-controls">
            <div class="planning-report-title">
              <p class="assistant-eyebrow">Housekeeping</p>
              <h1>Planning</h1>
              <p>Du ${esc(longDate(model.weekStart))}<br>au ${esc(longDate(model.weekEnd))}</p>
            </div>

            <div class="planning-week-nav no-print" aria-label="Navigation par semaine">
              <button type="button" data-planning-shift="-7" aria-label="Semaine précédente">◀</button>
              <label class="planning-date-picker">
                <span>Semaine du</span>
                <input id="planning-date-input" type="date" value="${esc(model.weekStart)}" aria-label="Choisir une date de la semaine">
              </label>
              <button type="button" data-planning-shift="7" aria-label="Semaine suivante">▶</button>
            </div>
            <button type="button" class="planning-active-week no-print" id="planning-current-week">Revenir à la semaine active</button>

            <label class="opening-import-card planning-import-card no-print" id="planning-import-dropzone" for="planning-portfolio-file" tabindex="0" role="button" aria-label="Importer ou déposer le portefeuille FOLS de l’Assistant">
              <span class="opening-import-icon" aria-hidden="true">⇩</span>
              <span class="opening-import-copy">
                <strong>Portefeuille FOLS</strong>
                <small id="planning-import-status">${esc(importStatus)}</small>
                <em>${esc(coverage)}</em>
              </span>
              <span class="opening-import-action">Glisser ici ou parcourir</span>
              <input type="file" id="planning-portfolio-file" accept=".csv,.txt,text/csv,text/plain" hidden>
            </label>
          </aside>

          <section class="planning-report">
            <div class="planning-print-heading">PLANNING DU ${esc(longDate(model.weekStart).toLocaleUpperCase('fr-FR'))} AU ${esc(longDate(model.weekEnd).toLocaleUpperCase('fr-FR'))}</div>
            <div class="planning-sheet">
              <div class="planning-sheet-header">
                <div></div>
                ${days.map(day => {
                  const heading = dayHeading(day.key);
                  return `<div class="planning-sheet-day${day.covered ? '' : ' is-uncovered'}"><strong>${esc(heading.name)}</strong><span>${esc(heading.day)}</span></div>`;
                }).join('')}
              </div>
              ${simpleRow('Nbre arrivées', days, 'totalRooms', 'blue')}
              ${simpleRow('Nbre départs', days, 'departures', 'orange')}
              ${simpleRow('Nbre chambres', days, 'occupiedRooms', 'grey')}
              ${detailedRow('Sofas individuels', days, 'sofaCount', day => sofaComposition(day, model.roomTypes), 'yellow', { detailHtml:true, className:'planning-sofa-row' })}
              ${detailedRow('Groupes en arrivée', days, 'groupCount', groupComposition, 'green')}
              <div class="planning-sheet-row planning-sheet-notes">
                <div class="planning-sheet-label">Observations</div>
                <div class="planning-sheet-note-space"></div>
              </div>
            </div>
            <div class="planning-report-footer">Source unique : portefeuille importé dans l’Assistant · groupes séparés des sofas individuels</div>
          </section>
        </div>
      </section>`;
    bind(target);
  }

  function importPortfolio(file, host){
    if (!file || typeof window.ORIS_IMPORT_SOURCE_FILE !== 'function') return;
    const status = byId('planning-import-status');
    if (status) status.textContent = 'Import en cours…';
    const previousImport = String(window.__AAR_RESERVATION_CONTROL?.importedAt || '');
    window.ORIS_IMPORT_SOURCE_FILE(file);
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const currentImport = String(window.__AAR_RESERVATION_CONTROL?.importedAt || '');
      if ((currentImport && currentImport !== previousImport) || attempts >= 40) {
        window.clearInterval(timer);
        selectedWeekStart = '';
        render(host);
      }
    }, 250);
  }

  function printPlanning(){
    const style = document.createElement('style');
    style.id = 'planning-print-page-style';
    style.textContent = '@page { size: A4 landscape; margin: 8mm; }';
    document.head.appendChild(style);
    const cleanup = () => style.remove();
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 2000);
  }

  function bind(host){
    byId('planning-back')?.addEventListener('click', () => byId('tab-home')?.click());
    byId('planning-print')?.addEventListener('click', printPlanning);
    host.querySelectorAll('[data-planning-shift]').forEach(button => button.addEventListener('click', () => {
      selectedWeekStart = addDays(selectedWeekStart, Number(button.getAttribute('data-planning-shift')) || 0);
      render(host);
    }));
    byId('planning-date-input')?.addEventListener('change', event => {
      selectedWeekStart = mondayKey(event.target.value) || selectedWeekStart;
      render(host);
    });
    byId('planning-current-week')?.addEventListener('click', () => {
      selectedWeekStart = '';
      render(host);
    });

    const input = byId('planning-portfolio-file');
    const dropzone = byId('planning-import-dropzone');
    input?.addEventListener('click', () => { input.value = ''; });
    input?.addEventListener('change', () => importPortfolio(input.files?.[0], host));
    let dragDepth = 0;
    ['dragenter', 'dragover'].forEach(type => dropzone?.addEventListener(type, event => {
      event.preventDefault();
      event.stopPropagation();
      if (type === 'dragenter') dragDepth += 1;
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      dropzone.classList.add('is-dragover');
    }));
    dropzone?.addEventListener('dragleave', event => {
      event.preventDefault();
      event.stopPropagation();
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) dropzone.classList.remove('is-dragover');
    });
    dropzone?.addEventListener('drop', event => {
      event.preventDefault();
      event.stopPropagation();
      dragDepth = 0;
      dropzone.classList.remove('is-dragover');
      importPortfolio(event.dataTransfer?.files?.[0], host);
    });
    dropzone?.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      input?.click();
    });
  }

  window.ORIS_PLANNING = { render, getWeek, resetWeek: () => { selectedWeekStart = ''; } };
})();
