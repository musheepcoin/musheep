// todo.module.js  (version "détections" + horodatage)
// - Focus: Aujourd'hui
// - Pas de defaults écrits par moi
// - Semaine ignorée pour l'instant (si le bloc existe, on peut le laisser vide)

(function () {
  const LS_TODO_TODAY = 'aar_todo_today_v1';
  const LS_TODO_WEEK  = 'aar_todo_week_v1';

  // ✅ Defaults vides (aucune liste inventée)
  const DEFAULT_TODAY = [];
  const DEFAULT_WEEK  = [];

  // ✅ Mode persistance des détections :
  // true  = l'utilisateur peut éditer / cocher et ça persiste
  // false = on affichera des détections "runtime" plus tard (non persistées)
  // Pour l'instant, je laisse TRUE car tu as déjà une UI editable/cochable.
  const PERSIST_TODAY = true;
  const PERSIST_WEEK  = true; // semaine laissée en place, mais pas prioritaire

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

  function setStamp(){
    const el = document.getElementById('today-stamp');
    if (!el) return;
    // Exemple: "Mardi 04/02/2026 — 2026-02-04"
    el.textContent = `${fmtFRWithDayLocal()} — ${todayKeyLocal()}`;
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
  function renderTodo(list, el, storageKey, persist){
    if (!el) return;
    el.innerHTML = '';

    if (!list.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = "Aucune détection pour l’instant.";
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

      const input = document.createElement('input');
      input.type = 'text';
      input.value = item.text || '';
      input.readOnly = false; // tu peux le mettre à true si tu veux "détections non éditables"
      input.oninput = () => {
        list[i].text = input.value;
        saveList(storageKey, list, "todo edit", persist);
      };

      row.append(cb, input);
      el.appendChild(row);
    });
  }

  // ---------- API future : pousser des détections runtime ----------
  // Plus tard tes détecteurs appelleront :
  // window.TODO.pushToday([{text:"...", done:false}, ...])
  function ensureGlobalAPI(){
    window.TODO = window.TODO || {};
    window.TODO._runtimeToday = window.TODO._runtimeToday || [];
    window.TODO._runtimeWeek  = window.TODO._runtimeWeek  || [];

    window.TODO.setToday = (items)=>{
      window.TODO._runtimeToday = Array.isArray(items) ? items : [];
      // si on est en mode non-persist, on re-render sur runtime
      if (!PERSIST_TODAY) boot(true);
    };

    window.TODO.setWeek = (items)=>{
      window.TODO._runtimeWeek = Array.isArray(items) ? items : [];
      if (!PERSIST_WEEK) boot(true);
    };
  }

  
  /* =========================================================
     HOME ARRIVALS GRAPH (drop-zone-stats + Plotly)
     - source stored in localStorage so the graph persists after reload
     ========================================================= */
  const LS_HOME_STATS_SOURCE = 'aar_home_arrivals_source_v1';

  function splitCsvLine(line){
    const out = [];
    let cur = '';
    let inQ = false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      if(ch === '"'){
        if(inQ && line[i+1] === '"'){ cur += '"'; i++; }
        else inQ = !inQ;
      } else if(ch === ',' && !inQ){
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
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
    const lines = String(text || '').replace(/\r/g,'').split('\n').filter(l=>l.trim()!=='');
    if(!lines.length) return null;

    // Find header line (some exports can start with garbage)
    let headerIdx = -1;
    for(let i=0;i<Math.min(lines.length, 50); i++){
      const L = lines[i];
      if(L.includes('PSER_DATE') && L.includes('NB_RESA') && L.includes('ROOM_NUM')){
        headerIdx = i; break;
      }
    }
    if(headerIdx === -1) return null;

    const header = splitCsvLine(lines[headerIdx]).map(s=>String(s||'').trim());
    const idxDate = header.indexOf('PSER_DATE');
    const idxNb   = header.indexOf('NB_RESA');
    const idxRoom = header.indexOf('ROOM_NUM');
    if(idxDate === -1 || idxNb === -1 || idxRoom === -1) return null;

    const mapInd = new Map();
    const mapGrp = new Map();

    for(let i=headerIdx+1;i<lines.length;i++){
      const row = splitCsvLine(lines[i]);
      if(row.length < Math.max(idxDate, idxNb, idxRoom)+1) continue;

      const iso = parseFRDateToISO(row[idxDate]);
      if(!iso) continue;

      const roomNum = String(row[idxRoom] || '').trim();
      const isInd = /^ind\b/i.test(roomNum);
      const isGrp = /^grp\b/i.test(roomNum);

      let n = parseInt(String(row[idxNb]||'').trim(), 10);
      if(!Number.isFinite(n) || n<=0) n = 1;

      if(isGrp){
        mapGrp.set(iso, (mapGrp.get(iso)||0) + n);
      } else {
        // default -> Ind (safer for ambiguous lines)
        mapInd.set(iso, (mapInd.get(iso)||0) + n);
      }
    }

    const allDates = Array.from(new Set([...mapInd.keys(), ...mapGrp.keys()])).sort();
    if(!allDates.length) return null;

    const yInd = allDates.map(d=>mapInd.get(d)||0);
    const yGrp = allDates.map(d=>mapGrp.get(d)||0);

    return { dates: allDates, yInd, yGrp };
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

    const traceInd = {
      x: data.dates,
      y: data.yInd,
      mode: 'lines+markers',
      name: 'Individuels',
      line: { color: '#1f77b4', width: 3 }
    };

    const traceGrp = {
      x: data.dates,
      y: data.yGrp,
      mode: 'lines+markers',
      name: 'Groupes',
      line: { color: '#d62728', width: 3 }
    };

    const layout = {
      margin: { l: 60, r: 20, t: 10, b: 50 },
      height: 420,
      legend: { orientation: 'h' },
      dragmode: 'pan',
      xaxis: {
        type: 'date',
        tick0: tick0,
        dtick: 7 * 24 * 60 * 60 * 1000,
        tickformat: '%d/%m',
        tickangle: -45,
        range: [minISO, maxISO],
        minallowed: minISO,
        maxallowed: maxISO,
        rangeslider: { visible: true, thickness: 0.12 }
      },
      yaxis: {
        title: 'Arrivées (chambres)',
        rangemode: 'tozero'
      }
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

    // Aujourd'hui : soit persisté (localStorage), soit runtime
    const todoToday = PERSIST_TODAY
      ? getList(LS_TODO_TODAY, DEFAULT_TODAY, true)
      : (window.TODO?._runtimeToday || []);

    // Semaine : on la garde mais on s’en fout pour l’instant
    const todoWeek = PERSIST_WEEK
      ? getList(LS_TODO_WEEK, DEFAULT_WEEK, true)
      : (window.TODO?._runtimeWeek || []);

    renderTodo(todoToday, todayEl, LS_TODO_TODAY, PERSIST_TODAY);
    // On affiche la semaine uniquement si le conteneur existe (sinon osef)
    renderTodo(todoWeek, weekEl, LS_TODO_WEEK, PERSIST_WEEK);
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    ensureGlobalAPI();
    boot(false);
    initHomeStatsDropZone();
  });

})();
