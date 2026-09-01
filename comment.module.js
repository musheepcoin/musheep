(function () {
  'use strict';
  const host = document.getElementById('comment-output');
  if (!host) return;
  const PREFS_KEY = 'oris_comment_preferences_v1';
  const EXAMPLES_LIMIT = 60000;
  const defaults = { tone: 'professional', length: 'balanced', language: 'auto', withGreeting: true, withSignature: false, signature: '', autoPaste: true, rememberExample: false };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (_) {}
  let tone = defaults.tone;
  let controller = null;
  let generation = 0;
  let pasteTimer = null;
  let resultFingerprint = '';
  let fileReadVersion = 0;

  host.innerHTML = `
    <div class="comment-head">
      <div><p class="comment-eyebrow">RÉCEPTION · LUNA</p><h1>Commentaire</h1><p>Une réponse juste, avec votre ton.</p></div>
      <span class="comment-badge">Brouillon · aucune publication automatique</span>
    </div>
    <div class="comment-workspace">
      <form id="comment-form" class="comment-panel">
        <div class="comment-section-heading"><h2>Le commentaire client</h2><button type="button" class="comment-text-button" id="comment-clear">Nouveau commentaire</button></div>
        <label class="comment-sr-only" for="comment-source">Commentaire client</label>
        <textarea id="comment-source" rows="7" maxlength="12000" required placeholder="Collez le commentaire ici… Vous pouvez aussi déposer un fichier .txt."></textarea>
        <div class="comment-input-meta"><label class="comment-toggle"><input type="checkbox" id="comment-auto-paste"> Générer dès le collage</label><span id="comment-count">0 / 12 000</span></div>
        <fieldset><legend>Le ton de la réponse</legend><div class="comment-tones" aria-label="Ton de la réponse">
          <button type="button" data-comment-tone="professional" aria-pressed="true">Professionnel</button>
          <button type="button" data-comment-tone="warm" aria-pressed="false">Chaleureux</button>
          <button type="button" data-comment-tone="empathetic" aria-pressed="false">Empathique</button>
          <button type="button" data-comment-tone="enthusiastic" aria-pressed="false">Enthousiaste</button>
          <button type="button" data-comment-tone="concise" aria-pressed="false">Sobre</button>
          <button type="button" data-comment-tone="diplomatic" aria-pressed="false">Diplomate</button>
        </div></fieldset>
        <div class="comment-options">
          <label for="comment-length">Longueur<select id="comment-length"><option value="short">Courte</option><option value="balanced" selected>Équilibrée</option><option value="detailed">Détaillée</option></select></label>
          <label for="comment-language">Langue<select id="comment-language"><option value="auto">Langue du commentaire</option><option value="fr">Français</option><option value="en">Anglais</option><option value="de">Allemand</option><option value="es">Espagnol</option><option value="it">Italien</option><option value="nl">Néerlandais</option></select></label>
        </div>
        <div class="comment-toggles"><label class="comment-toggle"><input type="checkbox" id="comment-greeting" checked> Salutation</label><label class="comment-toggle"><input type="checkbox" id="comment-with-signature"> Signature</label></div>
        <label id="comment-signature-wrap" hidden for="comment-signature">Votre signature exacte<input type="text" id="comment-signature" maxlength="300" placeholder="Ex. : Vincent · La réception"></label>
        <details class="comment-details"><summary>Contexte à préciser à Luna <span>facultatif</span></summary>
          <label for="comment-context">Faits vérifiés ou éléments à mentionner</label><textarea id="comment-context" rows="3" maxlength="4000" placeholder="Ex. : le client signale du bruit. Ne pas promettre de geste commercial."></textarea>
        </details>
        <details class="comment-details"><summary>Votre bibliothèque d’exemples <span>facultatif</span></summary>
          <label for="comment-examples">Liste d’exemples pour Luna</label>
          <p class="comment-privacy" id="comment-examples-help">Collez plusieurs avis avec leur réponse, ou une liste de réponses modèles. Séparez les exemples par une ligne vide. Luna s’en inspire pour le style, sans répondre à chaque exemple.</p>
          <textarea id="comment-examples" rows="14" maxlength="60000" aria-describedby="comment-examples-help comment-examples-count" placeholder="EXEMPLE 1&#10;Avis : Très bon accueil…&#10;Réponse : Merci pour votre retour…&#10;&#10;EXEMPLE 2&#10;Avis : La chambre était bruyante…&#10;Réponse : Nous comprenons votre déception…&#10;&#10;Ajoutez ici toute votre liste d’exemples, anonymisés."></textarea>
          <div class="comment-input-meta"><span id="comment-examples-count">0 / 60 000 caractères</span></div>
          <label class="comment-toggle"><input type="checkbox" id="comment-remember-example"> Mémoriser ces exemples sur cet ordinateur</label>
        </details>
        <div class="comment-generate-row"><button type="submit" class="comment-primary" id="comment-generate">Générer avec Luna</button><button type="button" class="comment-secondary" id="comment-cancel" hidden>Annuler</button></div>
        <p class="comment-privacy">À chaque génération, le commentaire, le contexte et les exemples sont envoyés à Luna via l’API OpenAI. Une longue liste augmente le volume envoyé. Anonymisez les données inutiles. ORIS ne conserve pas le commentaire ni le brouillon après rechargement.</p>
      </form>
      <section class="comment-panel comment-result-panel" aria-labelledby="comment-result-title">
        <div class="comment-section-heading"><div><p class="comment-eyebrow">VOTRE RÉPONSE</p><h2 id="comment-result-title">Prête à relire, puis à copier</h2></div><button type="button" class="comment-secondary" id="comment-copy" disabled>Copier</button></div>
        <p id="comment-status" role="status" aria-live="polite">Collez un commentaire pour commencer.</p>
        <label class="comment-sr-only" for="comment-reply">Réponse modifiable</label>
        <textarea id="comment-reply" rows="18" maxlength="15000" placeholder="La proposition de Luna apparaîtra ici. Vous pourrez la modifier avant de la copier."></textarea>
        <p class="comment-privacy">Vérifiez les faits avant publication. Luna ne doit pas inventer d’engagement, de remboursement ou d’action déjà effectuée.</p>
      </section>
    </div>`;

  const el = id => host.querySelector(`#comment-${id}`);
  const toneButtons = Array.from(host.querySelectorAll('[data-comment-tone]'));
  const requestFields = ['source', 'length', 'language', 'greeting', 'with-signature', 'signature', 'context', 'examples'];
  function status(message, state = '') {
    el('status').textContent = message;
    el('status').dataset.state = state;
  }
  function payload() {
    return { comment: el('source').value, tone, length: el('length').value, language: el('language').value,
      withGreeting: el('greeting').checked, withSignature: el('with-signature').checked,
      signature: el('signature').value, context: el('context').value,
      examples: el('examples').value };
  }
  function fingerprint() { return JSON.stringify(payload()); }
  function syncControls() {
    el('generate').disabled = !!controller || !el('source').value.trim();
    el('generate').textContent = controller ? 'Luna rédige…' : (el('reply').value ? 'Régénérer avec Luna' : 'Générer avec Luna');
    el('cancel').hidden = !controller;
    el('reply').readOnly = !!controller;
    el('copy').disabled = !!controller || !el('reply').value.trim() || resultFingerprint !== fingerprint();
    el('signature-wrap').hidden = !el('with-signature').checked;
    el('signature').required = el('with-signature').checked;
    el('count').textContent = `${el('source').value.length.toLocaleString('fr-FR')} / 12 000`;
    el('examples-count').textContent = `${el('examples').value.length.toLocaleString('fr-FR')} / 60 000 caractères`;
    el('form').setAttribute('aria-busy', String(!!controller));
  }
  function persistPreferences() {
    const preferences = { tone, length: el('length').value, language: el('language').value,
      withGreeting: el('greeting').checked, withSignature: el('with-signature').checked,
      signature: el('signature').value, autoPaste: el('auto-paste').checked, rememberExample: el('remember-example').checked };
    if (preferences.rememberExample) {
      preferences.examples = el('examples').value;
    }
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(preferences)); } catch (_) {}
  }
  function cancelPending() {
    clearTimeout(pasteTimer);
    generation += 1;
    controller?.abort();
    controller = null;
  }
  function changed() {
    const wasPending = !!controller;
    cancelPending();
    fileReadVersion += 1;
    if (el('reply').value && resultFingerprint !== fingerprint()) status('Commentaire ou réglages modifiés : régénérez la réponse avant de la copier.', 'stale');
    else if (wasPending) status('Génération interrompue après modification. Relancez Luna.');
    else if (!el('reply').value) status('Prêt à générer une réponse.');
    persistPreferences();
    syncControls();
  }
  function selectTone(next) {
    if (!toneButtons.some(button => button.dataset.commentTone === next)) next = defaults.tone;
    tone = next;
    toneButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.commentTone === tone)));
  }
  function apiUrl() {
    let base = String(window.ORIS_API_BASE || '').trim();
    try { base ||= String(localStorage.getItem('oris_api_base') || '').trim(); } catch (_) {}
    if (!base && window.location.protocol === 'file:') base = 'http://127.0.0.1:8787';
    return `${base.replace(/\/+$/, '')}/api/reply-comment`;
  }
  async function generate() {
    clearTimeout(pasteTimer);
    if (controller) return;
    if (!el('form').reportValidity()) return;
    if (!el('source').value.trim()) { status('Collez un commentaire avant de lancer Luna.', 'error'); return; }
    if (el('examples').value.length > EXAMPLES_LIMIT) { status('La liste d’exemples dépasse 60 000 caractères. Réduisez-la avant de générer.', 'error'); return; }
    const input = payload();
    const requestFingerprint = fingerprint();
    const id = ++generation;
    const active = new AbortController();
    controller = active;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; active.abort(); }, 125000);
    status('Luna prépare votre réponse…', 'loading');
    syncControls();
    try {
      const response = await fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: active.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'API Commentaire indisponible. Vérifiez que le serveur ORIS est à jour.');
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Luna a renvoyé une réponse vide. Réessayez.');
      if (id !== generation || requestFingerprint !== fingerprint()) return;
      el('reply').value = data.reply;
      resultFingerprint = requestFingerprint;
      status('Réponse prête. Vous pouvez la modifier puis la copier.', 'success');
    } catch (error) {
      if (id !== generation) return;
      const message = timedOut ? 'Délai Luna dépassé. Réessayez.' : error?.name === 'AbortError' ? 'Génération annulée.' : /failed to fetch|networkerror|load failed/i.test(error?.message || '') ? 'API Luna inaccessible. Ouvrez ORIS via le serveur local ou vérifiez la connexion.' : error.message;
      status(message || 'Impossible de générer la réponse.', 'error');
    } finally {
      clearTimeout(timeout);
      if (id === generation) { controller = null; syncControls(); }
    }
  }
  function schedulePaste() {
    clearTimeout(pasteTimer);
    if (el('auto-paste').checked) pasteTimer = setTimeout(generate, 250);
  }
  selectTone(saved.tone);
  for (const name of ['length', 'language']) {
    el(name).value = saved[name] || defaults[name];
    if (!el(name).value) el(name).value = defaults[name];
  }
  for (const [id, key] of [['greeting', 'withGreeting'], ['with-signature', 'withSignature'], ['auto-paste', 'autoPaste'], ['remember-example', 'rememberExample']]) {
    el(id).checked = typeof saved[key] === 'boolean' ? saved[key] : defaults[key];
  }
  el('signature').value = typeof saved.signature === 'string' ? saved.signature.slice(0, 300) : '';
  if (el('remember-example').checked) {
    // Conserver l'ancien couple avis/réponse mémorisé dans le nouveau champ.
    el('examples').value = typeof saved.examples === 'string' ? saved.examples : [
      typeof saved.exampleComment === 'string' && saved.exampleComment ? `Avis : ${saved.exampleComment}` : '',
      typeof saved.exampleReply === 'string' && saved.exampleReply ? `Réponse : ${saved.exampleReply}` : ''
    ].filter(Boolean).join('\n\n');
  }
  toneButtons.forEach(button => button.addEventListener('click', () => { selectTone(button.dataset.commentTone); changed(); }));
  requestFields.forEach(id => el(id).addEventListener('input', changed));
  el('auto-paste').addEventListener('change', () => { clearTimeout(pasteTimer); persistPreferences(); });
  el('remember-example').addEventListener('change', persistPreferences);
  el('form').addEventListener('submit', event => { event.preventDefault(); generate(); });
  el('source').addEventListener('paste', () => {
    // L'événement input natif vient après paste : planifier après l'insertion.
    setTimeout(schedulePaste, 0);
  });
  el('examples').addEventListener('paste', event => {
    const text = event.clipboardData?.getData('text/plain');
    if (typeof text !== 'string') return;
    const field = el('examples');
    const nextLength = field.value.length - (field.selectionEnd - field.selectionStart) + text.length;
    if (nextLength > EXAMPLES_LIMIT) {
      event.preventDefault();
      status('Cette liste dépasse 60 000 caractères. Le collage est refusé pour ne pas couper vos exemples.', 'error');
    }
  });
  el('source').addEventListener('dragover', event => { event.preventDefault(); el('source').classList.add('is-dragover'); });
  el('source').addEventListener('dragleave', () => el('source').classList.remove('is-dragover'));
  el('source').addEventListener('drop', async event => {
    event.preventDefault();
    el('source').classList.remove('is-dragover');
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (!/\.txt$/i.test(file.name) || file.size > 48000) { status('Déposez un fichier .txt de moins de 48 Ko, ou collez le texte.', 'error'); return; }
    changed();
    const version = ++fileReadVersion;
    try {
      const text = await file.text();
      if (version !== fileReadVersion) return;
      if (text.length > 12000) { status('Le commentaire dépasse 12 000 caractères.', 'error'); return; }
      el('source').value = text;
      changed();
      schedulePaste();
    } catch { status('Lecture du fichier impossible.', 'error'); }
  });
  el('cancel').addEventListener('click', () => { cancelPending(); syncControls(); status('Génération annulée.'); });
  el('clear').addEventListener('click', () => {
    cancelPending(); fileReadVersion += 1;
    el('source').value = ''; el('context').value = ''; el('reply').value = ''; resultFingerprint = '';
    syncControls(); status('Collez un nouveau commentaire.'); el('source').focus();
  });
  el('reply').addEventListener('input', syncControls);
  el('copy').addEventListener('click', async () => {
    if (el('copy').disabled) return;
    try { await navigator.clipboard.writeText(el('reply').value); status('Réponse copiée.', 'success'); }
    catch { el('reply').focus(); el('reply').select(); status('Copie automatique indisponible : utilisez Ctrl+C sur le texte sélectionné.'); }
  });
  syncControls();
})();
