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
  });

})();
