// groups.module.js
(function () {

  const byId = (id) => document.getElementById(id);

  function splitCSV(line, sep=';'){
    const out=[]; let cur=''; let inQuotes=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i], nxt=line[i+1];
      if(ch==='"'){
        if(inQuotes && nxt === '"'){ cur+='"'; i++; }
        else { inQuotes=!inQuotes; }
      }else if(ch===sep && !inQuotes){ out.push(cur); cur=''; }
      else{ cur+=ch; }
    }
    out.push(cur);
    return out.map(s=>s.trim().replace(/^"|"$/g,''));
  }

  function pick(row, aliases){
    const keys = Object.keys(row || {});
    for (const alias of aliases){
      const rx = new RegExp('^' + alias.replace(/\s+/g,'\\s*').replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$', 'i');
      const k = keys.find(kk => rx.test(kk));
      if (k && row[k] !== undefined && row[k] !== '') return row[k];
    }
    return '';
  }

  function parseFolsDateCell(v) {
    if (v == null || v === '') return null;

    if (v instanceof Date && !isNaN(v)) {
      return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
    }

    if (typeof v === 'number') {
      const base = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(base.getTime() + v * 86400000);
      return isNaN(d) ? null : d;
    }

    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (m) {
      const dd=+m[1], mm=+m[2], yyyy=+m[3];
      return new Date(Date.UTC(yyyy, mm-1, dd));
    }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const yyyy=+m[1], mm=+m[2], dd=+m[3];
      return new Date(Date.UTC(yyyy, mm-1, dd));
    }
    return null;
  }

  function daysBetweenUTC(a, b){
    const ms = (b.getTime() - a.getTime());
    return Math.round(ms / 86400000);
  }

  function fmtFR(d){
    const dd = String(d.getUTCDate()).padStart(2,'0');
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  function fmtFRWithDay(d){
    const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    const dayName = days[d.getUTCDay()];
    return `${dayName} ${fmtFR(d)}`;
  }

  function mondayOf(d){
    const day = d.getUTCDay(); // 0=dimanche
    const delta = (day === 0) ? -6 : (1 - day);
    const md = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    md.setUTCDate(md.getUTCDate() + delta);
    return md;
  }

  function buildComposition(roomTypeCounts){
    const entries = Object.entries(roomTypeCounts || {});
    if (!entries.length) return '';
    entries.sort((a,b)=> b[1]-a[1] || String(a[0]).localeCompare(String(b[0])));
    return entries.map(([rt, n]) => `${n}×${rt}`).join(' / ');
  }

  // Détection "VRAI TWIN" / "VRAIE TWIN" (case-insensitive)
  // On se limite volontairement aux champs message/message_html (cohérent avec FOLS)
  // pour éviter les faux positifs sur d'autres colonnes.
  function rowHasTrueTwin(r){
    const rx = /\bVRAI(?:E)?\s*TWIN\b/i;
    const msg = String(pick(r, ['Message','MESSAGE','message']) || '');
    const msgHtml = String(pick(r, ['message_html','MESSAGE_HTML']) || '');
    return rx.test(msg) || rx.test(msgHtml);
  }

  function buildWeeks(groupsRows) {
    if (!Array.isArray(groupsRows)) return { weeks: [], debugCount: 0, annulSkipped: 0 };

    // ---- agrégation "1 ligne = 1 réservation" ----
    const groups = new Map();
    let annulSkipped = 0;

    for (const r of groupsRows) {
      const gname = String(
        pick(r, ['GUES_GROUPNAME','GUES_GROUP_NAME','GROUPNAME','GROUP_NAME']) || ''
      ).trim();

      const compName = String(
        pick(r, ['GUES_COMPNAME','GUES_COMP_NAME','COMPNAME','COMP_NAME']) || ''
      ).trim();

      // logique existante : on ne traite que les lignes "groupe"
      if (!gname) continue;

      // ✅ extension : on exclut la réservation si ANNUL est présent dans message_html
      const msgHtml = String(pick(r, ['message_html','MESSAGE_HTML']) || '');
      if (/ANNUL/i.test(msgHtml)) {
        annulSkipped += 1;
        continue;
      }

      const arr = parseFolsDateCell(pick(r, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','ARRIVAL_DATE','Arrival Date']));
      const dep = parseFolsDateCell(pick(r, ['PSER_DATFIN','PSER DATFIN','DATE_DEP','DATE DEP','DEPARTURE_DATE','Departure Date']));

      const roomType = String(pick(r, ['ROOM_TYPE','ROOMTYPE','TYPE_CHAMBRE','ROOM']))?.trim() || '';
      const adu = parseInt(pick(r, ['NB_OCC_AD','ADULTS','Adultes','ADU']) || '0', 10) || 0;
      const chd = parseInt(pick(r, ['NB_OCC_CH','CHILDREN','Enfants','CH']) || '0', 10) || 0;

      if (!groups.has(gname)) {
        groups.set(gname, {
          name: gname,
          compName: compName || '',
          arrival: arr || null,
          departure: dep || null,
          rooms: 0,
          adu: 0,
          chd: 0,
          roomTypes: {},
          nonEclate: false,
          trueTwin: 0
        });
      }

      const g = groups.get(gname);

      // Mémorisation compName si disponible sur d'autres lignes
      if (!g.compName && compName) g.compName = compName;

      // 1 ligne = 1 réservation (chambre)
      g.rooms += 1;
      g.adu += adu;
      g.chd += chd;

      // ✅ compteur "Vrai Twin" (par chambre/ligne)
      if (rowHasTrueTwin(r)) g.trueTwin += 1;

      if (roomType) g.roomTypes[roomType] = (g.roomTypes[roomType] || 0) + 1;

      // ✅ règle non éclaté
      if (adu > 3) g.nonEclate = true;

      if (arr) {
        if (!g.arrival || arr < g.arrival) g.arrival = arr;
      }
      if (dep) {
        if (!g.departure || dep > g.departure) g.departure = dep;
      }
    }

    // ---- bucket par semaines (lundi->dimanche) ----
    const weekMap = new Map(); // key: ISO date monday

    for (const g of groups.values()) {
      if (!g.arrival) continue; // pas de semaine sans arrivée

      const ws = mondayOf(g.arrival);
      const we = new Date(ws.getTime()); we.setUTCDate(we.getUTCDate() + 6);

      const key = ws.toISOString().slice(0,10);
      if (!weekMap.has(key)) {
        weekMap.set(key, { weekStart: ws, weekEnd: we, groups: [] });
      }
      weekMap.get(key).groups.push(g);
    }

    const weeks = Array.from(weekMap.values()).sort((a,b)=> a.weekStart - b.weekStart);

    // tri interne des groupes : arrivée puis nom
    for (const w of weeks) {
      w.groups.sort((a,b)=>{
        const da = a.arrival ? a.arrival.getTime() : 0;
        const db = b.arrival ? b.arrival.getTime() : 0;
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name);
      });
    }

    return { weeks, debugCount: groupsRows.length, annulSkipped };
  }

  function render(result){
    const out = byId('groups-output');
    if (!out) return;

    const weeks = result?.weeks || [];
    if (!weeks.length) {
      out.innerHTML = `<div class="muted">Aucun groupe détecté (ou pas de date d’arrivée exploitable).</div>`;
      return;
    }

    out.innerHTML = '';

    let weekIndex = 0;
    for (const w of weeks) {
      weekIndex += 1;

      const card = document.createElement('div');
      card.className = 'day-block';

      const header = document.createElement('div');
      header.className = 'day-header';
      header.textContent = `📆 SEMAINE ${weekIndex} — du ${fmtFR(w.weekStart)} au ${fmtFR(w.weekEnd)}`;

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = '📋 Copier';

      const lines = [];

      for (const g of w.groups) {
        const headerName = (g.compName || g.name);
        const title = g.nonEclate
          ? `❌ NON ÉCLATÉ  <strong>${headerName}</strong>`
          : `<strong>${headerName}</strong>`;

        const arr = g.arrival ? fmtFRWithDay(g.arrival) : '–';
        const dep = g.departure ? fmtFRWithDay(g.departure) : '–';

        const nights = (g.arrival && g.departure) ? daysBetweenUTC(g.arrival, g.departure) : null;
        const compo = buildComposition(g.roomTypes);
        const occ = `${g.adu}A`;

        const trueTwinText = (g.trueTwin > 0) ? `${g.trueTwin} Vrai Twin` : '';
        const trueTwinHtml = (g.trueTwin > 0)
          ? ` — <span style="color:#d00;font-weight:800">${trueTwinText}</span>`
          : '';

        lines.push(title);
        lines.push(
          `Séjour : ${arr} → ${dep}` +
          (nights!=null ? ` (${nights} nuit${nights>1?'s':''})` : '') +
          ` — ${g.rooms} ch.` +
          (compo ? ` — Compo : ${compo}` : '') +
          (trueTwinHtml ? trueTwinHtml : '') +
          ` — Pax : ${occ}`
        );
        lines.push('');
      }

      btn.onclick = ()=>{
        // Copie sans HTML
        const plain = lines
          .join('\n')
          .replace(/<br\s*\/?>/gi,'\n')
          .replace(/<[^>]*>/g,'')
          .trim();
        navigator.clipboard.writeText(plain);
        btn.textContent = '✔ Copié';
        setTimeout(()=>btn.textContent='📋 Copier', 1200);
      };

      const body = document.createElement('div');
      body.className = 'muted';
      body.style.whiteSpace = 'pre-wrap';
      body.style.marginTop = '10px';
      body.innerHTML = lines.join('<br>').trim();

      card.append(header, btn, body);
      out.appendChild(card);
    }
  }

  function recompute() {
    const data = window.GROUPS_SOURCE || [];
    const result = buildWeeks(data);
    console.log("GROUPS MODULE RESULT", result);
    render(result);
  }

  // hook automatique
  window.onGroupsSourceUpdated = recompute;
  window.GroupsTest = recompute;

})();
