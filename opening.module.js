(function(){
  const MANUAL_KEY = 'oris_opening_manual_v1';
  const COLORS_KEY = 'oris_opening_colors_v1';
  const ROOM_OVERRIDES_KEY = 'oris_opening_room_overrides_v1';
  const TYPE_OVERRIDES_KEY = 'oris_opening_type_overrides_v1';
  const SOFA_OVERRIDES_KEY = 'oris_opening_sofa_overrides_v1';
  const BABY_OVERRIDES_KEY = 'oris_opening_baby_overrides_v1';
  const BABY_DONE_KEY = 'oris_assistant_baby_sofa_done_v1';
  const ROOM_TYPES = ['TRI', 'STDM', 'PRIVS', 'PRIVM', 'SGE', 'EXEC'];
  const COMPOSITIONS = [[1,0],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[2,4],[3,0],[3,1]];
  const DEFAULT_COLORS = { one: '#fef3c7', two: '#fecaca' };
  let sortField = 'room';
  let sortDirection = 'asc';

  function byId(id){ return document.getElementById(id); }
  function esc(value){
    return String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }
  function json(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }
  function pad2(value){ return String(value).padStart(2, '0'); }
  function localDateKey(date = new Date()){
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }
  function activeDateKey(){
    return String(
      window.__AAR_RESERVATION_CONTROL_BASE_DATE_KEY ||
      window.__AAR_RESERVATION_CONTROL?.boostBaseDate ||
      window.__AAR_RESERVATION_CONTROL?.commentWindowStart ||
      localStorage.getItem('aar_home_check_current_date_v1') ||
      localDateKey()
    ).trim();
  }
  function formatDate(key){
    const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return key;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }
  function formatImportDate(){
    const raw = String(window.__AAR_RESERVATION_CONTROL?.importedAt || localStorage.getItem('aar_import_date_indiv_v1') || '').trim();
    if (!raw) return 'Aucun fichier chargé';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return 'Arrival List chargée';
    return `Chargée le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`;
  }
  function operationalName(item){
    const raw = String(item?.guestName || item?.name || '').trim();
    if (!raw) return 'CLIENT';
    const parts = raw.split(/\s+/).filter(Boolean);
    const family = [];
    for (const part of parts) {
      const normalized = part.replace(/[’']/g, '');
      if (/^[A-ZÀ-ÖØ-ÞĀ-ſ-]+$/.test(normalized) || /^(DE|DU|DES|LE|LA|LES|VAN|VON|DEN|DER)$/i.test(normalized)) family.push(part.toUpperCase());
      else break;
    }
    return (family.length ? family.join(' ') : parts[0]).toUpperCase();
  }
  function openingGuestName(item){
    const raw = String(item?.guestName || item?.name || '').trim();
    if (!raw) return 'CLIENT';
    return (raw.split(/\s+-\s+/)[0] || raw).replace(/\s+/g, ' ').trim().toUpperCase();
  }
  function shortDate(value){
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '-';
  }
  function assignedRoomNumber(value){
    const room = String(value || '').trim();
    if (!room || /^ind(?:\s|\b|-)/i.test(room)) return '';
    return room;
  }
  function preferredRoomNumber(item){
    const direct = assignedRoomNumber(item?.comments?.roomPref);
    if (direct) return direct;
    const preferences = String(item?.comments?.preferences || '');
    const match = preferences.match(/\b(?:chbre|chambre)\s*:\s*(\d{3})\b/i);
    return match?.[1] || '';
  }
  function roomOverrides(){
    const data = json(localStorage.getItem(ROOM_OVERRIDES_KEY) || '{}', {});
    return data && typeof data === 'object' ? data : {};
  }
  function roomOverrideKey(dateKey, reservationId){ return `${dateKey}::${reservationId}`; }
  function typeOverrides(){
    const data = json(localStorage.getItem(TYPE_OVERRIDES_KEY) || '{}', {});
    return data && typeof data === 'object' ? data : {};
  }
  function roomTypeOptions(value){
    const current = String(value || '').trim().toUpperCase();
    const types = current && !ROOM_TYPES.includes(current) ? [current, ...ROOM_TYPES] : ROOM_TYPES;
    return ['<option value=""></option>', ...types.map(type => `<option value="${esc(type)}"${type === current ? ' selected' : ''}>${esc(type)}</option>`)].join('');
  }
  function sofaCapacity(roomType){
    const type = String(roomType || '').trim().toUpperCase();
    if (['STDM', 'PRIVM', 'EXEC'].includes(type)) return 2;
    if (['TRI', 'PRIVS', 'SGE'].includes(type)) return 1;
    return 0;
  }
  function sofaOverrides(){
    const data = json(localStorage.getItem(SOFA_OVERRIDES_KEY) || '{}', {});
    return data && typeof data === 'object' ? data : {};
  }
  function babyOverrides(){
    const data = json(localStorage.getItem(BABY_OVERRIDES_KEY) || '{}', {});
    return data && typeof data === 'object' ? data : {};
  }
  function sofaCountOptions(roomType, value){
    const capacity = sofaCapacity(roomType);
    const current = Math.min(Math.max(1, Number(value || 1)), Math.max(1, capacity));
    return Array.from({ length:capacity }, (_, index) => index + 1)
      .map(count => `<option value="${count}"${count === current ? ' selected' : ''}>${count} SOFA${count > 1 ? 'S' : ''}</option>`)
      .join('');
  }
  function compositionOptions(adults, children){
    const current = `${Number(adults || 0)}|${Number(children || 0)}`;
    const options = COMPOSITIONS.some(([a,e]) => `${a}|${e}` === current)
      ? COMPOSITIONS
      : [[Number(adults || 0), Number(children || 0)], ...COMPOSITIONS];
    return options.map(([a,e]) => `<option value="${a}|${e}"${`${a}|${e}` === current ? ' selected' : ''}>${a}A/${e}E</option>`).join('');
  }
  function babyIsDone(dateKey, item){
    const done = json(localStorage.getItem(BABY_DONE_KEY) || '{}', {});
    return !!done[`${dateKey}::${operationalName(item).toLocaleUpperCase('fr')}`];
  }
  function automaticRows(dateKey){
    const items = Array.isArray(window.__AAR_RESERVATION_CONTROL?.items) ? window.__AAR_RESERVATION_CONTROL.items : [];
    return items.filter(item => String(item?.arrivalDate || '') === dateKey).flatMap((item, index) => {
      const control = item?.reservationControl || {};
      const babyDone = !!control.babyDetected && babyIsDone(dateKey, item);
      const calc = window.ORIS_SOFA_ENGINE?.calculate?.({
        adults: item?.adults,
        children: item?.children,
        babyDetected: !!control.babyDetected,
        roomType: item?.roomType
      }) || { sofaNeed: Number(control.sofaNeed || 0), babySofaNeed: Number(control.babySofaNeed || 0) };
      let sofaCount = Number(calc.sofaNeed || 0);
      if (control.babyDetected) {
        const babySofaNeed = Number(calc.babySofaNeed || 0);
        // Le besoin sofa associé au lit bébé reste à ouvrir même si le lit bébé
        // n'est pas barré. Barrer le lit ajoute seulement le sofa de remplacement.
        sofaCount = babyDone
          ? Math.max(1, babySofaNeed + 1)
          : babySofaNeed;
      }
      if (sofaCount < 1) return [];
      const reservationId = String(item?.reservationLineKey || item?.id || item?.folsReservationId || `auto_${index}`);
      const overrides = roomOverrides();
      const overrideKey = roomOverrideKey(dateKey, reservationId);
      const hasOverride = Object.prototype.hasOwnProperty.call(overrides, overrideKey);
      const roomNumber = hasOverride
        ? assignedRoomNumber(overrides[overrideKey])
        : assignedRoomNumber(item?.roomNumber) || preferredRoomNumber(item);
      const savedTypes = typeOverrides();
      const roomType = Object.prototype.hasOwnProperty.call(savedTypes, overrideKey)
        ? String(savedTypes[overrideKey] || '').trim().toUpperCase()
        : String(item?.roomType || '').trim().toUpperCase();
      const savedSofas = sofaOverrides();
      if (Object.prototype.hasOwnProperty.call(savedSofas, overrideKey)) {
        const capacity = sofaCapacity(roomType);
        if (capacity > 0) sofaCount = Math.min(Math.max(1, Number(savedSofas[overrideKey] || 1)), capacity);
      }
      const savedBabies = babyOverrides();
      const babyBedActive = Object.prototype.hasOwnProperty.call(savedBabies, overrideKey)
        ? !!savedBabies[overrideKey]
        : !!control.babyDetected && !babyDone;
      return [{
        id: reservationId,
        source: 'auto',
        name: openingGuestName(item),
        room: roomNumber,
        roomType,
        arrivalDate: String(item?.arrivalDate || dateKey),
        departureDate: String(item?.departureDate || ''),
        sofas: sofaCount,
        babyBedActive,
        adults: Number(item?.adults || 0),
        children: Number(item?.children || 0)
      }];
    });
  }
  function manualDb(){
    const data = json(localStorage.getItem(MANUAL_KEY) || '{}', {});
    return data && typeof data === 'object' ? data : {};
  }
  function manualRows(dateKey){
    const db = manualDb();
    return (Array.isArray(db[dateKey]) ? db[dateKey] : []).map(item => {
      const capacity = sofaCapacity(item?.roomType);
      const sofas = capacity > 0 ? Math.min(Math.max(1, Number(item?.sofas || 1)), capacity) : Number(item?.sofas || 1);
      return { arrivalDate:dateKey, departureDate:'', ...item, sofas, source:'manual' };
    });
  }
  function saveManual(dateKey, rows){
    const db = manualDb();
    db[dateKey] = rows;
    localStorage.setItem(MANUAL_KEY, JSON.stringify(db));
    window.AAR?.scheduleSaveState?.('opening sofa manual update');
  }
  function colors(){
    const stored = json(localStorage.getItem(COLORS_KEY) || '{}', {});
    const valid = value => /^#[0-9a-f]{6}$/i.test(String(value || ''));
    return {
      one: valid(stored.one) ? stored.one : DEFAULT_COLORS.one,
      two: valid(stored.two) ? stored.two : DEFAULT_COLORS.two
    };
  }
  function allRows(dateKey){
    const direction = sortDirection === 'desc' ? -1 : 1;
    return [...automaticRows(dateKey), ...manualRows(dateKey)].sort((a, b) => {
      if (!String(a.name || '').trim() && String(b.name || '').trim()) return 1;
      if (String(a.name || '').trim() && !String(b.name || '').trim()) return -1;
      let result = 0;
      if (sortField === 'sofas') result = Number(a.sofas) - Number(b.sofas);
      else if (sortField === 'room') result = String(a.room).localeCompare(String(b.room), 'fr', { sensitivity:'base', numeric:true });
      else result = String(a.name).localeCompare(String(b.name), 'fr', { sensitivity:'base', numeric:true });
      return (result || String(a.name).localeCompare(String(b.name), 'fr', { sensitivity:'base' })) * direction;
    });
  }
  function composition(row){ return `${Number(row.adults || 0)}A/${Number(row.children || 0)}E`; }
  function compositionAlert(row){
    const calculation = window.ORIS_SOFA_ENGINE?.calculate?.({
      adults: row?.adults,
      children: row?.children,
      babyDetected: !!row?.babyBedActive,
      roomType: row?.roomType
    });
    if (!calculation || (!calculation.occupancyCapacityExceeded && !calculation.sofaCapacityExceeded)) return '';
    return String(calculation.alertTechnicalReason || calculation.alertReason || 'Composition incompatible avec le type de chambre');
  }
  function renderCompositionAlert(row){
    const reason = compositionAlert(row);
    return reason ? `<strong class="opening-composition-alert" title="${esc(reason)}" aria-label="Attention : ${esc(reason)}">!</strong>` : '';
  }
  function render(container){
    const host = container || byId('opening-output');
    if (!host) return;
    const dateKey = activeDateKey();
    const rows = allRows(dateKey);
    const palette = colors();
    host.innerHTML = `
      <section class="opening-shell" style="--opening-one:${esc(palette.one)};--opening-two:${esc(palette.two)}">
        <div class="assistant-topbar opening-topbar no-print">
          <button type="button" class="assistant-dashboard-button" id="opening-back">Dashboard</button>
          <button type="button" class="opening-print-button" id="opening-print">Imprimer le rapport</button>
        </div>
        <div class="opening-workspace">
        <aside class="opening-controls">
        <div class="opening-report-title">
          <p class="assistant-eyebrow no-print">Housekeeping</p>
          <h1>Ouverture Sofa</h1>
          <p>${esc(formatDate(dateKey))}</p>
        </div>
        <label class="opening-import-card no-print" id="opening-import-dropzone" for="opening-arrival-file">
          <span class="opening-import-icon" aria-hidden="true">⇩</span>
          <span class="opening-import-copy">
            <strong>Arrival List FOLS</strong>
            <small id="opening-import-status">${esc(formatImportDate())}</small>
          </span>
          <span class="opening-import-action">Importer</span>
          <input type="file" id="opening-arrival-file" accept=".csv,.txt,text/csv,text/plain" hidden>
        </label>
        <section class="opening-tools no-print">
          <strong>Couleurs de surlignage</strong>
          <div class="opening-color-controls">
            <label>1 SOFA <input type="color" id="opening-color-one" value="${esc(palette.one)}"></label>
            <label>2 SOFAS <input type="color" id="opening-color-two" value="${esc(palette.two)}"></label>
          </div>
        </section>
        </aside>
        <section class="opening-report">
          <div class="opening-report-summary no-print"><strong>${rows.length}</strong> chambre(s) à préparer</div>
          <div class="opening-table">
            <div class="opening-row opening-row-head">
              <button type="button" class="opening-sort-button" data-opening-sort="name">NOM <b>${sortField === 'name' ? (sortDirection === 'asc' ? '↓' : '↑') : ''}</b></button>
              <button type="button" class="opening-sort-button" data-opening-sort="room">CHAMBRE <b>${sortField === 'room' ? (sortDirection === 'asc' ? '↓' : '↑') : ''}</b></button>
              <span>Arrivée</span><span>Départ</span><span>Type</span>
              <button type="button" class="opening-sort-button" data-opening-sort="sofas">SOFAS <b>${sortField === 'sofas' ? (sortDirection === 'asc' ? '↓' : '↑') : ''}</b></button>
              <span>Composition</span><span>Lit bébé</span><span class="no-print">Action</span>
            </div>
            ${rows.length ? rows.map(row => `
              <div class="opening-row opening-sofa-${Number(row.sofas) >= 2 ? 'two' : 'one'}">
                <span>${row.source === 'manual' ? `<input class="opening-inline-text no-print" data-opening-manual-field="name" data-opening-manual-id="${esc(row.id)}" value="${esc(row.name || '')}" aria-label="Nom de la ligne manuelle"><b class="print-only">${esc(row.name || '')}</b>` : `<strong>${esc(row.name)}</strong>`}</span>
                <span class="opening-room-cell"><input class="opening-room-input no-print" data-opening-room-edit="${esc(row.id)}" data-opening-source="${esc(row.source)}" value="${esc(row.room || '')}" aria-label="Chambre de ${esc(row.name)}"><b class="print-only">${esc(row.room || '')}</b></span>
                <span class="opening-stay-date">${esc(shortDate(row.arrivalDate))}</span>
                <span class="opening-stay-date">${esc(shortDate(row.departureDate))}</span>
                <span class="opening-room-type"><select class="opening-type-select no-print" data-opening-type-edit="${esc(row.id)}" data-opening-source="${esc(row.source)}" aria-label="Type de chambre de ${esc(row.name)}">${roomTypeOptions(row.roomType)}</select><b class="print-only">${esc(row.roomType || '')}</b></span>
                <span class="opening-sofa-count">${sofaCapacity(row.roomType) > 1 ? `<select class="opening-sofa-select no-print" data-opening-sofa-edit="${esc(row.id)}" data-opening-source="${esc(row.source)}" aria-label="Nombre de sofas de ${esc(row.name)}">${sofaCountOptions(row.roomType, row.sofas)}</select><b class="print-only">${esc(row.sofas)} SOFAS</b>` : `<b>${esc(row.sofas)} SOFA</b>`}${row.babyBedActive ? ' <small>(+ LIT BÉBÉ)</small>' : ''}</span>
                <span class="opening-composition-cell">${row.source === 'manual' ? `<select class="opening-composition-select no-print" data-opening-composition-edit="${esc(row.id)}" aria-label="Composition de ${esc(row.name)}">${compositionOptions(row.adults, row.children)}</select><b class="print-only">${esc(composition(row))}</b>` : esc(composition(row))}${renderCompositionAlert(row)}</span>
                <span class="opening-baby-cell"><button type="button" class="opening-baby-select no-print" data-opening-baby-select="${esc(row.id)}" data-opening-baby-value="${row.babyBedActive ? '1' : '0'}" data-opening-source="${esc(row.source)}" aria-label="Changer le lit bébé de ${esc(row.name)}">${row.babyBedActive ? 'OUI' : 'NON'}</button><b class="print-only">${row.babyBedActive ? 'OUI' : 'NON'}</b></span>
                <span class="no-print opening-row-actions">${row.source === 'manual' ? `<button type="button" class="opening-delete" data-opening-delete="${esc(row.id)}" aria-label="Supprimer ${esc(row.name)}" title="Supprimer cette ligne">×</button>` : '<small>Automatique</small>'}</span>
              </div>`).join('') : '<div class="opening-empty">Aucune ouverture sofa pour cette journée.</div>'}
            <button type="button" class="opening-add-row no-print" id="opening-add-row"><span>+</span> Ajouter une ligne</button>
          </div>
          <aside class="opening-guide">
            <strong>Avant attribution</strong>
            <p>Vérifier les chambres en recouche et les late check-out afin d’éviter tout conflit d’attribution.</p>
          </aside>
        </section>
        </div>
      </section>`;
    bind(host, dateKey);
  }
  function bind(host, dateKey){
    byId('opening-back')?.addEventListener('click', () => byId('tab-home')?.click());
    byId('opening-print')?.addEventListener('click', () => {
      const previousTitle = document.title;
      const restoreTitle = () => { document.title = previousTitle; };
      document.title = ' ';
      window.addEventListener('afterprint', restoreTitle, { once:true });
      window.print();
    });
    const arrivalInput = byId('opening-arrival-file');
    const arrivalDropzone = byId('opening-import-dropzone');
    const importArrivalList = file => {
      if (!file || typeof window.ORIS_IMPORT_SOURCE_FILE !== 'function') return;
      const status = byId('opening-import-status');
      if (status) status.textContent = 'Import en cours…';
      const previousImport = String(window.__AAR_RESERVATION_CONTROL?.importedAt || '');
      window.ORIS_IMPORT_SOURCE_FILE(file);
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        const currentImport = String(window.__AAR_RESERVATION_CONTROL?.importedAt || '');
        if ((currentImport && currentImport !== previousImport) || attempts >= 40) {
          window.clearInterval(timer);
          render(host);
        }
      }, 250);
    };
    arrivalInput?.addEventListener('click', () => { arrivalInput.value = ''; });
    arrivalInput?.addEventListener('change', () => importArrivalList(arrivalInput.files?.[0]));
    ['dragenter','dragover'].forEach(type => arrivalDropzone?.addEventListener(type, event => {
      event.preventDefault();
      arrivalDropzone.classList.add('is-dragover');
    }));
    ['dragleave','dragend'].forEach(type => arrivalDropzone?.addEventListener(type, () => arrivalDropzone.classList.remove('is-dragover')));
    arrivalDropzone?.addEventListener('drop', event => {
      event.preventDefault();
      arrivalDropzone.classList.remove('is-dragover');
      importArrivalList(event.dataTransfer?.files?.[0]);
    });
    host.querySelectorAll('[data-opening-sort]').forEach(button => button.addEventListener('click', () => {
      const requestedField = button.getAttribute('data-opening-sort');
      const nextField = requestedField === 'sofas' ? 'sofas' : requestedField === 'room' ? 'room' : 'name';
      if (sortField === nextField) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      else {
        sortField = nextField;
        sortDirection = 'asc';
      }
      render(host);
    }));
    host.querySelectorAll('[data-opening-room-edit]').forEach(input => {
      const saveRoom = () => {
        const reservationId = input.getAttribute('data-opening-room-edit') || '';
        if (!reservationId) return;
        const savedRoom = assignedRoomNumber(input.value);
        if (input.getAttribute('data-opening-source') === 'manual') {
          const rows = manualRows(dateKey).map(({ source, ...item }) => item);
          const row = rows.find(item => item.id === reservationId);
          if (row) row.room = savedRoom;
          saveManual(dateKey, rows);
        } else {
          const overrides = roomOverrides();
          overrides[roomOverrideKey(dateKey, reservationId)] = savedRoom;
          localStorage.setItem(ROOM_OVERRIDES_KEY, JSON.stringify(overrides));
          window.AAR?.scheduleSaveState?.('opening room override');
        }
        const printValue = input.parentElement?.querySelector?.('.print-only');
        if (printValue) printValue.textContent = savedRoom;
        if (sortField === 'room') render(host);
      };
      input.addEventListener('change', saveRoom);
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          input.blur();
        }
      });
    });
    host.querySelectorAll('[data-opening-type-edit]').forEach(select => select.addEventListener('change', () => {
      const reservationId = select.getAttribute('data-opening-type-edit') || '';
      if (!reservationId) return;
      const roomType = String(select.value || '').trim().toUpperCase();
      if (select.getAttribute('data-opening-source') === 'manual') {
        const rows = manualRows(dateKey).map(({ source, ...item }) => item);
        const row = rows.find(item => item.id === reservationId);
        if (row) row.roomType = roomType;
        saveManual(dateKey, rows);
      } else {
        const overrides = typeOverrides();
        overrides[roomOverrideKey(dateKey, reservationId)] = roomType;
        localStorage.setItem(TYPE_OVERRIDES_KEY, JSON.stringify(overrides));
        window.AAR?.scheduleSaveState?.('opening room type override');
      }
      const printValue = select.parentElement?.querySelector?.('.print-only');
      if (printValue) printValue.textContent = roomType;
      render(host);
    }));
    host.querySelectorAll('[data-opening-sofa-edit]').forEach(select => select.addEventListener('change', () => {
      const reservationId = select.getAttribute('data-opening-sofa-edit') || '';
      if (!reservationId) return;
      const sofaCount = Number(select.value || 1);
      if (select.getAttribute('data-opening-source') === 'manual') {
        const rows = manualRows(dateKey).map(({ source, ...item }) => item);
        const row = rows.find(item => item.id === reservationId);
        if (row) row.sofas = sofaCount;
        saveManual(dateKey, rows);
      } else {
        const overrides = sofaOverrides();
        overrides[roomOverrideKey(dateKey, reservationId)] = sofaCount;
        localStorage.setItem(SOFA_OVERRIDES_KEY, JSON.stringify(overrides));
        window.AAR?.scheduleSaveState?.('opening sofa count override');
      }
      render(host);
    }));
    ['one','two'].forEach(type => byId(`opening-color-${type}`)?.addEventListener('input', event => {
      const next = colors();
      next[type] = event.target.value;
      localStorage.setItem(COLORS_KEY, JSON.stringify(next));
      render(host);
    }));
    byId('opening-add-row')?.addEventListener('click', () => {
      const rows = manualRows(dateKey).map(({ source, ...item }) => item);
      rows.push({
        id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: '', room: '', roomType: '', sofas: 1, babyBedActive: false, adults: 1, children: 0
      });
      saveManual(dateKey, rows);
      render(host);
    });
    host.querySelectorAll('[data-opening-manual-field]').forEach(input => input.addEventListener('change', () => {
      const id = input.getAttribute('data-opening-manual-id') || '';
      const field = input.getAttribute('data-opening-manual-field') || '';
      if (!id || !['name','adults','children'].includes(field)) return;
      const rows = manualRows(dateKey).map(({ source, ...item }) => item);
      const row = rows.find(item => item.id === id);
      if (!row) return;
      row[field] = field === 'name' ? String(input.value || '').trim().toUpperCase() : Math.max(0, Number(input.value || 0));
      saveManual(dateKey, rows);
      render(host);
    }));
    host.querySelectorAll('[data-opening-composition-edit]').forEach(select => select.addEventListener('change', () => {
      const id = select.getAttribute('data-opening-composition-edit') || '';
      const [adults, children] = String(select.value || '1|0').split('|').map(Number);
      const rows = manualRows(dateKey).map(({ source, ...item }) => item);
      const row = rows.find(item => item.id === id);
      if (!row) return;
      row.adults = Math.max(0, adults || 0);
      row.children = Math.max(0, children || 0);
      saveManual(dateKey, rows);
      render(host);
    }));
    host.querySelectorAll('[data-opening-baby-select]').forEach(button => button.addEventListener('click', () => {
      const id = button.getAttribute('data-opening-baby-select') || '';
      const source = button.getAttribute('data-opening-source') || 'manual';
      const nextValue = button.getAttribute('data-opening-baby-value') !== '1';
      if (source === 'auto') {
        const saved = babyOverrides();
        saved[roomOverrideKey(dateKey, id)] = nextValue;
        localStorage.setItem(BABY_OVERRIDES_KEY, JSON.stringify(saved));
        window.AAR?.scheduleSaveState?.('opening sofa baby override');
        render(host);
        return;
      }
      const rows = manualRows(dateKey).map(({ source, ...item }) => item);
      const row = rows.find(item => item.id === id);
      if (!row) return;
      row.babyBedActive = nextValue;
      saveManual(dateKey, rows);
      render(host);
    }));
    host.querySelectorAll('[data-opening-delete]').forEach(button => button.addEventListener('click', () => {
      const id = button.getAttribute('data-opening-delete');
      const rows = manualRows(dateKey).filter(item => item.id !== id).map(({ source, ...item }) => item);
      saveManual(dateKey, rows);
      render(host);
    }));
  }
  window.ORIS_OPENING = { render };
})();
