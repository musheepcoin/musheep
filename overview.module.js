// overview.module.js
// Onglet Overview (Ascenseur / Baignoire) — lit la même source que Home
// Source unique: localStorage('aar_home_arrivals_source_v1')

(function(){
  const LS_HOME_STATS_SOURCE = 'aar_home_arrivals_source_v1';

  const byId = (id)=>document.getElementById(id);

  // ---------- Utils ----------
  function stripAccentsLower(s){
    return String(s||"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "'")
      .toLowerCase();
  }

  function buildKeywordRegex(list){
    const tokens = (list || [])
      .map(x => stripAccentsLower(String(x || "")).trim())
      .filter(Boolean)
      .map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .map(x => x.replace(/\s+/g, "\\s+"));

    if(!tokens.length) return null;
    return new RegExp(`(?:${tokens.join("|")})`, "i");
  }

  function pick(row, aliases){
    const keys = Object.keys(row || {});
    for (const alias of (aliases || [])){
      const safe = String(alias)
        .replace(/\s+/g, "\\s*")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp("^" + safe + "$", "i");
      const k = keys.find(kk => rx.test(kk));
      if (k && row[k] !== undefined && String(row[k]).trim() !== "") return row[k];
    }
    return "";
  }

  function parseFolsDateCell(v){
    if (v == null || v === "") return null;

    if (v instanceof Date && !isNaN(v)){
      return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
    }
    if (typeof v === "number"){
      const base = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(base.getTime() + v * 86400000);
      return isNaN(d) ? null : d;
    }

    const s = String(v).trim();
    if (!s) return null;

    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m){
      const dd=+m[1], mm=+m[2], yyyy=+m[3];
      return new Date(Date.UTC(yyyy, mm-1, dd));
    }

    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m){
      const yyyy=+m[1], mm=+m[2], dd=+m[3];
      return new Date(Date.UTC(yyyy, mm-1, dd));
    }

    return null;
  }

  function toFrLabel(dObj){
    const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
    const mois  = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    return `${jours[dObj.getUTCDay()]} ${String(dObj.getUTCDate()).padStart(2,"0")} ${mois[dObj.getUTCMonth()]} ${dObj.getUTCFullYear()}`;
  }

  // ---------- CSV parsing en BLOCS (même principe que l'indiv) ----------
  function splitCSV(line, delim=";"){
    const out=[];
    let cur="", q=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c === '"'){
        if(q && line[i+1] === '"'){ cur += '"'; i++; }
        else q = !q;
        continue;
      }
      if(!q && c===delim){
        out.push(cur);
        cur="";
        continue;
      }
      cur += c;
    }
    out.push(cur);
    return out.map(s=>String(s||"").trim().replace(/^"|"$/g,''));
  }

  // Heuristique: export FOLS = beaucoup de ; + une date quelque part
  function looksLikeClientStart(rawLine){
    const semi = (rawLine.match(/;/g) || []).length;
    if (semi < 8) return false;
    return /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/.test(rawLine);
  }

  function parseCsvHeaderAndBlocks(text){
    const s = String(text || "").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
    const lines = s.split("\n");

    let headerLine = "";
    let startIdx = 0;
    for(let i=0;i<lines.length;i++){
      if(lines[i].trim()){
        headerLine = lines[i];
        startIdx = i+1;
        break;
      }
    }
    const header = splitCSV(headerLine, ";").map(x => String(x||"").trim());

    const blocks = [];
    let cur = [];
    for(let i=startIdx;i<lines.length;i++){
      const ln = lines[i];
      if(!ln && !cur.length) continue;

      if(looksLikeClientStart(ln)){
        if(cur.length) blocks.push(cur);
        cur = [ln];
      } else {
        if(cur.length) cur.push(ln);
        else cur = [ln];
      }
    }
    if(cur.length) blocks.push(cur);

    return { header, blocks };
  }

  function buildRowsFromBlocks(header, blocks){
    const rows = [];
    for(const b of blocks){
      const first = b[0] || "";
      const cells = splitCSV(first, ";");
      const o = {};
      for(let c=0;c<header.length;c++){
        o[header[c]] = cells[c] ?? "";
      }
      o.__text = b.join("\n");
      o.__first = first;
      rows.push(o);
    }
    return rows;
  }

  // ---------- Rules (local au module) ----------
  const RULES = {
    keywords: {
      asc_proche: [
        "proximite ascenseur proche ascenseur",
        "proximité ascenseur proche ascenseur",
        "proche ascenseur"
      ],
      asc_eloigne: [
        "proximite ascenseur eloigne de l ascenseur",
        "proximité ascenseur éloigné de l ascenseur",
        "eloigne de l ascenseur",
        "éloigné de l ascenseur",
        "loin de l ascenseur",
        "loin de l'ascenseur"
      ],
      bath: [
        "baignoire",
        "bath",
        "bathtub"
      ]
    }
  };

  function compileRegex(){
    return {
      asc_proche: buildKeywordRegex(RULES.keywords.asc_proche),
      asc_eloigne: buildKeywordRegex(RULES.keywords.asc_eloigne),
      bath: buildKeywordRegex(RULES.keywords.bath),
    };
  }

  // ---------- Core compute ----------
  function computeFromRaw(raw){
    const { header, blocks } = parseCsvHeaderAndBlocks(raw);
    const rows = buildRowsFromBlocks(header, blocks);
    const rx = compileRegex();

    const grouped = {};
    let lastKey = "";
    let lastLabel = "";

    for(const r of rows){
      const comment = stripAccentsLower((r.__text||"").replace(/<[^>]*>/g," "))
        .replace(/["*()]/g,' ')
        .replace(/s\/intern[:\s-]*/g,' ')
        .replace(/[^\p{L}\p{N}\s\+]/gu,' ')
        .replace(/\s+/g,' ')
        .trim();

      let dObj = parseFolsDateCell(
        pick(r, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
      );

      if(!dObj){
        const m = (r.__text||"").match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
        if(m){
          const dd=+m[1], mm=+m[2], yyyy=+m[3];
          dObj = new Date(Date.UTC(yyyy, mm-1, dd));
        }
      }

      let dateKey, dateLabel;
      if(!dObj && lastKey){
        dateKey = lastKey; dateLabel = lastLabel;
      } else if(dObj){
        dateKey = dObj.toISOString().slice(0,10);
        dateLabel = toFrLabel(dObj);
        lastKey = dateKey; lastLabel = dateLabel;
      } else {
        dateKey = "9999-12-31"; dateLabel = "Non daté";
      }

      if(!grouped[dateKey]){
        grouped[dateKey] = { label: dateLabel, proche: [], eloigne: [], bath: [] };
      }

      const name = String(
        pick(r, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) ||
        splitCSV(r.__first || "", ";")[0] || ""
      ).trim().toUpperCase() || "(NOM VIDE)";

      const isProche = !!(rx.asc_proche && rx.asc_proche.test(comment));
      const isEloigne = !!(rx.asc_eloigne && rx.asc_eloigne.test(comment));
      const isBath = !!(rx.bath && rx.bath.test(comment));

      if(isProche) grouped[dateKey].proche.push(name);
      if(isEloigne) grouped[dateKey].eloigne.push(name);
      if(isBath) grouped[dateKey].bath.push(name);
    }

    // tri + uniq
    const keys = Object.keys(grouped).sort();
    for(const k of keys){
      grouped[k].proche = Array.from(new Set(grouped[k].proche)).sort((a,b)=>a.localeCompare(b,'fr'));
      grouped[k].eloigne = Array.from(new Set(grouped[k].eloigne)).sort((a,b)=>a.localeCompare(b,'fr'));
      grouped[k].bath = Array.from(new Set(grouped[k].bath)).sort((a,b)=>a.localeCompare(b,'fr'));
    }

    return { keys, grouped };
  }

  // ---------- Render ----------
  function render(data){
    const out = byId("overview-results");
    if(!out) return;

    if(!data || !data.keys || !data.keys.length){
      out.innerHTML = `<div class="muted">Aucune détection (ou pas de CSV chargé sur Home).</div>`;
      return;
    }

    out.innerHTML = "";

    for(const k of data.keys){
      const d = data.grouped[k];
      const blk = document.createElement("div");
      blk.className = "day-block";

      const h = document.createElement("div");
      h.className = "day-header";
      h.textContent = `📅 ${d.label}`;

      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "📋 Copier";

      const lines = [];
      if(d.proche.length) lines.push(`🔊 PROCHE ASCENSEUR : ${d.proche.join(", ")}`);
      if(d.eloigne.length) lines.push(`🔕 ÉLOIGNÉ ASCENSEUR : ${d.eloigne.join(", ")}`);
      if(d.bath.length) lines.push(`🛁 AVEC BAIGNOIRE : ${d.bath.join(", ")}`);
      if(!lines.length) lines.push("—");

      btn.onclick = ()=>{
        navigator.clipboard.writeText(lines.join("\n"));
        btn.textContent = "✔ Copié";
        setTimeout(()=>btn.textContent="📋 Copier", 900);
      };

      const body = document.createElement("div");
      body.style.whiteSpace = "pre-wrap";
      body.style.marginTop = "10px";
      body.textContent = lines.join("\n");

      blk.append(h, btn, body);
      out.appendChild(blk);
    }
  }

  // ---------- Refresh loop (sans toucher script.js) ----------
  let _last = "";
  function refresh(force){
    const raw = localStorage.getItem(LS_HOME_STATS_SOURCE) || "";
    if(!force && raw === _last) return;
    _last = raw;

    if(!raw.trim()){
      render(null);
      return;
    }
    const computed = computeFromRaw(raw);
    render(computed);
  }

  // expose pour le click tab (optionnel)
  window.OVERVIEW = window.OVERVIEW || {};
  window.OVERVIEW.refresh = refresh;

  window.addEventListener("DOMContentLoaded", ()=>{
    refresh(true);
    // petit polling: si tu re-drop sur Home, Overview se met à jour sans hook dans script.js
    setInterval(()=>refresh(false), 1500);
  });

})();
