/* dd.module.js  — DD (ex-GDV) — version dark, intégration AAR
   - Reprend EXACTEMENT la logique de gdv_test.html
   - ✅ Ajout: multi-sociétés (liste éditable) via #dd-company + boutons (dans index.html)
   - ✅ LocalStorage: base LS_BASE + suffixe ::companyId (isolation par société)
   - UI dark isolée via Shadow DOM (zéro conflit avec AAR)
   - Lazy: rien ne s’exécute tant que DD.mount(...) / DD.init(...) n’est pas appelé
*/

(function () {
  'use strict';

  /* ===================== MULTI-SOCIÉTÉS (UI outside shadow) ===================== */

  // Base key (ancienne LS_KEY), maintenant suffixée par société
  const LS_BASE = "gdv_reconcile_v6_merge_import_stable_ids_k4_totalttc";

  // Liste des sociétés + sélection
  const LS_COMPANIES = "dd_companies_v1";
  const LS_COMPANY_SELECTED = "dd_company_selected_v1";

  function safeJsonParse(raw, fallback) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function slugifyCompany(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "societe";
  }

  function loadCompanies() {
    const raw = localStorage.getItem(LS_COMPANIES);
    const arr = safeJsonParse(raw, null);
    if (Array.isArray(arr) && arr.length && arr.every(x => x && typeof x.id === "string" && typeof x.name === "string")) {
      return arr;
    }
    // defaults minimal (tu peux les éditer dans l’UI)
    return [{ id: "accor_default", name: "Accor (défaut)" }];
  }

  function saveCompanies(list) {
    localStorage.setItem(LS_COMPANIES, JSON.stringify(list));
  }

  function getSelectedCompanyId() {
    const list = loadCompanies();
    const raw = localStorage.getItem(LS_COMPANY_SELECTED);
    if (raw && list.some(x => x.id === raw)) return raw;
    return list[0]?.id || "accor_default";
  }

  function setSelectedCompanyId(id) {
    localStorage.setItem(LS_COMPANY_SELECTED, id);
  }

  function getLSKey() {
    return `${LS_BASE}::${getSelectedCompanyId()}`;
  }

  // Bind UI si présent dans le DOM principal (index.html)
  function refreshCompanySelectUI() {
    const sel = document.getElementById("dd-company");
    if (!sel) return false;

    const list = loadCompanies();
    const selected = getSelectedCompanyId();

    sel.innerHTML = "";
    for (const c of list) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    }

    sel.value = list.some(x => x.id === selected) ? selected : (list[0]?.id || "accor_default");
    setSelectedCompanyId(sel.value);
    return true;
  }

  function bindCompaniesUI({ onCompanyChanged }) {
    const sel = document.getElementById("dd-company");
    const btnAdd = document.getElementById("dd-company-add");
    const btnRen = document.getElementById("dd-company-rename");
    const btnDel = document.getElementById("dd-company-del");

    if (!sel || !btnAdd || !btnRen || !btnDel) return false;

    refreshCompanySelectUI();

    sel.addEventListener("change", () => {
      setSelectedCompanyId(sel.value);
      onCompanyChanged && onCompanyChanged();
    });

    btnAdd.addEventListener("click", () => {
      const name = prompt("Nom de la société ?");
      if (!name) return;
      const list = loadCompanies();

      let base = slugifyCompany(name);
      let id = base;
      let i = 2;
      while (list.some(x => x.id === id)) id = `${base}_${i++}`;

      list.push({ id, name: name.trim() });
      saveCompanies(list);
      setSelectedCompanyId(id);
      refreshCompanySelectUI();
      onCompanyChanged && onCompanyChanged();
    });

    btnRen.addEventListener("click", () => {
      const list = loadCompanies();
      const id = getSelectedCompanyId();
      const cur = list.find(x => x.id === id);
      if (!cur) return;
      const name = prompt("Nouveau nom :", cur.name);
      if (!name) return;
      cur.name = name.trim();
      saveCompanies(list);
      refreshCompanySelectUI();
      // pas besoin de reload DD : seul le label change
    });

    btnDel.addEventListener("click", () => {
      const list = loadCompanies();
      if (list.length <= 1) {
        alert("Impossible : il faut garder au moins 1 société.");
        return;
      }
      const id = getSelectedCompanyId();
      const cur = list.find(x => x.id === id);
      if (!cur) return;

      if (!confirm(`Supprimer la société "${cur.name}" ?\n(Ça supprime l'entrée de la liste. Les données DD stockées sous cette société restent dans le navigateur.)`)) return;

      const next = list.filter(x => x.id !== id);
      saveCompanies(next);
      setSelectedCompanyId(next[0].id);
      refreshCompanySelectUI();
      onCompanyChanged && onCompanyChanged();
    });

    return true;
  }

  /* ===================== XLSX loader ===================== */

  const XLSX_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

  function ensureXLSX() {
    if (typeof window.XLSX !== "undefined") return Promise.resolve(true);

    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-dd-xlsx="1"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => reject(new Error("XLSX load error")), { once: true });
        return;
      }

      const s = document.createElement("script");
      s.src = XLSX_CDN;
      s.async = true;
      s.dataset.ddXlsx = "1";
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("XLSX load error"));
      document.head.appendChild(s);
    });
  }

  /* ===================== UI template (inchangé) ===================== */

  const TEMPLATE_HTML = `
  <style>
    :root{
      --bg:#0b0f14; --card:#121826; --card2:#0f1626;
      --line:#22314a; --muted:#93a8bf; --text:#e9f1fb;
      --ok:#2ecc71; --warn:#f1c40f; --bad:#e74c3c; --info:#5dade2;
      --shadow: 0 10px 34px rgba(0,0,0,.30);
      --r:16px;
    }
    *{box-sizing:border-box}
    :host{display:block}
    .dd-root{
      margin:0;
      font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
      background: radial-gradient(1200px 600px at 20% -10%, rgba(93,173,226,.18), transparent 60%),
                  radial-gradient(900px 500px at 90% 0%, rgba(46,204,113,.12), transparent 55%),
                  linear-gradient(180deg,#070a0f 0%,#0b0f14 100%);
      color:var(--text);
      border-radius:16px;
      overflow:hidden;
    }
    header{
      max-width:1200px; margin:0 auto; padding:16px 18px 10px;
      display:flex; gap:12px; align-items:center; flex-wrap:wrap;
    }
    header h1{margin:0; font-size:16px; letter-spacing:.2px}
    .badge{
      font-size:12px; color:var(--muted);
      padding:4px 10px; border:1px solid var(--line);
      border-radius:999px; background:rgba(255,255,255,.03);
    }
    .pill{
      display:inline-flex; align-items:center; gap:8px;
      padding:7px 10px; border-radius:999px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.02);
      color:var(--muted); font-size:12px;
    }
    .dot{width:10px; height:10px; border-radius:50%;}
    .dot.ok{background:var(--ok)}
    .dot.warn{background:var(--warn)}
    .dot.bad{background:var(--bad)}
    .dot.info{background:var(--info)}

    .wrap{max-width:1200px; margin:0 auto; padding:0 18px 22px;}
    .grid{display:grid; gap:12px; grid-template-columns: 1.2fr .8fr;}
    @media(max-width:980px){ .grid{grid-template-columns:1fr} }

    .card{
      background:rgba(18,24,38,.88);
      border:1px solid rgba(34,49,74,.95);
      border-radius:var(--r);
      box-shadow:var(--shadow);
      padding:14px;
    }
    .card.alt{background:rgba(15,22,38,.90)}
    .row{display:flex; gap:10px; align-items:center; flex-wrap:wrap}
    label{font-size:12px; color:var(--muted)}
    input[type="file"], select, input[type="text"]{
      width:100%;
      background:rgba(255,255,255,.03);
      border:1px solid var(--line);
      padding:10px 10px;
      border-radius:12px;
      color:var(--text);
      outline:none;
    }
    input::placeholder{color:rgba(147,168,191,.65)}
    select:disabled{opacity:.5}

    select option{ background-color:#0f1626; color:#e9f1fb; }
    select option:checked{ background-color:#223154; color:#e9f1fb; }

    .btn{
      border:1px solid var(--line);
      background:linear-gradient(180deg,#1d2a44 0%, #152037 100%);
      padding:10px 12px; border-radius:12px; color:var(--text);
      cursor:pointer; user-select:none;
    }
    .btn:hover{filter:brightness(1.06)}
    .btn.secondary{background:linear-gradient(180deg,#223154 0%, #1a2745 100%)}
    .btn.danger{background:linear-gradient(180deg,#3a1720 0%, #2b1117 100%); border-color:#5b2431}
    .btn.good{background:linear-gradient(180deg,#173a2a 0%, #11281f 100%); border-color:#2c6b4d}
    .btn:disabled{opacity:.45; cursor:not-allowed; filter:none}

    .stats{display:grid; gap:10px; grid-template-columns: repeat(3, 1fr); margin-top:10px}
    @media(max-width:520px){ .stats{grid-template-columns:1fr} }
    .stat{
      border:1px solid var(--line);
      border-radius:12px;
      padding:10px;
      background:rgba(255,255,255,.02);
    }
    .stat .k{font-size:12px; color:var(--muted)}
    .stat .v{font-size:18px; margin-top:4px}
    .stat .v small{font-size:12px; color:var(--muted)}
    .stat.month{
      border:1px solid rgba(80,160,255,.35);
      background:linear-gradient(180deg, rgba(20,40,70,.55), rgba(10,20,35,.55));
    }
    .stat.month .k{font-weight:700; color:#8fb7ff}
    .stat.month .v{font-size:20px; font-weight:800}
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace}

    .chipsWrap{
      margin-top:12px;
      border:1px solid rgba(34,49,74,.75);
      background:rgba(0,0,0,.18);
      border-radius:14px;
      padding:10px;
      min-height:220px;
      max-height:560px;
      overflow:auto;
    }
    .chipsGrid{display:flex; flex-direction:column; gap:10px;}
    .chip{
      display:flex;
      justify-content:space-between;
      gap:10px; align-items:stretch;
      width:100%;
      max-width: none;
      padding:10px 10px;
      border-radius:14px;
      border:1px solid rgba(34,49,74,.9);
      background:linear-gradient(180deg, rgba(22,32,56,.95) 0%, rgba(15,26,51,.92) 100%);
      box-shadow: 0 6px 18px rgba(0,0,0,.25);
    }
    .chipMain{display:flex; gap:10px; align-items:flex-start; min-width:0; flex:1;}
    .chipText{min-width:220px; flex:1; min-width:0;}
    .chipInvoice{
      min-width:120px;
      padding-left:12px;
      margin-left:12px;
      border-left:1px solid rgba(63,224,153,.22);
      text-align:right;
      display:flex;
      flex-direction:column;
      justify-content:center;
      gap:4px;
    }
    .chipInvoice .k{font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em}
    .chipInvoice .v{font-size:14px; font-weight:800; color:#3fe099}
    .chip.sameGroup{margin-top:2px;}
    .chip.used{
      opacity:.70;
      border-color: rgba(46,204,113,.45);
      background:linear-gradient(180deg, rgba(17,40,31,.92) 0%, rgba(12,30,22,.88) 100%);
    }
    .chip .amt{
      min-width:92px;
      font-weight:800;
      font-size:13px;
      text-align:right;
      padding-top:2px;
    }
    .chip .lib{
      font-size:12px;
      color:rgba(233,241,251,.92);
      line-height:1.25;
      word-break:break-word;
    }
    .chip .meta{
      margin-top:4px;
      font-size:11px;
      color:rgba(147,168,191,.80);
    }
    .chip .tag{
      margin-top:6px;
      display:inline-flex; align-items:center; gap:7px;
      font-size:11px;
      color:var(--muted);
    }
    .chip .tag .miniDot{
      width:8px; height:8px; border-radius:50%;
      background:var(--warn);
    }
    .chip.used .tag .miniDot{background:var(--ok)}
    .chip.active{
      outline:2px solid rgba(93,173,226,.55);
      outline-offset:1px;
    }

    .small{font-size:12px}
    .muted{color:var(--muted)}
    .hr{height:1px; background:rgba(34,49,74,.8); margin:12px 0}

    .debug{
      width:100%; height:180px; resize:vertical;
      background:rgba(0,0,0,.25);
      border:1px solid var(--line);
      border-radius:12px;
      padding:10px;
      color:var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size:12px;
      outline:none;
    }

    .solutions{
      margin-top:10px;
      border:1px solid rgba(34,49,74,.75);
      border-radius:14px;
      padding:10px;
      background:rgba(0,0,0,.15);
    }
    .solRow{
      display:flex; justify-content:space-between; gap:10px; align-items:flex-start;
      padding:10px;
      border:1px solid rgba(34,49,74,.6);
      border-radius:12px;
      background:rgba(255,255,255,.02);
      margin-top:8px;
    }
    .solRow.active{
      outline:2px solid rgba(241,196,15,.35);
      outline-offset:1px;
    }
    .solLeft{display:flex; flex-direction:column; gap:6px}
    .solTitle{font-size:12px; color:rgba(233,241,251,.90)}
    .solMeta{font-size:11px; color:rgba(147,168,191,.85)}
    .solAmt{font-weight:800; text-align:right; min-width:110px}

    .daysPanel{
      margin-top:12px;
      border:1px solid rgba(34,49,74,.75);
      border-radius:14px;
      background:rgba(0,0,0,.12);
      overflow:hidden;
      flex: 1 1 auto;
      min-height: 420px;
      display:flex;
      flex-direction:column;
    }
    .daysHead{
      display:flex; justify-content:space-between; align-items:center;
      padding:10px 10px;
      border-bottom:1px solid rgba(34,49,74,.65);
    }
    .daysTitle{font-weight:700}
    .daysHint{font-size:12px; color:var(--muted)}
    .daysList{
      flex: 1 1 auto;
      overflow:auto;
      padding:8px;
      display:flex; flex-direction:column; gap:8px;
      min-height: 280px;
    }
    .dayRow{
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      border:1px solid rgba(34,49,74,.6);
      border-radius:12px;
      padding:10px;
      background:rgba(255,255,255,.02);
      cursor:pointer;
      user-select:none;
    }
    .dayRow:hover{filter:brightness(1.06)}
    .dayRow.active{
      outline:2px solid rgba(93,173,226,.45);
      outline-offset:1px;
    }
    .dayLeft{display:flex; flex-direction:column; gap:4px}
    .dayDate{font-weight:700}
    .dayMeta{font-size:11px; color:rgba(147,168,191,.85)}
    .dayRight{display:flex; align-items:center; gap:10px}
    .status{
      min-width:28px;
      height:28px;
      display:flex; align-items:center; justify-content:center;
      border-radius:10px;
      border:1px solid rgba(34,49,74,.7);
      font-weight:900;
    }
    .status.ok{background:rgba(46,204,113,.15); border-color:rgba(46,204,113,.45); color:var(--ok)}
    .status.warn{background:rgba(241,196,15,.12); border-color:rgba(241,196,15,.40); color:var(--warn)}
    .status.idle{background:rgba(255,255,255,.03); border-color:rgba(34,49,74,.65); color:rgba(147,168,191,.85)}
    .status.bad{background:rgba(231,76,60,.12); border-color:rgba(231,76,60,.45); color:var(--bad)}
    .miniBar{
      width:120px; height:10px; border-radius:999px;
      border:1px solid rgba(34,49,74,.7);
      background:rgba(0,0,0,.18);
      overflow:hidden;
    }
    .miniFill{
      height:100%;
      width:0%;
      background:linear-gradient(90deg, rgba(93,173,226,.35), rgba(46,204,113,.35));
    }

    .hint{font-size:12px; color:var(--muted); margin-top:8px; line-height:1.35}
    .rightStack{display:flex; flex-direction:column; min-height: 100%;}
  </style>

  <div class="dd-root">
    <header>
      <h1>DD — Réconciliation intelligente (Total TTC, 1→4 lignes)</h1>
      <span class="badge">Match 1/2/3/4 lignes • tol ±0,01€ • chips non destructives • cycle • lock • undo • persistant • merge import</span>
      <span id="pill" class="pill"><span class="dot info"></span><span>Prêt</span></span>
    </header>

    <div class="wrap">
      <div class="grid">
        <!-- LEFT -->
        <section class="card">
          <div class="row" style="width:100%">
            <div style="flex:1; min-width:260px">
              <label>Importer export GDV FOLS (.xls / .xlsx)</label>
              <input id="file" type="file" accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"/>
              <div class="hint"><b>Montant utilisé :</b> colonne <b>Total TTC</b> (pas P.U TTC).</div>
            </div>

            <div style="min-width:220px">
              <label>Jour</label>
              <select id="day" disabled></select>
            </div>

            <div style="min-width:220px">
              <label>Filtre (libellé)</label>
              <input id="filter" type="text" placeholder="ex: restaurant, midi, CB, AMEX..."/>
            </div>

            <div class="row" style="align-self:flex-end">
              <button class="btn secondary" id="btnReparse">Reparser</button>
              <button class="btn danger" id="btnReset">Reset</button>
            </div>
          </div>

          <div class="stats">
            <div class="stat month">
              <div class="k">Total mois</div>
              <div class="v"><span id="mTotal">0</span> <small>€</small></div>
            </div>
            <div class="stat month">
              <div class="k">Utilisé mois (verrouillé)</div>
              <div class="v"><span id="mUsed">0</span> <small>€</small></div>
            </div>
            <div class="stat month">
              <div class="k">Restant mois</div>
              <div class="v"><span id="mRem">0</span> <small>€</small></div>
            </div>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="k">Total jour</div>
              <div class="v"><span id="tTotal">0</span> <small>€</small></div>
            </div>
            <div class="stat">
              <div class="k">Utilisé (verrouillé)</div>
              <div class="v"><span id="tUsed">0</span> <small>€</small></div>
            </div>
            <div class="stat">
              <div class="k">Restant</div>
              <div class="v"><span id="tRem">0</span> <small>€</small></div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="row" style="justify-content:space-between">
            <div class="pill"><span class="dot warn"></span><span>Chips libres</span></div>
            <div class="pill"><span class="dot ok"></span><span>Chips verrouillées</span></div>
            <div class="pill"><span class="dot info"></span><span>Toujours visibles</span></div>
          </div>

          <div class="chipsWrap">
            <div id="chips" class="chipsGrid"></div>
          </div>

          <div class="hr"></div>
          <div class="muted small">Debug (aperçu 30 premières lignes raw)</div>
          <textarea id="debug" class="debug" readonly spellcheck="false"></textarea>
        </section>

        <!-- RIGHT -->
        <aside class="card alt rightStack">
          <div class="row" style="justify-content:space-between">
            <div>
              <div style="font-weight:700">Moteur de matching facture</div>
              <div class="muted small">Exact puis k-sum (jusqu’à 4 lignes), tolérance ±0,01€</div>
            </div>
            <span class="badge mono" id="sheetName">—</span>
          </div>

          <div class="hr"></div>

          <div class="row" style="width:100%">
            <div style="flex:1; min-width:220px">
              <label>Montant facture (TTC)</label>
              <input id="invoice" type="text" inputmode="decimal" placeholder="ex: 95,92"/>
              <div class="hint">Tape “95.92” ou “95,92”.</div>
            </div>
            <div class="row" style="align-self:flex-end">
              <button class="btn" id="btnFind">Chercher</button>
              <button class="btn secondary" id="btnCycle" disabled>Cycler</button>
              <button class="btn good" id="btnLock" disabled>Confirmer (verrouiller)</button>
              <button class="btn danger" id="btnUndo" disabled>Undo</button>
            </div>
          </div>

          <div class="solutions">
            <div class="muted small">
              Résultats : <span id="solCount">0</span> solution(s) •
              Active : <span id="solIdx">—</span>
            </div>
            <div id="solList"></div>
            <div class="hint">
              Les solutions portent uniquement sur les <b>chips libres</b>. Verrouiller = marquer utilisées, sans les enlever.
            </div>
          </div>

          <div class="daysPanel">
            <div class="daysHead">
              <div>
                <div class="daysTitle">Jours détectés</div>
                <div class="daysHint">✅ complet • 🟡 en cours • — non commencé • ! anomalie</div>
              </div>
              <span class="badge mono" id="daysCount">0</span>
            </div>
            <div class="daysList" id="daysList"></div>
          </div>

          <div class="hint">
            Clique un jour ici pour basculer directement (même effet que le select).
          </div>
        </aside>
      </div>
    </div>
  </div>
  `;

  /* ===================== Runtime (gdv logic, shadow scoped) ===================== */

  function createRuntime(shadowRoot) {
    const state = {
      lines: [],
      linesById: {},
      usedByDay: {},
      history: [],
      lockMetaById: {},
      ctx: null,
      days: [],
      selectedDay: null,
      filter: "",
      sheetName: "—",
      lastArrayBuffer: null,
      amtHeaderChosen: null
    };

    function loadState() {
      try {
        const raw = localStorage.getItem(getLSKey());
        if (!raw) return;
        const s = JSON.parse(raw);
        state.lines = Array.isArray(s.lines) ? s.lines : [];
        state.linesById = s.linesById && typeof s.linesById === "object" ? s.linesById : {};
        state.usedByDay = s.usedByDay && typeof s.usedByDay === "object" ? s.usedByDay : {};
        state.history = Array.isArray(s.history) ? s.history : [];
        state.lockMetaById = s.lockMetaById && typeof s.lockMetaById === "object" ? s.lockMetaById : {};
        state.ctx = s.ctx && typeof s.ctx === "object" ? s.ctx : null;
        state.selectedDay = typeof s.selectedDay === "string" ? s.selectedDay : null;
        state.filter = typeof s.filter === "string" ? s.filter : "";
        state.sheetName = typeof s.sheetName === "string" ? s.sheetName : "—";
        state.amtHeaderChosen = typeof s.amtHeaderChosen === "string" ? s.amtHeaderChosen : null;
      } catch (e) { console.warn(e); }
    }

    function saveState() {
      localStorage.setItem(getLSKey(), JSON.stringify({
        lines: state.lines,
        linesById: state.linesById,
        usedByDay: state.usedByDay,
        history: state.history,
        lockMetaById: state.lockMetaById,
        ctx: state.ctx,
        selectedDay: state.selectedDay,
        filter: state.filter,
        sheetName: state.sheetName,
        amtHeaderChosen: state.amtHeaderChosen
      }));
    }

    // DOM (shadow-scoped)
    const $ = (sel) => shadowRoot.querySelector(sel);

    const elPill = $("#pill");
    const elFile = $("#file");
    const elDay = $("#day");
    const elFilter = $("#filter");
    const elChips = $("#chips");
    const elDebug = $("#debug");
    const elSheet = $("#sheetName");

    const elTotal = $("#tTotal");
    const elUsed = $("#tUsed");
    const elRem = $("#tRem");
    const elMonthTotal = $("#mTotal");
    const elMonthUsed = $("#mUsed");
    const elMonthRem = $("#mRem");

    const elInvoice = $("#invoice");
    const elBtnFind = $("#btnFind");
    const elBtnCycle = $("#btnCycle");
    const elBtnLock = $("#btnLock");
    const elBtnUndo = $("#btnUndo");
    const elBtnReparse = $("#btnReparse");
    const elBtnReset = $("#btnReset");

    const elSolCount = $("#solCount");
    const elSolIdx = $("#solIdx");
    const elSolList = $("#solList");

    const elDaysList = $("#daysList");
    const elDaysCount = $("#daysCount");

    function setPill(level, text) {
      const dot = elPill.querySelector(".dot");
      const span = elPill.querySelector("span:last-child");
      dot.className = "dot " + (level || "info");
      span.textContent = text || "";
    }

    function escapeHtml(s) {
      return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
    function norm(s) {
      return String(s ?? "")
        .trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    function centsToEuro(c) {
      const n = (c ?? 0) / 100;
      return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
    }
    function parseMoneyToCents(v) {
      if (v == null) return null;
      if (typeof v === "number" && isFinite(v)) return Math.round(v * 100);
      let s = String(v).trim();
      if (!s) return null;
      s = s.replace(/\s/g, '').replace(/[€]/g, '');
      if (s.includes(",") && s.includes(".")) {
        const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
        if (lc > ld) s = s.replace(/\./g, '').replace(',', '.');
        else s = s.replace(/,/g, '');
      } else {
        s = s.replace(',', '.');
      }
      const n = Number(s);
      if (!isFinite(n)) return null;
      return Math.round(n * 100);
    }
    function formatYMD(y, m, d) {
      return String(y).padStart(4, '0') + "-" + String(m).padStart(2, '0') + "-" + String(d).padStart(2, '0');
    }
    function normalizeDate(v) {
      if (v == null) return null;
      if (typeof v === "number" && isFinite(v)) {
        const d = window.XLSX?.SSF?.parse_date_code(v);
        if (d && d.y && d.m && d.d) return formatYMD(d.y, d.m, d.d);
      }
      if (v instanceof Date && !isNaN(v.getTime())) {
        return formatYMD(v.getFullYear(), v.getMonth() + 1, v.getDate());
      }
      const s = String(v).trim();
      if (!s) return null;
      let m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
      if (m) {
        let dd = +m[1], mm = +m[2], yy = +m[3];
        if (yy < 100) yy = 2000 + yy;
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) return formatYMD(yy, mm, dd);
      }
      m = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
      if (m) {
        const yy = +m[1], mm = +m[2], dd = +m[3];
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) return formatYMD(yy, mm, dd);
      }
      return null;
    }

    function usedMapForDay(day) {
      if (!state.usedByDay[day]) state.usedByDay[day] = {};
      return state.usedByDay[day];
    }

    function getLockMeta(id) {
      return state.lockMetaById?.[id] || null;
    }

    function setLockMeta(id, meta) {
      if (!state.lockMetaById || typeof state.lockMetaById !== "object") state.lockMetaById = {};
      state.lockMetaById[id] = meta;
    }

    function clearLockMeta(id) {
      if (state.lockMetaById && state.lockMetaById[id]) delete state.lockMetaById[id];
    }

    function makeLockGroupId(day, targetCents) {
      return `lock_${day}_${targetCents}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function rebuildIndex() {
      state.linesById = {};
      for (const ln of state.lines) state.linesById[ln.id] = ln;
      state.days = Array.from(new Set(state.lines.map(x => x.date))).sort();
      if (state.selectedDay && state.days.includes(state.selectedDay)) { /* keep */ }
      else state.selectedDay = state.days[0] || null;
    }

    // FNV-1a IDs stables
    function fnv1a(str) {
      let h = 0x811c9dc5;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return (h >>> 0).toString(16);
    }
    function makeStableId(date, amountCents, prestation) {
      const sig = `${date}|${amountCents}|${norm(prestation)}`;
      return "S" + fnv1a(sig);
    }

    function amtScore(headerCell) {
      const x = norm(headerCell);
      if (x.includes("total") && x.includes("ttc")) return 100;
      if ((x.includes("p.u") || x.includes("pu")) && x.includes("ttc")) return 10;
      if (x.includes("total")) return 60;
      if (x.includes("montant") || x.includes("somme") || x.includes("valeur")) return 40;
      if (x.includes("ttc")) return 30;
      return 0;
    }

    function debugPreview(rows) {
      elDebug.value = rows.slice(0, 30).map(r => (r || []).map(x => String(x ?? "")).join(" | ")).join("\n") || "(vide)";
    }

    function ingestRows(rows) {
      const maxScan = Math.min(rows.length, 150);
      const isDateHeader = (x) => { x = norm(x); return x === "date" || x.includes("date"); };
      const isPrestHeader = (x) => {
        x = norm(x);
        return x.includes("prestation") || x.includes("libelle") || x.includes("designation") || x.includes("detail") || x.includes("motif");
      };

      let headerRow = -1, idxDate = -1, idxPrest = -1, idxAmt = -1;

      for (let i = 0; i < maxScan; i++) {
        const r = rows[i] || [];
        const h = r.map(norm);
        const d = h.findIndex(isDateHeader);
        const p = h.findIndex(isPrestHeader);

        let bestA = -1, bestScore = 0;
        for (let k = 0; k < h.length; k++) {
          const sc = amtScore(h[k]);
          if (sc > bestScore) { bestScore = sc; bestA = k; }
        }
        const a = bestA;

        if (d >= 0 && a >= 0) {
          headerRow = i;
          idxDate = d;
          idxPrest = p;
          idxAmt = a;
          state.amtHeaderChosen = String((rows[i] || [])[idxAmt] ?? "");
          break;
        }
      }

      const lines = [];
      let currentDate = null;

      if (headerRow >= 0) {
        const headers = (rows[headerRow] || []).map(norm);
        const isPU = headers[idxAmt]?.includes("p.u") || headers[idxAmt]?.includes("pu");
        if (isPU) {
          const j = headers.findIndex(h => h.includes("total") && h.includes("ttc"));
          if (j >= 0) {
            idxAmt = j;
            state.amtHeaderChosen = String((rows[headerRow] || [])[idxAmt] ?? "");
          }
        }

        for (let i = headerRow + 1; i < rows.length; i++) {
          const r = rows[i] || [];
          const d = normalizeDate(r[idxDate]);
          if (d) currentDate = d;
          const date = d || currentDate;
          if (!date) continue;

          const cents = parseMoneyToCents(r[idxAmt]);
          if (cents == null) continue;

          let prest = "";
          if (idxPrest >= 0) prest = String(r[idxPrest] ?? "").trim();
          if (!prest) {
            prest = (r || []).filter(x => typeof x === "string" && x.trim().length >= 3).map(x => x.trim()).join(" ");
          }
          const pnorm = norm(prest);
          if (pnorm.includes("total") && (pnorm.includes("jour") || pnorm.includes("general"))) continue;

          const id = makeStableId(date, cents, prest || "");
          lines.push({ id, date, prestation: prest || "", amountCents: cents });
        }
        if (lines.length) return lines;
      }

      // fallback structural
      currentDate = null;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] || [];
        let foundDate = null;
        const amounts = [];
        const texts = [];
        for (const cell of r) {
          const d = normalizeDate(cell);
          if (d) foundDate = d;
          const c = parseMoneyToCents(cell);
          if (c != null && Math.abs(c) > 0 && Math.abs(c) < 10000000) amounts.push(c);
          if (typeof cell === "string" && cell.trim().length >= 3) texts.push(cell.trim());
        }
        if (foundDate) currentDate = foundDate;
        const date = foundDate || currentDate;
        if (!date || !amounts.length) continue;

        const cents = amounts[amounts.length - 1];
        const prest = texts.join(" ");
        if (norm(prest).includes("date") && norm(prest).includes("ttc")) continue;

        const id = makeStableId(date, cents, prest || "");
        lines.push({ id, date, prestation: prest, amountCents: cents });
      }
      state.amtHeaderChosen = "(fallback structure)";
      return lines;
    }

    function parseArrayBuffer(ab, { merge = true } = {}) {
      if (typeof window.XLSX === "undefined") {
        setPill("bad", "XLSX non chargé");
        alert("Librairie XLSX non chargée (CDN bloqué/offline).");
        return;
      }
      try {
        const oldUsedByDay = merge ? (state.usedByDay || {}) : {};
        const oldHistory = merge ? (state.history || []) : [];

        const wb = window.XLSX.read(ab, { type: "array" });
        let ws = null, picked = wb.SheetNames[0];
        for (const name of wb.SheetNames) {
          const candidate = wb.Sheets[name];
          const preview = window.XLSX.utils.sheet_to_json(candidate, { header: 1, raw: true, range: 0 });
          if (preview && preview.length > 3) { ws = candidate; picked = name; break; }
        }
        ws = ws || wb.Sheets[picked];
        state.sheetName = picked || "—";
        elSheet.textContent = state.sheetName;

        const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
        debugPreview(rows);

        const lines = ingestRows(rows);
        if (!lines.length) {
          setPill("bad", "0 ligne exploitable");
          alert("0 ligne exploitable (date + Total TTC). Regarde Debug.");
          return;
        }

        state.lines = lines;
        rebuildIndex();

        if (!merge) {
          state.usedByDay = {};
          state.history = [];
          state.ctx = null;
          saveState();
          rebuildDaySelect();
          renderAll();
          setPill("ok", "Import OK — montant=" + (state.amtHeaderChosen || "Total TTC"));
          return;
        }

        // Merge usedByDay: garder uniquement les verrous dont l'id existe encore
        const idsByDay = new Map();
        for (const ln of state.lines) {
          if (!idsByDay.has(ln.date)) idsByDay.set(ln.date, new Set());
          idsByDay.get(ln.date).add(ln.id);
        }

        const newUsedByDay = {};
        for (const [day, usedMap] of Object.entries(oldUsedByDay)) {
          const keep = idsByDay.get(day);
          if (!keep) continue;
          for (const id of Object.keys(usedMap || {})) {
            if (keep.has(id)) {
              if (!newUsedByDay[day]) newUsedByDay[day] = {};
              newUsedByDay[day][id] = true;
            }
          }
        }
        state.usedByDay = newUsedByDay;

        // Merge history: garder les entrées valides
        state.history = (oldHistory || []).filter(h => {
          const keep = idsByDay.get(h.day);
          return keep && Array.isArray(h.ids) && h.ids.every(id => keep.has(id));
        });

        state.ctx = null;

        saveState();
        rebuildDaySelect();
        renderAll();

        setPill("ok", "Import OK (merge) — montant=" + (state.amtHeaderChosen || "Total TTC"));
      } catch (e) {
        console.error(e);
        setPill("bad", "Erreur import");
        alert("Erreur import: " + (e?.message || e));
      }
    }

    function rebuildDaySelect() {
      elDay.innerHTML = "";
      if (!state.days.length) {
        elDay.disabled = true;
        elDay.innerHTML = `<option value="">—</option>`;
        return;
      }
      for (const d of state.days) {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        elDay.appendChild(opt);
      }
      elDay.disabled = false;
      elDay.value = state.selectedDay || state.days[0];
    }

    function dayLines(day) {
      const f = (state.filter || "").trim().toLowerCase();
      const arr = state.lines.filter(x => x.date === day);
      if (!f) return arr;
      return arr.filter(x => (x.prestation || "").toLowerCase().includes(f));
    }

    function totalsForDay(day) {
      const all = state.lines.filter(x => x.date === day);
      const usedMap = usedMapForDay(day);
      let total = 0, used = 0;
      for (const ln of all) {
        total += ln.amountCents;
        if (usedMap[ln.id]) used += ln.amountCents;
      }
      return { total, used, remaining: total - used };
    }

    function totalsForMonth() {
      const all = state.lines || [];
      let total = 0, used = 0;
      for (const ln of all) {
        total += ln.amountCents;
        const usedMap = state.usedByDay?.[ln.date] || {};
        if (usedMap[ln.id]) used += ln.amountCents;
      }
      return { total, used, remaining: total - used };
    }

    function renderTotals() {
      const day = state.selectedDay;
      if (!day) { elTotal.textContent = "0"; elUsed.textContent = "0"; elRem.textContent = "0"; return; }
      const t = totalsForDay(day);
      elTotal.textContent = centsToEuro(t.total);
      elUsed.textContent = centsToEuro(t.used);
      elRem.textContent = centsToEuro(t.remaining);
    }

    function renderMonthTotals() {
      if (!state.lines?.length) {
        elMonthTotal.textContent = "0";
        elMonthUsed.textContent = "0";
        elMonthRem.textContent = "0";
        return;
      }
      const t = totalsForMonth();
      elMonthTotal.textContent = centsToEuro(t.total);
      elMonthUsed.textContent = centsToEuro(t.used);
      elMonthRem.textContent = centsToEuro(t.remaining);
    }

    function renderChips() {
      const day = state.selectedDay;
      elChips.innerHTML = "";
      if (!day) {
        elChips.innerHTML = `<div class="muted small">Importe un fichier puis choisis un jour.</div>`;
        return;
      }
      const usedMap = usedMapForDay(day);
      const arr = dayLines(day).slice();

      arr.sort((a, b) => {
        const usedA = !!usedMap[a.id];
        const usedB = !!usedMap[b.id];
        if (usedA !== usedB) return usedA ? 1 : -1;

        if (usedA && usedB) {
          const groupA = getLockMeta(a.id)?.lockGroupId || "";
          const groupB = getLockMeta(b.id)?.lockGroupId || "";
          if (groupA !== groupB) return groupA.localeCompare(groupB);
        }

        if (a.amountCents !== b.amountCents) return a.amountCents - b.amountCents;
        const la = norm(a.prestation), lb = norm(b.prestation);
        if (la !== lb) return la.localeCompare(lb);
        return a.id.localeCompare(b.id);
      });

      const active = state.ctx && state.ctx.day === day ? state.ctx.solutions?.[state.ctx.activeIndex]?.ids : null;
      const activeSet = new Set(active || []);

      let prevLockGroupId = null;

      for (const ln of arr) {
        const used = !!usedMap[ln.id];
        const meta = getLockMeta(ln.id);
        const lockGroupId = meta?.lockGroupId || null;
        const sameGroup = !!(used && lockGroupId && prevLockGroupId && lockGroupId === prevLockGroupId);

        const div = document.createElement("div");
        div.className = "chip" + (used ? " used" : "") + (activeSet.has(ln.id) ? " active" : "") + (sameGroup ? " sameGroup" : "");

        const invoiceHtml = used && meta ? `
          <div class="chipInvoice">
            <div class="k">Facture verrouillée</div>
            <div class="v mono">${centsToEuro(meta.invoiceCents)}€</div>
          </div>` : "";

        div.innerHTML = `
          <div class="chipMain">
            <div class="amt mono">${centsToEuro(ln.amountCents)}€</div>
            <div class="chipText">
              <div class="lib">${escapeHtml(ln.prestation)}</div>
              <div class="meta mono">${escapeHtml(ln.id)}</div>
              <div class="tag"><span class="miniDot"></span><span>${used ? "verrouillée" : "libre"}</span></div>
            </div>
          </div>
          ${invoiceHtml}`;
        elChips.appendChild(div);

        prevLockGroupId = used ? lockGroupId : null;
      }
      if (!arr.length) elChips.innerHTML = `<div class="muted small">0 ligne pour ce filtre.</div>`;
    }

    function renderCtx() {
      const ctx = state.ctx;
      const day = state.selectedDay;

      if (!ctx || !day || ctx.day !== day) {
        elSolCount.textContent = "0";
        elSolIdx.textContent = "—";
        elSolList.innerHTML = `<div class="muted small">Aucune recherche active.</div>`;
        elBtnCycle.disabled = true;
        elBtnLock.disabled = true;
        elBtnUndo.disabled = state.history.length === 0;
        return;
      }

      const sols = ctx.solutions || [];
      elSolCount.textContent = String(sols.length);
      elSolIdx.textContent = sols.length ? String(ctx.activeIndex + 1) : "—";
      elBtnCycle.disabled = sols.length <= 1;
      elBtnLock.disabled = sols.length === 0;
      elBtnUndo.disabled = state.history.length === 0;

      if (!sols.length) {
        elSolList.innerHTML = `<div class="muted small">0 solution.</div>`;
        return;
      }

      const usedMap = usedMapForDay(day);

      elSolList.innerHTML = sols.map((s, idx) => {
        const ids = s.ids;
        const lines = ids.map(id => state.linesById[id]).filter(Boolean);
        const label = lines.map(l => `${centsToEuro(l.amountCents)}€ — ${l.prestation} (${l.id})`).join(" / ");
        const already = ids.some(id => usedMap[id]);
        const delta = s.deltaCents;

        return `
          <div class="solRow ${idx === ctx.activeIndex ? "active" : ""}">
            <div class="solLeft">
              <div class="solTitle">
                Match ${ids.length} ligne${ids.length > 1 ? "s" : ""}
                ${already ? `<span class="badge" style="margin-left:8px;border-color:rgba(231,76,60,.55)">déjà utilisé</span>` : ""}
              </div>
              <div class="solMeta">${escapeHtml(label)}</div>
              <div class="solMeta mono">Somme: ${centsToEuro(s.sumCents)}€ • Δ: ${centsToEuro(delta)}€</div>
            </div>
            <div class="solAmt mono">${centsToEuro(s.sumCents)}€</div>
          </div>`;
      }).join("");
    }

    function dayStatusObj(day) {
      const tol = 1;
      const t = totalsForDay(day);
      const total = t.total;
      const used = t.used;
      const rem = total - used;

      let status = "idle";
      let symbol = "—";

      if (used === 0) {
        status = "idle"; symbol = "—";
      } else if (rem < -tol) {
        status = "bad"; symbol = "!";
      } else if (Math.abs(rem) <= tol) {
        status = "ok"; symbol = "✓";
      } else {
        status = "warn"; symbol = "•";
      }

      const pct = total > 0 ? Math.max(0, Math.min(1, used / total)) : 0;
      return { status, symbol, total, used, rem, pct };
    }

    function renderDaysPanel() {
      elDaysList.innerHTML = "";
      elDaysCount.textContent = String(state.days.length || 0);
      if (!state.days.length) {
        elDaysList.innerHTML = `<div class="muted small" style="padding:8px">Aucun jour.</div>`;
        return;
      }

      for (const d of state.days) {
        const st = dayStatusObj(d);
        const row = document.createElement("div");
        row.className = "dayRow" + (d === state.selectedDay ? " active" : "");
        row.innerHTML = `
          <div class="dayLeft">
            <div class="dayDate mono">${escapeHtml(d)}</div>
            <div class="dayMeta mono">Utilisé ${centsToEuro(st.used)}€ / ${centsToEuro(st.total)}€ • Restant ${centsToEuro(st.rem)}€</div>
          </div>
          <div class="dayRight">
            <div class="miniBar"><div class="miniFill" style="width:${Math.round(st.pct * 100)}%"></div></div>
            <div class="status ${st.status}">${st.symbol}</div>
          </div>
        `;
        row.addEventListener("click", () => {
          state.selectedDay = d;
          elDay.value = d;
          if (state.ctx && state.ctx.day !== d) state.ctx = null;
          saveState();
          renderAll();
        });
        elDaysList.appendChild(row);
      }
    }

    function renderAll() {
      renderTotals();
      renderMonthTotals();
      renderCtx();
      renderChips();
      renderDaysPanel();
    }

    // match engine (k<=4) inchangé
    function computeSolutions(day, targetCents) {
      const tol = 1;
      const usedMap = usedMapForDay(day);

      const candidates = state.lines.filter(x => x.date === day && !usedMap[x.id]);
      const n = candidates.length;

      const abs = Math.abs;
      const uniqKey = (ids) => ids.slice().sort().join("|");
      const outMap = new Map();

      function pushSol(ids, sumCents) {
        const set = new Set(ids);
        if (set.size !== ids.length) return;
        const delta = sumCents - targetCents;
        if (abs(delta) > tol) return;
        const key = uniqKey(ids);
        if (outMap.has(key)) return;
        outMap.set(key, { ids: ids.slice(), sumCents, deltaCents: delta });
      }

      for (const a of candidates) pushSol([a.id], a.amountCents);

      const pairs = [];
      const sumToPairs = new Map();
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = candidates[i], b = candidates[j];
          const sum = a.amountCents + b.amountCents;
          const p = { ids: [a.id, b.id], sum };
          pairs.push(p);
          if (!sumToPairs.has(sum)) sumToPairs.set(sum, []);
          sumToPairs.get(sum).push(p);
          pushSol(p.ids, sum);
        }
      }

      function getPairsNear(sum) {
        const res = [];
        for (let s = sum - tol; s <= sum + tol; s++) {
          const arr = sumToPairs.get(s);
          if (arr) res.push(...arr);
        }
        return res;
      }

      for (const s of candidates) {
        const need = targetCents - s.amountCents;
        for (const p of getPairsNear(need)) {
          pushSol([s.id, ...p.ids], s.amountCents + p.sum);
        }
      }

      for (const p1 of pairs) {
        const need = targetCents - p1.sum;
        for (const p2 of getPairsNear(need)) {
          pushSol([...p1.ids, ...p2.ids], p1.sum + p2.sum);
        }
      }

      const all = Array.from(outMap.values());
      all.sort((s1, s2) => {
        const d1 = abs(s1.deltaCents), d2 = abs(s2.deltaCents);
        if (d1 !== d2) return d1 - d2;
        if (s1.ids.length !== s2.ids.length) return s1.ids.length - s2.ids.length;
        return s1.ids.slice().sort().join(",").localeCompare(s2.ids.slice().sort().join(","));
      });

      return all.slice(0, 80);
    }

    function setCtx(day, targetCents, solutions) {
      state.ctx = { day, targetCents, solutions, activeIndex: 0 };
      saveState();
    }

    function cycleSolution() {
      if (!state.ctx) return;
      const sols = state.ctx.solutions || [];
      if (sols.length <= 1) return;
      state.ctx.activeIndex = (state.ctx.activeIndex + 1) % sols.length;
      saveState();
      renderAll();
    }

    function lockActiveSolution() {
      const ctx = state.ctx;
      const day = state.selectedDay;
      if (!ctx || !day || ctx.day !== day) return;
      const sols = ctx.solutions || [];
      if (!sols.length) return;

      const chosen = sols[ctx.activeIndex];
      const ids = [...chosen.ids];
      const usedMap = usedMapForDay(day);

      if (ids.some(id => usedMap[id])) {
        alert("Impossible : une ligne déjà verrouillée.");
        return;
      }

      const lockGroupId = makeLockGroupId(day, ctx.targetCents);
      const finalIds = [...ids];

      // Auto-rattacher une ligne négative exacte si elle existe libre le même jour
      const negativeLine = state.lines.find(ln =>
        ln.date === day &&
        ln.amountCents === -ctx.targetCents &&
        !usedMap[ln.id] &&
        !finalIds.includes(ln.id)
      );
      if (negativeLine) finalIds.push(negativeLine.id);

      finalIds.forEach(id => {
        usedMap[id] = true;
        setLockMeta(id, {
          invoiceCents: ctx.targetCents,
          day,
          lockGroupId,
          autoNegative: state.linesById[id]?.amountCents < 0
        });
      });

      state.history.push({
        day,
        ids: finalIds,
        targetCents: ctx.targetCents,
        chosenIndex: ctx.activeIndex,
        ts: Date.now(),
        lockGroupId
      });

      state.ctx.solutions = computeSolutions(day, ctx.targetCents);
      state.ctx.activeIndex = 0;

      saveState();
      renderAll();
    }

    function undoLast() {
      const h = state.history.pop();
      if (!h) return;
      const usedMap = usedMapForDay(h.day);
      for (const id of h.ids) {
        delete usedMap[id];
        clearLockMeta(id);
      }

      if (state.ctx && state.ctx.day === h.day) {
        state.ctx.solutions = computeSolutions(h.day, state.ctx.targetCents);
        state.ctx.activeIndex = 0;
      }

      saveState();
      renderAll();
    }

    function hardResetRuntimeOnly() {
      state.lines = []; state.linesById = {}; state.usedByDay = {}; state.history = []; state.lockMetaById = {}; state.ctx = null;
      state.days = []; state.selectedDay = null; state.filter = ""; state.sheetName = "—"; state.lastArrayBuffer = null;
      state.amtHeaderChosen = null;

      elDebug.value = "";
      elFilter.value = "";
      elInvoice.value = "";
      elSheet.textContent = "—";
      elDay.innerHTML = `<option value="">—</option>`;
      elDay.disabled = true;
    }

    // events (bind once)
    function bindEvents() {
      elFile.addEventListener("change", async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (typeof window.XLSX === "undefined") {
          setPill("bad", "XLSX non chargé");
          alert("Librairie XLSX non chargée (CDN bloqué/offline).");
          return;
        }
        setPill("warn", "Lecture…");
        const ab = await f.arrayBuffer();
        state.lastArrayBuffer = ab;
        parseArrayBuffer(ab, { merge: true });
      });

      elDay.addEventListener("change", () => {
        state.selectedDay = elDay.value || null;
        if (state.ctx && state.ctx.day !== state.selectedDay) state.ctx = null;
        saveState();
        renderAll();
      });

      elFilter.addEventListener("input", () => {
        state.filter = elFilter.value || "";
        saveState();
        renderChips();
      });

      elBtnFind.addEventListener("click", () => {
        const day = state.selectedDay;
        if (!day) { alert("Choisis un jour."); return; }
        const target = parseMoneyToCents(elInvoice.value);
        if (target == null) { alert("Montant invalide."); return; }
        const sols = computeSolutions(day, target);
        setCtx(day, target, sols);
        setPill(sols.length ? "ok" : "warn", sols.length ? ("Solutions: " + sols.length) : "0 solution");
        renderAll();
      });

elInvoice.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();

  // SHIFT+ENTER => cycle (optionnel)
  if (e.shiftKey) {
    if (!elBtnCycle.disabled) elBtnCycle.click();
    return;
  }

  // Si on a déjà des solutions actives sur le bon jour => Enter = lock
  const ctx = state.ctx;
  const day = state.selectedDay;
  const hasCtx = ctx && day && ctx.day === day && Array.isArray(ctx.solutions) && ctx.solutions.length > 0;

  if (hasCtx && !elBtnLock.disabled) {
    elBtnLock.click();
    return;
  }

  // Sinon Enter = chercher
  elBtnFind.click();
});

      elBtnCycle.addEventListener("click", cycleSolution);
      elBtnLock.addEventListener("click", lockActiveSolution);
      elBtnUndo.addEventListener("click", undoLast);

      elBtnReparse.addEventListener("click", () => {
        if (!state.lastArrayBuffer) {
          alert("Aucun fichier en mémoire. Réimporte le fichier.");
          return;
        }
        parseArrayBuffer(state.lastArrayBuffer, { merge: true });
      });

      elBtnReset.addEventListener("click", () => {
        if (!confirm("Reset complet (données + verrous + historique) ?")) return;
        localStorage.removeItem(getLSKey());
        hardResetRuntimeOnly();
        setPill("info", "Prêt");
        renderAll();
      });
    }

    function init() {
      loadState();
      rebuildIndex();

      elFilter.value = state.filter || "";
      elSheet.textContent = state.sheetName || "—";

      if (state.days.length) {
        rebuildDaySelect();
        elDay.disabled = false;
        elDay.value = state.selectedDay || state.days[0];
      } else {
        elDay.disabled = true;
        elDay.innerHTML = `<option value="">—</option>`;
      }

      elBtnUndo.disabled = state.history.length === 0;

      setPill(state.lines.length ? "ok" : "info",
        state.lines.length ? ("Données restaurées — montant=" + (state.amtHeaderChosen || "Total TTC")) : "Prêt");

      bindEvents();
      renderAll();
    }

    // IMPORTANT: reload complet de l’état quand on change de société (sans rebind events)
    function reloadForCompany() {
      // reset runtime only (sans toucher aux listeners déjà bind)
      hardResetRuntimeOnly();

      // recharge depuis la nouvelle clé
      loadState();
      rebuildIndex();

      elFilter.value = state.filter || "";
      elSheet.textContent = state.sheetName || "—";

      if (state.days.length) {
        rebuildDaySelect();
        elDay.disabled = false;
        elDay.value = state.selectedDay || state.days[0];
      } else {
        elDay.disabled = true;
        elDay.innerHTML = `<option value="">—</option>`;
      }

      elBtnUndo.disabled = state.history.length === 0;

      setPill(state.lines.length ? "ok" : "info",
        state.lines.length ? ("Données restaurées — montant=" + (state.amtHeaderChosen || "Total TTC")) : "Prêt");

      renderAll();
    }

    return { init, reloadForCompany, state };
  }

  /* ===================== Mounting ===================== */

  let _mounted = false;
  let _hostEl = null;
  let _shadow = null;
  let _runtime = null;
  let _companiesBound = false;

  async function mount(hostEl) {
    if (!hostEl) throw new Error("DD.mount: hostEl manquant");

    await ensureXLSX().catch(() => { /* ignore */ });

    // bind companies UI once (in main DOM)
    if (!_companiesBound) {
      _companiesBound = bindCompaniesUI({
        onCompanyChanged: () => {
          // si DD pas encore monté -> rien
          if (_runtime) {
            // s’assure que le select est à jour (au cas où)
            refreshCompanySelectUI();
            _runtime.reloadForCompany();
          }
        }
      }) || false;

      // Même si pas bind (UI absente), on assure un select stable si présent
      refreshCompanySelectUI();
    }

    _hostEl = hostEl;

    // Si shadowRoot déjà présent → on le réutilise
    if (hostEl.shadowRoot) {
      _shadow = hostEl.shadowRoot;

      if (!_shadow.innerHTML.trim()) {
        _shadow.innerHTML = TEMPLATE_HTML;
        _runtime = createRuntime(_shadow);
        _runtime.init();
      }

      _mounted = true;
      return true;
    }

    // Sinon premier montage
    _shadow = hostEl.attachShadow({ mode: "open" });
    _shadow.innerHTML = TEMPLATE_HTML;
    _runtime = createRuntime(_shadow);
    _runtime.init();

    _mounted = true;
    return true;
  }

  function unmount() {
    if (!_mounted) return;
    try {
      if (_hostEl && _hostEl.shadowRoot) {
        _hostEl.shadowRoot.innerHTML = "";
      }
    } catch { /* ignore */ }
    _mounted = false;
    _hostEl = null;
    _shadow = null;
    _runtime = null;
  }

  function init() {
    const host = document.getElementById("dd-output");
    if (!host) {
      console.warn("DD.init: #dd-output introuvable (view-dd absent?)");
      return;
    }
    return mount(host);
  }

  function refresh() {
    if (_mounted) return true;
    return init();
  }

  window.DD = Object.assign(window.DD || {}, {
    mount,
    unmount,
    init,
    refresh,
    __version: "dd.module.js (shadow,dark,gdv-v6 + multi-company)"
  });

})();
