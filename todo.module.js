// todo.module.js  (version "détections" + horodatage)
// + HOME GRAPH : défaut 7j (AU DÉBUT de la plage) + boutons 7j / 1 mois / 1 an / Auto

(function () {
  const LS_TODO_TODAY = 'aar_todo_today_v1';
  const LS_TODO_WEEK  = 'aar_todo_week_v1';

  // ✅ Defaults vides (aucune liste inventée)
  const DEFAULT_TODAY = [];
  const DEFAULT_WEEK  = [];

  // ✅ Mode persistance des détections :
  const PERSIST_TODAY = true;
  const PERSIST_WEEK  = true;

  function api() {
    return window.AAR || {};
  }

  // ---------- Temps / horodatage (local FR) ----------
  function pad2(n){ return String(n).padStart(2,'0'); }

  function todayKeyLocal(d = new Date()){
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function fmtFRWithDayLocal(d = new Date()){
    const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth()+1);
    const yyyy = d.getFullYear();
    return `${days[d.getDay()]} ${dd}/${mm}/${yyyy}`;
  }

  function fmtHomeDateLabel(dateKey){
    const d = dateKey ? new Date(`${dateKey}T00:00:00`) : new Date();
    const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }

  function setStamp(){
    const el = document.getElementById('today-stamp');
    if (!el) return;
    el.textContent = fmtHomeDateLabel(getCurrentHomeCheckDateKey());
  }

  // ---------- Storage helpers ----------
  function safeParse(raw){
    const A = api();
    if (A.safeJsonParse) return A.safeJsonParse(raw || 'null', null);
    try { return JSON.parse(raw); } catch { return null; }
  }

  function getList(key, defaults, persist){
    if (!persist) return defaults.slice();
    const raw = localStorage.getItem(key);
    const parsed = safeParse(raw);
    if (Array.isArray(parsed)) return parsed;
    // Si rien n'existe, on initialise à defaults (ici vide)
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults.slice();
  }

  function saveList(key, list, reason, persist){
    if (!persist) return;
    localStorage.setItem(key, JSON.stringify(list));
    const A = api();
    if (A.scheduleSaveState) A.scheduleSaveState(reason || "todo update");
  }

  // ---------- Render ----------
  function renderTodo(list, el, storageKey, persist, emptyText){
    if (!el) return;
    el.innerHTML = '';

    if (!list.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = emptyText || "Aucune détection pour l’instant.";
      el.appendChild(empty);
      return;
    }

    list.forEach((item, i) => {
      const row = document.createElement('div');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!item.done;
      cb.onchange = () => {
        list[i].done = cb.checked;
        saveList(storageKey, list, "todo toggle", persist);
      };

      if (item && item.kind === 'assignment_watch') {
        row.classList.add('todo-system-row');
        const alert = document.createElement('div');
        alert.className = 'todo-system-alert';

        const meta = item.meta || {};
        const name = `<span class="todo-alert-name">${meta.name || ''}</span>`;
        const expected = `<span class="todo-alert-label">(${meta.expected || ''})</span>`;

        if (meta.grouped && Array.isArray(meta.details) && meta.details.length) {
          const detailsHtml = meta.details
            .map(d => `<span class="todo-alert-date">${d.date || ''}</span><span class="todo-alert-sep">: </span><span class="todo-alert-detected">${d.detected || ''}</span>`)
            .join('<span class="todo-alert-sep"> • </span>');
          alert.innerHTML = `<span class="todo-alert-label">Attribution à vérifier</span><span class="todo-alert-sep"> — </span>${name} ${expected}<span class="todo-alert-sep"> — </span>${detailsHtml}`;
        } else {
          const date = meta.date ? `<span class="todo-alert-date">${meta.date}</span><span class="todo-alert-sep"> — </span>` : '';
          const detected = (meta.detected === 'aucune' || meta.detected === 'non attribuée' || meta.detected === 'N/A')
            ? `<span class="todo-alert-detected">N/A</span>`
            : `<span class="todo-alert-detected">${meta.detected || ''}</span>`;
          alert.innerHTML = `${date}<span class="todo-alert-label">Attribution à vérifier</span><span class="todo-alert-sep"> — </span>${name} ${expected}<span class="todo-alert-sep"> — </span><span class="todo-alert-label">détecté:</span> ${detected}`;
        }
        row.append(cb, alert);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = item.text || '';
        input.readOnly = false;
        input.oninput = () => {
          list[i].text = input.value;
          saveList(storageKey, list, "todo edit", persist);
        };
        row.append(cb, input);
      }

      el.appendChild(row);
    });
  }

  const LS_RULES = 'aar_soiree_rules_v2';
  const LS_HOME_CHECK_DB = 'aar_home_check_db_v3';
  const LS_HOME_CHECK_CURRENT_DATE = 'aar_home_check_current_date_v1';

  function makeDefaultRules(){
    return {
      checklists: {
        morning: [
          { id: 'm_export_fols', text: 'Export FOLS' },
          { id: 'm_verifier_arrivees', text: 'Vérifier arrivées du jour' },
          { id: 'm_verifier_groupes', text: 'Vérifier groupes' },
          { id: 'm_verifier_vcc', text: 'Vérifier VCC' },
          { id: 'm_preparer_gouvernante', text: 'Préparer gouvernante' }
        ],
        evening: [
          { id: 'e_verifier_arrivees_restantes', text: 'Vérifier arrivées restantes' },
          { id: 'e_controler_caisse', text: 'Contrôler caisse' },
          { id: 'e_verifier_vcc_restantes', text: 'Vérifier VCC restantes' },
          { id: 'e_preparer_plan_chambres', text: 'Préparer plan chambres' },
          { id: 'e_verifier_mails_societes', text: 'Vérifier mails / sociétés' }
        ]
      }
    };
  }

  function normalizeRuleChecklistItems(list, prefix){
    if (!Array.isArray(list)) return [];
    return list.map((item, idx)=>{
      if (typeof item === 'string') return { id: `${prefix}_${idx}`, text: item };
      const id = String(item?.id || '').trim() || `${prefix}_${idx}`;
      const text = String(item?.text || '').trim();
      return { id, text };
    }).filter(x => x.text);
  }

  function loadChecklistRules(){
    const defaults = makeDefaultRules();
    const parsed = safeParse(localStorage.getItem(LS_RULES) || 'null') || {};
    return {
      morning: normalizeRuleChecklistItems(parsed?.checklists?.morning ?? defaults.checklists.morning, 'm'),
      evening: normalizeRuleChecklistItems(parsed?.checklists?.evening ?? defaults.checklists.evening, 'e')
    };
  }

  function buildDefaultHomeCheckDB(){
    return { days: {} };
  }

  function getCurrentHomeCheckDateKey(){
    return localStorage.getItem(LS_HOME_CHECK_CURRENT_DATE) || todayKeyLocal();
  }

  function setCurrentHomeCheckDateKey(dateKey){
    localStorage.setItem(LS_HOME_CHECK_CURRENT_DATE, dateKey);
  }

  function loadHomeCheckDB(){
    const parsed = safeParse(localStorage.getItem(LS_HOME_CHECK_DB) || 'null');
    if (parsed && typeof parsed === 'object' && parsed.days) return parsed;
    const db = buildDefaultHomeCheckDB();
    localStorage.setItem(LS_HOME_CHECK_DB, JSON.stringify(db));
    return db;
  }

  function saveHomeCheckDB(db, reason){
    localStorage.setItem(LS_HOME_CHECK_DB, JSON.stringify(db));
    const A = api();
    if (A.scheduleSaveState) A.scheduleSaveState(reason || 'home checklist update');
  }

  function createDayState(){
    return {
      morningFixedDone: {},
      eveningFixedDone: {},
      morningExtra: [],
      eveningExtra: []
    };
  }

  function ensureHomeCheckDay(db, dateKey){
    if (!db.days || typeof db.days !== 'object') db.days = {};
    if (!db.days[dateKey]) {
      db.days[dateKey] = createDayState();
      saveHomeCheckDB(db, 'home checklist create day');
    }
    const day = db.days[dateKey];
    day.morningFixedDone = day.morningFixedDone && typeof day.morningFixedDone === 'object' ? day.morningFixedDone : {};
    day.eveningFixedDone = day.eveningFixedDone && typeof day.eveningFixedDone === 'object' ? day.eveningFixedDone : {};
    day.morningExtra = Array.isArray(day.morningExtra) ? day.morningExtra : [];
    day.eveningExtra = Array.isArray(day.eveningExtra) ? day.eveningExtra : [];
    return day;
  }

  function shiftCurrentHomeCheckDate(delta){
    const cur = getCurrentHomeCheckDateKey();
    const d = new Date(`${cur}T00:00:00`);
    d.setDate(d.getDate() + delta);
    const next = todayKeyLocal(d);
    setCurrentHomeCheckDateKey(next);
    refreshHomeChecklist();
  }

  function updateHomeCheckCount(total, done, elId){
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = `${done} / ${total}`;
  }

  function renderFixedRows(items, doneMap, el, sideKey){
    items.forEach(item=>{
      const row = document.createElement('div');
      row.className = 'home-check-row fixed-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!doneMap[item.id];
      cb.onchange = ()=>{
        const db = loadHomeCheckDB();
        const day = ensureHomeCheckDay(db, getCurrentHomeCheckDateKey());
        const target = sideKey === 'morning' ? day.morningFixedDone : day.eveningFixedDone;
        target[item.id] = cb.checked;
        saveHomeCheckDB(db, 'home checklist fixed toggle');
        refreshHomeChecklist();
      };

      const text = document.createElement('div');
      text.className = 'home-check-fixed-text';
      text.textContent = item.text;

      row.append(cb, text);
      el.appendChild(row);
    });
  }

  function renderExtraRows(list, el, sideKey){
    list.forEach((item, i)=>{
      const row = document.createElement('div');
      row.className = 'home-check-row extra-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!item.done;
      cb.onchange = ()=>{
        const db = loadHomeCheckDB();
        const day = ensureHomeCheckDay(db, getCurrentHomeCheckDateKey());
        const arr = sideKey === 'morning' ? day.morningExtra : day.eveningExtra;
        arr[i].done = cb.checked;
        saveHomeCheckDB(db, 'home checklist extra toggle');
        refreshHomeChecklist();
      };

      const input = document.createElement('input');
      input.type = 'text';
      input.value = item.text || '';
      input.placeholder = 'Nouvelle tâche';
      input.oninput = ()=>{
        const db = loadHomeCheckDB();
        const day = ensureHomeCheckDay(db, getCurrentHomeCheckDateKey());
        const arr = sideKey === 'morning' ? day.morningExtra : day.eveningExtra;
        arr[i].text = input.value;
        saveHomeCheckDB(db, 'home checklist extra edit');
      };

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'todo-del';
      del.textContent = '✕';
      del.title = 'Supprimer';
      del.onclick = ()=>{
        const db = loadHomeCheckDB();
        const day = ensureHomeCheckDay(db, getCurrentHomeCheckDateKey());
        const arr = sideKey === 'morning' ? day.morningExtra : day.eveningExtra;
        arr.splice(i,1);
        saveHomeCheckDB(db, 'home checklist extra delete');
        refreshHomeChecklist();
      };

      row.append(cb, input, del);
      el.appendChild(row);
    });
  }

  function renderHomeChecklistColumn(hostEl, sideKey, fixedItems, fixedDoneMap, extraList, emptyText){
    if (!hostEl) return;
    hostEl.innerHTML = '';

    const fixedSection = document.createElement('div');
    fixedSection.className = 'home-check-section';
    const fixedTitle = document.createElement('div');
    fixedTitle.className = 'home-check-subtitle';
    fixedTitle.textContent = 'Base fixe';
    fixedSection.appendChild(fixedTitle);
    if (fixedItems.length) renderFixedRows(fixedItems, fixedDoneMap, fixedSection, sideKey);
    else {
      const empty = document.createElement('div');
      empty.className = 'muted home-check-empty';
      empty.textContent = emptyText;
      fixedSection.appendChild(empty);
    }
    hostEl.appendChild(fixedSection);

    const extraSection = document.createElement('div');
    extraSection.className = 'home-check-section';
    const extraTitle = document.createElement('div');
    extraTitle.className = 'home-check-subtitle';
    extraTitle.textContent = 'Ajouts du jour';
    extraSection.appendChild(extraTitle);
    if (extraList.length) renderExtraRows(extraList, extraSection, sideKey);
    else {
      const empty = document.createElement('div');
      empty.className = 'muted home-check-empty';
      empty.textContent = 'Aucun ajout pour ce jour.';
      extraSection.appendChild(empty);
    }
    hostEl.appendChild(extraSection);
  }

  function addHomeChecklistItem(sideKey){
    const db = loadHomeCheckDB();
    const day = ensureHomeCheckDay(db, getCurrentHomeCheckDateKey());
    const arr = sideKey === 'morning' ? day.morningExtra : day.eveningExtra;
    arr.push({ text:'', done:false });
    saveHomeCheckDB(db, 'home checklist extra add');
    refreshHomeChecklist();
  }

  function refreshHomeChecklist(){
    const db = loadHomeCheckDB();
    const rules = loadChecklistRules();
    const day = ensureHomeCheckDay(db, getCurrentHomeCheckDateKey());
    setStamp();

    renderHomeChecklistColumn(
      document.getElementById('home-check-morning'),
      'morning',
      rules.morning,
      day.morningFixedDone,
      day.morningExtra,
      'Aucune tâche fixe matin.'
    );

    renderHomeChecklistColumn(
      document.getElementById('home-check-evening'),
      'evening',
      rules.evening,
      day.eveningFixedDone,
      day.eveningExtra,
      'Aucune tâche fixe soir.'
    );

    const morningDone = rules.morning.filter(x => day.morningFixedDone[x.id]).length + day.morningExtra.filter(x => x && x.done).length;
    const eveningDone = rules.evening.filter(x => day.eveningFixedDone[x.id]).length + day.eveningExtra.filter(x => x && x.done).length;
    updateHomeCheckCount(rules.morning.length + day.morningExtra.length, morningDone, 'morning-count');
    updateHomeCheckCount(rules.evening.length + day.eveningExtra.length, eveningDone, 'evening-count');
  }

  function initHomeChecklist(){
    const morningBtn = document.getElementById('add-morning-task');
    const eveningBtn = document.getElementById('add-evening-task');
    const prevBtn = document.getElementById('home-check-prev');
    const nextBtn = document.getElementById('home-check-next');

    // Toujours ouvrir la Home checklist sur aujourd'hui au chargement
    setCurrentHomeCheckDateKey(todayKeyLocal());

    if (morningBtn && !morningBtn.dataset.bound){
      morningBtn.dataset.bound = '1';
      morningBtn.addEventListener('click', ()=> addHomeChecklistItem('morning'));
    }
    if (eveningBtn && !eveningBtn.dataset.bound){
      eveningBtn.dataset.bound = '1';
      eveningBtn.addEventListener('click', ()=> addHomeChecklistItem('evening'));
    }
    if (prevBtn && !prevBtn.dataset.bound){
      prevBtn.dataset.bound = '1';
      prevBtn.addEventListener('click', ()=> shiftCurrentHomeCheckDate(-1));
    }
    if (nextBtn && !nextBtn.dataset.bound){
      nextBtn.dataset.bound = '1';
      nextBtn.addEventListener('click', ()=> shiftCurrentHomeCheckDate(1));
    }

    refreshHomeChecklist();
  }

  // ---------- API future : pousser des détections runtime ----------
  function ensureGlobalAPI(){
    window.TODO = window.TODO || {};
    window.TODO._runtimeToday = window.TODO._runtimeToday || [];
    window.TODO._runtimeWeek  = window.TODO._runtimeWeek  || [];

    window.TODO.setToday = (items)=>{
      window.TODO._runtimeToday = Array.isArray(items) ? items : [];
      if (!PERSIST_TODAY) boot(true);
    };

    window.TODO.setWeek = (items)=>{
      window.TODO._runtimeWeek = Array.isArray(items) ? items : [];
      if (!PERSIST_WEEK) boot(true);
    };

    // ✅ permet à script.js de rerender le graph après hydrate GitHub
    window.TODO.refreshHomeChecklist = refreshHomeChecklist;

    window.TODO.renderHomeArrivalsChartFromStorage = ()=>{
      const saved = localStorage.getItem(LS_HOME_STATS_SOURCE);
      const data = saved ? parseArrivalsIndivGroup(saved) : null;
      renderHomeArrivalsChart(data);
    };

    window.TODO.refresh = ()=> boot(false);
  }

  /* =========================================================
     HOME ARRIVALS GRAPH (Plotly)
     - source stored in localStorage so the graph persists after reload
     ========================================================= */
  const LS_HOME_STATS_SOURCE = 'aar_home_arrivals_source_v1';

  function splitCsvLine(line, sep){
    // CSV splitter with quotes support. Works for ',' or ';' or '\t'
    const out = [];
    let cur = '';
    let inQ = false;
    const s = sep || ',';
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      if(ch === '"'){
        if(inQ && line[i+1] === '"'){ cur += '"'; i++; }
        else inQ = !inQ;
      } else if(ch === s && !inQ){
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function guessSep(line){
    // Count separators outside quotes, pick the one with most occurrences
    const seps = [';', ',', '\t'];
    const counts = {';':0, ',':0, '\t':0};
    let inQ = false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      if(ch === '"'){
        if(inQ && line[i+1] === '"'){ i++; }
        else inQ = !inQ;
      } else if(!inQ){
        if(ch === ';') counts[';']++;
        else if(ch === ',') counts[',']++;
        else if(ch === '\t') counts['\t']++;
      }
    }
    let best = ',';
    let bestN = -1;
    for(const s of seps){
      if(counts[s] > bestN){
        bestN = counts[s];
        best = s === '\t' ? '\t' : s;
      }
    }
    return best;
  }

  function parseFRDateToISO(s){
    if(!s) return null;
    const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if(!m) return null;
    const dd = Number(m[1]), mm = Number(m[2]), yyyy = Number(m[3]);
    const d = new Date(Date.UTC(yyyy, mm-1, dd));
    return d.toISOString().slice(0,10); // yyyy-mm-dd
  }

  function parseArrivalsIndivGroup(text){
    const lines = String(text || '').replace(/\r/g,'').split('\n').filter(l => l.trim() !== '');
    if(!lines.length) return null;

    // Find header line (some exports can start with garbage)
    let headerIdx = -1;
    for(let i=0;i<Math.min(lines.length, 80); i++){
      const L = lines[i];
      if(L.includes('PSER_DATE') && L.includes('NB_RESA') && L.includes('ROOM_NUM')){
        headerIdx = i; break;
      }
    }
    if(headerIdx === -1) return null;

    const sep = guessSep(lines[headerIdx]);
    const header = splitCsvLine(lines[headerIdx], sep).map(s=>String(s||'').trim());
    const idxDate = header.indexOf('PSER_DATE');
    const idxNb   = header.indexOf('NB_RESA');
    const idxRoom = header.indexOf('ROOM_NUM');
    if(idxDate === -1 || idxNb === -1 || idxRoom === -1) return null;

    const mapInd = new Map();
    const mapGrp = new Map();

    const needLen = Math.max(idxDate, idxNb, idxRoom) + 1;

    for(let i=headerIdx+1;i<lines.length;i++){
      const row = splitCsvLine(lines[i], sep);
      if(row.length < needLen) continue;

      const iso = parseFRDateToISO(row[idxDate]);
      if(!iso) continue;

      const roomNum = String(row[idxRoom] || '').trim();
      const isGrp = /^grp\b/i.test(roomNum);

      let n = parseInt(String(row[idxNb]||'').trim(), 10);
      if(!Number.isFinite(n) || n<=0) n = 1;

      if(isGrp){
        mapGrp.set(iso, (mapGrp.get(iso)||0) + n);
      } else {
        mapInd.set(iso, (mapInd.get(iso)||0) + n);
      }
    }

    const allDates = Array.from(new Set([...mapInd.keys(), ...mapGrp.keys()])).sort();
    if(!allDates.length) return null;

    const yInd = allDates.map(d=>mapInd.get(d)||0);
    const yGrp = allDates.map(d=>mapGrp.get(d)||0);

    return { dates: allDates, yInd, yGrp };
  }

  // --------- RANGE HELPERS ---------
  function addDaysISO(iso, days){
    const d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0,10);
  }

  // ✅ plage depuis le début (minISO -> minISO + N)
  function clampRangeFromStart(startISO, maxISO, daysForward){
    const end = addDaysISO(startISO, daysForward - 1);
    return (end > maxISO) ? [startISO, maxISO] : [startISO, end];
  }

  function firstMondayISO(minISO){
    const d = new Date(minISO+'T00:00:00Z');
    for(let k=0;k<14;k++){
      if(d.getUTCDay() === 1) return d.toISOString().slice(0,10);
      d.setUTCDate(d.getUTCDate()+1);
    }
    return minISO;
  }

  function renderHomeArrivalsChart(data){
    const chartEl = document.getElementById('home-arrivals-chart');
    if(!chartEl) return;
    if(!window.Plotly){
      chartEl.innerHTML = '<div class="muted">Plotly manquant (script non chargé).</div>';
      return;
    }
    if(!data || !data.dates || !data.dates.length){
      chartEl.innerHTML = '<div class="muted">Dépose un export Arrivals dans la zone 📈 pour afficher le graph.</div>';
      return;
    }

    const minISO = data.dates[0];
    const maxISO = data.dates[data.dates.length-1];
    const tick0  = firstMondayISO(minISO);

    // ✅ défaut = AU DÉBUT de la plage
    const range7d  = clampRangeFromStart(minISO, maxISO, 7);
    const range1m  = clampRangeFromStart(minISO, maxISO, 30);
    const range1y  = clampRangeFromStart(minISO, maxISO, 365);

    const traceInd = {
      x: data.dates,
      y: data.yInd,
      type: 'bar',
      name: 'Individuels',
      marker: { color: '#1f77b4' }
    };

    const traceGrp = {
      x: data.dates,
      y: data.yGrp,
      type: 'bar',
      name: 'Groupes',
      marker: { color: '#d62728' }
    };

    const layout = {
      barmode: 'stack',
      // ✅ on laisse de la place pour les boutons
      margin: { l: 60, r: 20, t: 46, b: 50 },
      height: 420,
      legend: { orientation: 'h' },
      dragmode: 'pan',
      xaxis: {
        type: 'date',
        tick0: tick0,
        dtick: 7 * 24 * 60 * 60 * 1000,
        tickformat: '%d/%m',
        tickangle: -45,

        // ✅ défaut 7 jours (début)
        range: range1m,

        minallowed: minISO,
        maxallowed: maxISO,
        rangeslider: { visible: true, thickness: 0.12 }
      },
      yaxis: {
        title: 'Arrivées (chambres)',
        rangemode: 'tozero'
      },

      // ✅ boutons bien alignés
      updatemenus: [{
        type: "buttons",
        direction: "right",
        x: 0,
        y: 1.12,
        xanchor: "left",
        yanchor: "top",
        pad: { r: 8, t: 0, b: 0, l: 0 },
        showactive: true,
        bgcolor: "rgba(255,255,255,0.9)",
        bordercolor: "rgba(0,0,0,0.15)",
        borderwidth: 1,
        font: { size: 12 },
        buttons: [
          { label: "7j",     method: "relayout", args: [{ "xaxis.range": range7d }] },
          { label: "1 mois", method: "relayout", args: [{ "xaxis.range": range1m }] },
          { label: "1 an",   method: "relayout", args: [{ "xaxis.range": range1y }] },
          { label: "Auto",   method: "relayout", args: [{ "xaxis.range": [minISO, maxISO] }] }
        ]
      }]
    };

    const config = {
      responsive: true,
      scrollZoom: true,
      displaylogo: false
    };

    window.Plotly.newPlot(chartEl, [traceInd, traceGrp], layout, config);
  }

  function initHomeStatsDropZone(){
    const dz = document.getElementById('drop-zone-stats');
    if(!dz) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.multiple = false;

    function readFile(file){
      const reader = new FileReader();
      reader.onload = (e)=>{
        const txt = e.target.result || '';
        localStorage.setItem(LS_HOME_STATS_SOURCE, String(txt));
        api().scheduleSaveState && api().scheduleSaveState("home stats import");
        const data = parseArrivalsIndivGroup(txt);
        renderHomeArrivalsChart(data);
        api().toast && api().toast('📈 Graph chargé');
      };
      reader.readAsText(file, 'utf-8');
    }

    dz.addEventListener('click', ()=>input.click());

    dz.addEventListener('dragover', (e)=>{
      e.preventDefault();
      dz.classList.add('drag-active');
    });
    dz.addEventListener('dragleave', ()=>{
      dz.classList.remove('drag-active');
    });
    dz.addEventListener('drop', (e)=>{
      e.preventDefault();
      dz.classList.remove('drag-active');
      const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) ? e.dataTransfer.files[0] : null;
      if(f) readFile(f);
    });

    input.addEventListener('change', (e)=>{
      const f = (e.target.files && e.target.files[0]) ? e.target.files[0] : null;
      if(f) readFile(f);
      input.value = '';
    });

    const saved = localStorage.getItem(LS_HOME_STATS_SOURCE);
    if(saved){
      const data = parseArrivalsIndivGroup(saved);
      renderHomeArrivalsChart(data);
    } else {
      renderHomeArrivalsChart(null);
    }
  }

  function boot(fromRuntime){
    setStamp();

    const todayEl = document.getElementById('todo-today');
    const weekEl  = document.getElementById('todo-week');

    const todoToday = PERSIST_TODAY
      ? getList(LS_TODO_TODAY, DEFAULT_TODAY, true)
      : (window.TODO?._runtimeToday || []);

    const todoWeek = PERSIST_WEEK
      ? getList(LS_TODO_WEEK, DEFAULT_WEEK, true)
      : (window.TODO?._runtimeWeek || []);

    renderTodo(todoToday, todayEl, LS_TODO_TODAY, PERSIST_TODAY, "Aucune détection pour l’instant.");
    renderTodo(todoWeek, weekEl, LS_TODO_WEEK, PERSIST_WEEK, "Aucune détection pour l’instant.");
    initHomeChecklist();
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    ensureGlobalAPI();
    boot(false);
    initHomeStatsDropZone();
  });

})();