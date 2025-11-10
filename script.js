/* ========== CONFIGURATION ========== */
const GITHUB_USER = "musheepcoin";         // Ton pseudo GitHub
const GITHUB_REPO = "musheep";             // Nom du repo
const GITHUB_BRANCH = "main";              // Branche (main ou master)
const GITHUB_FILE_PATH = "data.json";      // Fichier où sauvegarder les imports
const GITHUB_TOKEN = "ghp_xxxxxTON_TOKEN_ICIxxxxx"; // ⚠️ ton token personnel GitHub

/* ========== BASE LOGIQUE AAR ========== */
const LS_RULES='aar_soiree_rules_v2'; 
const LS_CHECK='aar_checklist_v2'; 
const LS_MEMO='aar_memo_v2';
const LS_MAILS='aar_mail_models_v3';
const API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

/* Récupération automatique du dernier fichier en ligne */
async function fetchLastImport(){
  try{
    const res = await fetch(`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_FILE_PATH}?${Date.now()}`);
    if(!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    if(json && json.csvText){
      console.log("✅ Dernier import restauré depuis GitHub");
      processCsvText(json.csvText);
    }
  }catch(e){ console.warn("⚠️ Aucun fichier distant détecté"); }
}

/* Sauvegarde auto du CSV sur GitHub */
async function saveToGitHub(csvText){
  const message = `maj auto ${new Date().toISOString()}`;
  const encoded = btoa(JSON.stringify({ csvText, updated: new Date().toISOString() }));
  
  // On récupère le sha du fichier s’il existe (obligatoire pour mise à jour)
  let sha = null;
  try {
    const r = await fetch(API_BASE);
    if(r.ok){ const data = await r.json(); sha = data.sha; }
  } catch(_) {}

  const body = {
    message,
    content: encoded,
    branch: GITHUB_BRANCH,
    ...(sha ? {sha} : {})
  };

  const res = await fetch(API_BASE, {
    method: "PUT",
    headers: {
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if(res.ok){
    console.log("✅ Fichier data.json mis à jour sur GitHub");
  } else {
    console.error("❌ Erreur upload GitHub", await res.text());
  }
}

/* === MODIF handleFile() === */
async function handleFile(file){
  const isCSV = /\.csv$/i.test(file.name);
  const reader = new FileReader();
  reader.onload = async e=>{
    let csvText = '';
    if (isCSV) csvText = e.target.result;
    else {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type:'array', cellDates:true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      csvText = XLSX.utils.sheet_to_csv(sheet, { FS: ';' });
    }
    processCsvText(csvText);
    await saveToGitHub(csvText); // ✅ Sauvegarde cloud
  };
  if (isCSV) reader.readAsText(file, 'utf-8');
  else reader.readAsArrayBuffer(file);
}

/* === Auto chargement du fichier cloud au démarrage === */
window.addEventListener("DOMContentLoaded", fetchLastImport);
