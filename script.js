/* ---------- CONFIG GITHUB ---------- */
window.GH_OWNER = "musheepcoin";   // ton utilisateur GitHub
window.GH_REPO  = "musheep";       // ton dépôt
window.GH_PATH  = "data/last.json"; // le chemin exact du fichier
window.GH_TOKEN = null; // le token est géré côté serveur via Vercel
window.GH_BRANCH= "main";          // ta branche


(function(){
  /* ---------- Helpers DOM ---------- */
  const $  = (sel)=>document.querySelector(sel);
  const $$ = (sel)=>Array.from(document.querySelectorAll(sel));
  const byId = (id)=>document.getElementById(id);

  /* ---------- NAV ---------- */
  const tabs = {
    home:  byId('tab-home'),
    rules: byId('tab-rules'),
    check: byId('tab-check'),
    mails: byId('tab-mails')
  };
  const views = {
    home:  byId('view-home'),
    rules: byId('view-rules'),
    check: byId('view-check'),
    mails: byId('view-mails')
  };
  function showTab(t){
    Object.values(views).forEach(v=>v.style.display='none');
    Object.values(tabs).forEach(x=>x.classList.remove('active'));
    views[t].style.display='block';
    tabs[t].classList.add('active');
  }
  tabs.home?.addEventListener('click',e=>{e.preventDefault();showTab('home')});
  tabs.rules?.addEventListener('click',e=>{e.preventDefault();showTab('rules')});
  tabs.check?.addEventListener('click',e=>{e.preventDefault();showTab('check')});
  tabs.mails?.addEventListener('click',e=>{e.preventDefault();showTab('mails')});
  showTab('home');

  /* ---------- UI reset local ---------- */
  byId('reset-cache')?.addEventListener('click',()=>{
    if(confirm("Voulez-vous réinitialiser toutes les données locales ?")){
      localStorage.clear(); sessionStorage.clear(); location.reload();
    }
  });

  /* ---------- RULES (LS + UI) ---------- */
  const DEFAULTS={
    keywords:{
      baby:["lit bb","lit bebe","lit bébé","baby","cot","crib"],
      comm:["comm","connecte","connecté","connected","communic"],
      dayuse:["day use","dayuse"],
      early:["early","prioritaire","11h","checkin","check-in","arrivee prioritaire"]
    },
    sofa:{
      "1A+0E":"0","1A+1E":"1","1A+2E":"2","1A+3E":"2",
      "2A+0E":"0","2A+1E":"1","2A+2E":"2",
      "3A+0E":"1","3A+1E":"2"
    }
  };
  const LS_RULES='aar_soiree_rules_v2';
  function loadRules(){
    try{
      const raw=localStorage.getItem(LS_RULES);
      if(!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const o = JSON.parse(raw);
      return {
        keywords:{...DEFAULTS.keywords,...(o.keywords||{})},
        sofa:{...DEFAULTS.sofa,...(o.sofa||{})}
      };
    }catch(_){ return JSON.parse(JSON.stringify(DEFAULTS)); }
  }
  let RULES = loadRules();
  function saveRules(){ localStorage.setItem(LS_RULES, JSON.stringify(RULES)); }
  function parseList(t){return (t||'').split(',').map(x=>stripAccentsLower(x).trim()).filter(Boolean);}
  function renderSofaTable(){
    const body = byId('sofa-rules-body'); if(!body) return;
    body.innerHTML='';
    Object.entries(RULES.sofa).forEach(([comp,act])=>{
      const tr=document.createElement('tr');
      const td1=document.createElement('td'); td1.textContent=comp;
      const td2=document.createElement('td');
      const sel=document.createElement('select');
      ['0','1','2'].forEach(v=>{
        const opt=document.createElement('option');
        opt.value=v; opt.textContent=(v==='0'?'Sofa fermé': v==='1'?'1 sofa':'2 sofa');
        if(v===act) opt.selected=true;
        sel.appendChild(opt);
      });
      sel.onchange=()=>{ RULES.sofa[comp]=sel.value; saveRules(); };
      td2.appendChild(sel);
      tr.append(td1,td2);
      body.appendChild(tr);
    });
  }
  function populateKeywordAreas(){
    byId('kw-baby') && (byId('kw-baby').value=(RULES.keywords.baby||[]).join(', '));
    byId('kw-comm') && (byId('kw-comm').value=(RULES.keywords.comm||[]).join(', '));
    byId('kw-dayuse') && (byId('kw-dayuse').value=(RULES.keywords.dayuse||[]).join(', '));
    byId('kw-early') && (byId('kw-early').value=(RULES.keywords.early||[]).join(', '));
  }
  function readKeywordAreasToRules(){
    RULES.keywords.baby = parseList(byId('kw-baby')?.value||'');
    RULES.keywords.comm = parseList(byId('kw-comm')?.value||'');
    RULES.keywords.dayuse = parseList(byId('kw-dayuse')?.value||'');
    RULES.keywords.early = parseList(byId('kw-early')?.value||'');
  }
  function buildKeywordRegex(list){
    const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s*');
    const p=(list||[]).map(esc).join('|');
    return p ? new RegExp(`\\b(${p})\\b`,'i') : null;
  }
  function compileRegex(){
    return {
      baby: buildKeywordRegex(RULES.keywords.baby),
      comm: buildKeywordRegex(RULES.keywords.comm),
      dayuse: buildKeywordRegex(RULES.keywords.dayuse),
      early: buildKeywordRegex(RULES.keywords.early),
    };
  }
  renderSofaTable();
  populateKeywordAreas();
  byId('btn-save')?.addEventListener('click',()=>{
    readKeywordAreasToRules(); saveRules();
    const s=byId('rules-status'); if(s){ s.textContent='Règles mises à jour ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
  });
  byId('btn-reset')?.addEventListener('click',()=>{
    RULES = JSON.parse(JSON.stringify(DEFAULTS));
    saveRules(); renderSofaTable(); populateKeywordAreas();
    const s=byId('rules-status'); if(s){ s.textContent='Valeurs par défaut restaurées ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
  });
  byId('btn-export')?.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(RULES,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='aar_rules.json'; a.click();
    URL.revokeObjectURL(a.href);
  });
  byId('import-file')?.addEventListener('change',(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const obj=JSON.parse(ev.target.result);
        RULES = {keywords:{...DEFAULTS.keywords,...obj.keywords}, sofa:{...DEFAULTS.sofa,...obj.sofa}};
        saveRules(); renderSofaTable(); populateKeywordAreas();
        const s=byId('rules-status'); if(s){ s.textContent='Règles importées ✔'; setTimeout(()=>s.textContent='Règles chargées',1500); }
      }catch(err){ alert('Fichier JSON invalide'); }
    };
    reader.readAsText(f);
  });

  /* ---------- CHECKLIST ---------- */
  const LS_CHECK='aar_checklist_v2';
  const LS_MEMO='aar_memo_v2';
  const checklistDefault=[
    "Vérifier la propreté du hall + journaux + musique",
    "Compter le fond de caisse",
    "Contrôler et préparer les arrivées du lendemain",
    "Contrôler les garanties à 23h",
    "Clôturer la caisse journalière"
  ];
  const checklistEl=byId('checklist');
  const memoEl=byId('memo');
  if(memoEl){ memoEl.style.minHeight='400px'; }
  let checklist=JSON.parse(localStorage.getItem(LS_CHECK)||'null')||checklistDefault.map(t=>({text:t,done:false}));
  function saveChecklist(){localStorage.setItem(LS_CHECK,JSON.stringify(checklist));}
  function renderChecklist(){
    if(!checklistEl) return;
    checklistEl.innerHTML='';
    checklist.forEach((item,i)=>{
      const row=document.createElement('div');
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=item.done;
      cb.onchange=()=>{checklist[i].done=cb.checked;saveChecklist();};
      const input=document.createElement('input'); input.type='text'; input.value=item.text; input.style.flex='1';
      input.oninput=()=>{checklist[i].text=input.value;saveChecklist();};
      const del=document.createElement('button'); del.textContent='➖'; del.style.border='none'; del.style.background='transparent'; del.style.cursor='pointer';
      del.onclick=()=>{checklist.splice(i,1);saveChecklist();renderChecklist();};
      row.append(cb,input,del);
      checklistEl.appendChild(row);
    });
    const add=document.createElement('button'); add.textContent='➕ Ajouter une tâche'; add.className='btn'; add.style.marginTop='10px';
    add.onclick=()=>{checklist.push({text:'',done:false});saveChecklist();renderChecklist();};
    checklistEl.appendChild(add);
  }
  byId('reset-check')?.addEventListener('click',()=>{
    checklist=checklistDefault.map(t=>({text:t,done:false}));
    saveChecklist(); renderChecklist();
  });
  if(memoEl){
    memoEl.value=localStorage.getItem(LS_MEMO)||'';
    memoEl.oninput=()=>localStorage.setItem(LS_MEMO,memoEl.value);
  }
  renderChecklist();

  /* ---------- FONCTIONS PARSE FOLS ---------- */
  function stripAccentsLower(s){
    return s?.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'') || '';
  }
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
  const regexClientStart = /^"[A-ZÉÈÀÂÊÎÔÛÄËÏÖÜÇ][^;]+";/;
  function parseCsvHeaderAndBlocks(text){
    const lines = text.replace(/\r\n?/g,'\n').split('\n').filter(l=>l.trim()!=='');
    if(!lines.length) return {header:[], blocks:[]};
    const header = splitCSV(lines[0], ';');
    const blocks=[]; let current=null;
    for(let i=1;i<lines.length;i++){
      const line = lines[i];
      if(regexClientStart.test(line)){
        if(current) blocks.push(current);
        current = { firstLine: line, extra: [] };
      }else{
        if(current) current.extra.push(line);
      }
    }
    if(current) blocks.push(current);
    return {header, blocks};
  }
  function buildRowsFromBlocks(header, blocks){
    const rows=[];
    for(const b of blocks){
      const cells = splitCSV(b.firstLine, ';');
      const obj = {};
      header.forEach((h,idx)=>{ obj[h] = (cells[idx] ?? ''); });
      const mergedText = [b.firstLine, ...(b.extra||[])].join(' ');
      rows.push({ __text: mergedText, __first: b.firstLine, ...obj });
    }
    return rows;
  }
  function pick(row, aliases){
    const keys = Object.keys(row);
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
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) { const dd=+m[1], mm=+m[2], yyyy=+m[3]; return new Date(Date.UTC(yyyy, mm-1, dd)); }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) { const yyyy=+m[1], mm=+m[2], dd=+m[3]; return new Date(Date.UTC(yyyy, mm-1, dd)); }
    return null;
  }
  function toFrLabel(dObj) {
    const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const mois  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    const j = jours[dObj.getUTCDay()];
    const jj = String(dObj.getUTCDate()).padStart(2,'0');
    const mm = mois[dObj.getUTCMonth()];
    const yyyy = dObj.getUTCFullYear();
    return `${j} ${jj} ${mm} ${yyyy}`;
  }

  /* ---------- RENDER ARRIVALS ---------- */
  function renderArrivalsFOLS_fromRows(rows){
    const out = byId('output'); if(!out) return;
    out.innerHTML = '';

    const rx = compileRegex();
    const grouped = {};
    let lastKey=null, lastLabel=null;

    rows.forEach(r=>{
      try{
        const nameRaw = String(
          pick(r, ['GUES_NAME','GUEST_NAME','Nom','Client','NAME']) ||
          splitCSV(r.__first || '', ';')[0] || ''
        );
        let nameParts = nameRaw.trim().split(/\s+/);
        let shortName = '';
        if (nameParts.length > 1) {
          shortName = nameParts[0].length < 3 ? `${nameParts[0]} ${nameParts[1]}` : nameParts[0];
        } else {
          shortName = nameParts[0] || '';
        }
        const name = (shortName || '').toUpperCase().trim();
        if(!name) return;

        const adu = parseInt(
          pick(r, ['NB_OCC_AD','Adultes','ADULTES','ADULTS','A','ADU']) || '0'
        ) || 0;
        const enf = parseInt(
          pick(r, ['NB_OCC_CH','Enfants','ENFANTS','CHILDREN','E','CH']) || '0'
        ) || 0;

        // COM – on garde tout simple (stable) pour éviter les erreurs
        let comment = stripAccentsLower((r.__text||'').replace(/<[^>]*>/g,' '))
          .replace(/["*()]/g,' ')
          .replace(/s\/intern[:\s-]*/g, ' ')
          .replace(/[^\p{L}\p{N}\s\+]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // DATE
        let dObj = parseFolsDateCell(
          pick(r, ['PSER_DATE','PSER DATE','DATE_ARR','DATE ARR','Date','DATE','Arrival Date','ARRIVAL_DATE']) || ''
        );
        if (!dObj) {
          const m = (r.__text||'').match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
          if (m) {
            const dd=+m[1], mm=+m[2], yyyy=+m[3];
            dObj = new Date(Date.UTC(yyyy, mm-1, dd));
          }
        }
        let dateKey, dateLabel;
        if (!dObj && lastKey) { dateKey = lastKey; dateLabel = lastLabel; }
        else if (dObj) {
          const key = dObj.toISOString().split('T')[0];
          const label = toFrLabel(dObj);
          lastKey=key; lastLabel=label;
          dateKey=key; dateLabel=label;
        } else {
          dateKey='9999-12-31'; dateLabel='Non daté';
        }

        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            label: dateLabel,
            "2_sofa": [], "1_sofa": [],
            "lit_bebe": [], "comm": [],
            "dayuse": [], "early": []
          };
        }

        const sofaKey = `${adu}A+${enf}E`;
        const sofa = (RULES.sofa && RULES.sofa[sofaKey]) || "0";
        if (sofa === "1") grouped[dateKey]["1_sofa"].push(name);
        if (sofa === "2") grouped[dateKey]["2_sofa"].push(name);

        if (rx.baby && rx.baby.test(comment)) grouped[dateKey]["lit_bebe"].push(name);
        if (rx.comm && rx.comm.test(comment)) grouped[dateKey]["comm"].push(name);
        if (rx.dayuse && rx.dayuse.test(comment)) grouped[dateKey]["dayuse"].push(name);
        if (rx.early && rx.early.test(comment)) grouped[dateKey]["early"].push(name);
      }catch(err){
        console.warn('Ligne ignorée (parse error):', err);
      }
    });

    const keys = Object.keys(grouped).sort();
    if (!keys.length){
      out.innerHTML = '<p class="muted">Aucune donnée valide détectée.</p>';
      return;
    }

    // recouche
    const unionNames=(d)=>{
      const arr=[];
      ["2_sofa","1_sofa","lit_bebe","comm","dayuse","early"].forEach(cat=>{
        if(d[cat]?.length) arr.push(...d[cat]);
      });
      return Array.from(new Set(arr));
    };
    for(let i=0;i<keys.length;i++){
      const k=keys[i];
      grouped[k].__all = unionNames(grouped[k]);
      if(i>0){
        const prevSet = new Set(grouped[keys[i-1]].__all||[]);
        grouped[k].recouche = grouped[k].__all.filter(n=>prevSet.has(n));
      }else{
        grouped[k].recouche=[];
      }
    }

    keys.forEach(k=>{
      const data=grouped[k];
      const blk=document.createElement('div');
      blk.className='day-block';

      const h=document.createElement('div');
      h.className='day-header';
      h.textContent=`📅 ${data.label}`;

      const btn=document.createElement('button');
      btn.className='copy-btn';
      btn.textContent='📋 Copier';

      const copyText=[];
      if (data.recouche?.length) copyText.push(`🔁 RECOUCHE : ${data.recouche.join(', ')}`);
      if (data["2_sofa"].length) copyText.push(`🛋️ 2 SOFA : ${data["2_sofa"].join(', ')}`);
      if (data["1_sofa"].length) copyText.push(`🛋️ 1 SOFA : ${data["1_sofa"].join(', ')}`);
      if (data["lit_bebe"].length) copyText.push(`🍼 LIT BÉBÉ : ${data["lit_bebe"].join(', ')}`);
      if (data["comm"].length)     copyText.push(`🔗 COMMUNIQUANTE : ${data["comm"].join(', ')}`);
      if (data["dayuse"].length)   copyText.push(`⏰ DAY USE : ${data["dayuse"].join(', ')}`);
      if (data["early"].length)    copyText.push(`⏰ ARRIVÉE PRIORITAIRE : ${data["early"].join(', ')}`);

      btn.onclick=()=>{
        navigator.clipboard.writeText(copyText.join('\n'));
        btn.textContent='✔ Copié';
        setTimeout(()=>btn.textContent='📋 Copier',1200);
      };

      const ul=document.createElement('div');
      if (data.recouche?.length){
        const p=document.createElement('div');
        p.textContent=`🔁 RECOUCHE : ${data.recouche.join(', ')}`;
        ul.appendChild(p);
      }
      ["2_sofa","1_sofa","lit_bebe","comm","dayuse","early"].forEach(cat=>{
        if (data[cat].length){
          const p=document.createElement('div');
          const label=
            cat==="lit_bebe" ? "🍼 LIT BÉBÉ" :
            cat==="comm"     ? "🔗 COMMUNIQUANTE" :
            cat==="dayuse"   ? "⏰ DAY USE" :
            cat==="early"    ? "⏰ ARRIVÉE PRIORITAIRE" :
            cat==="2_sofa"   ? "🛋️ 2 SOFA" : "🛋️ 1 SOFA";
          p.textContent = `${label} : ${data[cat].join(', ')}`;
          ul.appendChild(p);
        }
      });

      blk.append(h, btn, ul);
      out.appendChild(blk);
    });
  }

  /* ---------- UPLOAD / IMPORT ---------- */
  const dropZone = byId('drop-zone');
  const fileInput = byId('file-input');
  if(dropZone && fileInput){
    dropZone.addEventListener('click', ()=> fileInput.click());
    ['dragenter','dragover'].forEach(ev=>dropZone.addEventListener(ev, e=>{e.preventDefault(); dropZone.style.borderColor='var(--brand)';}));
    ['dragleave','drop'].forEach(ev=>dropZone.addEventListener(ev, e=>{e.preventDefault(); dropZone.style.borderColor='var(--border)';}));
    dropZone.addEventListener('drop', e=>{
      const f = e.dataTransfer.files?.[0]; if(f) handleFile(f);
    });
    fileInput.addEventListener('change', e=>{
      const f = e.target.files?.[0]; if(f) handleFile(f);
    });
  }

  function handleFile(file){
    const isCSV = /\.csv$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = async (e)=>{
      try{
        let csvText='';
        if (isCSV){
          csvText = e.target.result;
        } else {
          if(!window.XLSX){ alert("Librairie XLSX non chargée."); return; }
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type:'array', cellDates:true, cellNF:false, cellText:false });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          csvText = XLSX.utils.sheet_to_csv(sheet, { FS: ';' });
        }

        // Parse & render IMMEDIATEMENT (ne bloque pas si GitHub échoue)
        processCsvText(csvText);

        // Save distant (optionnel, non bloquant)
        if(ghEnabled()){
          try{
            await ghSaveSnapshot({ csv: csvText, ts: new Date().toISOString() }, `Import AAR Soirée - ${file.name} (${new Date().toLocaleString("fr-FR")})`);
          }catch(err){
            console.warn('Sauvegarde GitHub échouée (affichage OK):', err);
            toast('⚠️ Sauvegarde GitHub échouée (affichage OK)');
          }
        }

      }catch(err){
        console.error(err);
        alert('Erreur pendant l’import: '+err.message);
      }
    };
    if (isCSV) reader.readAsText(file, 'utf-8');
    else reader.readAsArrayBuffer(file);
  }

  function processCsvText(csvText){
    const {header, blocks} = parseCsvHeaderAndBlocks(csvText);
    const rows = buildRowsFromBlocks(header, blocks);
    renderArrivalsFOLS_fromRows(rows);
  }

/* ---------- GITHUB STORAGE (optionnel, via proxy Vercel) ---------- */
function ghEnabled() {
  // ✅ Active le mode GitHub sur n’importe quel domaine si la config est renseignée
  return !!(window.GH_OWNER && window.GH_REPO && window.GH_PATH);
}

// 🔹 Lecture directe du fichier GitHub brut
async function ghGetContent() {
  try {
    const url = `https://raw.githubusercontent.com/${window.GH_OWNER}/${window.GH_REPO}/main/${window.GH_PATH}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`GitHub raw fetch failed: ${res.status}`);
    const text = await res.text();
    // ⚠️ Pas de ré-encodage Base64 ici ! On renvoie le texte brut
    return { content: text };
  } catch (err) {
    console.error("❌ Erreur ghGetContent:", err);
    throw err;
  }
}

// 🔹 Sauvegarde distante (JSON compressé ou CSV encapsulé)
async function ghSaveSnapshot(obj, message) {
  try {
    if (!ghEnabled()) {
      console.log("💡 GitHub non actif (mode local)");
      return;
    }

    if (!obj) throw new Error("Aucun contenu fourni à ghSaveSnapshot");
    if (typeof obj !== "object" || (!obj.csv && !obj.ts)) {
      throw new Error("Format invalide — ghSaveSnapshot attend un objet { csv, ts }");
    }

    // Encodage Base64 UTF-8
    const json = JSON.stringify(obj, null, 2);
    const content = btoa(unescape(encodeURIComponent(json)));

    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.GH_PATH,
        content,
        message: message || `maj auto ${new Date().toISOString()}`
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Erreur GitHub:", data);
      toast("⚠️ Erreur sauvegarde GitHub");
      return;
    }

    console.log("📤 Sauvegarde réussie:", data);
    toast("✅ Sauvegardé sur GitHub via proxy sécurisé");
    return data;
  } catch (err) {
    console.error("❌ ghSaveSnapshot Error:", err);
    toast("⚠️ Sauvegarde GitHub échouée");
  }
}

// 🔹 Chargement automatique de la dernière sauvegarde
async function ghLoadAndRenderIfAny() {
  if (!ghEnabled()) return;
  try {
    const meta = await ghGetContent();
    if (!meta?.content) return;

    let decoded = meta.content.trim();
    let data = null;

    // ✅ Gestion automatique JSON ou CSV
    try {
      data = JSON.parse(decoded);
    } catch {
      data = { csv: decoded };
    }

    if (data?.csv && data.csv.trim()) {
      processCsvText(data.csv);
      toast("☁️ Données restaurées depuis GitHub");
    } else {
      console.warn("⚠️ Format inconnu ou vide");
    }

  } catch (err) {
    console.warn("⚠️ Lecture GitHub impossible:", err);
    toast("⚠️ Erreur de lecture GitHub (mode local)");
  }
}

// 🔹 Mise à jour du statut GitHub
async function updateGhStatus() {
  const el = document.getElementById("gh-status");
  if (!el || !ghEnabled()) return;
  try {
    const meta = await ghGetContent();
    if (!meta?.content) {
      el.textContent = "⚠️ Aucune donnée GitHub";
      return;
    }

    let data;
    try { data = JSON.parse(meta.content); } catch { data = {}; }

    const ts = data.ts || new Date().toISOString();
    const local = new Date(ts).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
    el.textContent = `☁️ Dernier upload GitHub : ${local}`;
  } catch (err) {
    console.warn("Impossible d'afficher le statut GitHub:", err);
    el.textContent = "⚠️ Erreur GitHub";
  }
}

// 🔹 Auto-chargement à l'ouverture
window.addEventListener("DOMContentLoaded", async () => {
  try {
    if (ghEnabled()) {
      console.log("☁️ Mode proxy GitHub actif");
      await ghLoadAndRenderIfAny();
      await updateGhStatus();
    } else {
      console.log("💡 Mode local : aucun stockage GitHub détecté");
    }
  } catch (err) {
    console.warn("⚠️ Initialisation GitHub interrompue:", err);
  }
});

// --- Rendez ces fonctions accessibles depuis la console ---
window.ghSaveSnapshot = ghSaveSnapshot;
window.ghGetContent   = ghGetContent;
window.updateGhStatus = updateGhStatus;
window.ghEnabled      = ghEnabled;
