(function(){
  'use strict';

  const SESSION_KEY = 'oris_session_unlocked_v1';
  const AUTH_URL = '/api/auth';

  function byId(id){ return document.getElementById(id); }

  function setLocked(locked){
    document.body.classList.toggle('oris-auth-locked', !!locked);
    document.body.classList.toggle('oris-auth-ready', !locked);
  }

  function setMessage(text, kind = ''){
    const el = byId('oris-auth-message');
    if (!el) return;
    el.textContent = text || '';
    el.className = kind ? `oris-auth-message is-${kind}` : 'oris-auth-message';
  }

  function unlock(){
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (_) {}
    setLocked(false);
  }

  async function authFetch(options = {}){
    const response = await fetch(AUTH_URL, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  async function checkAuthStatus(){
    if (window.location.protocol === 'file:') {
      unlock();
      return;
    }

    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      unlock();
      return;
    }

    setLocked(true);
    try {
      const { data } = await authFetch({ method: 'GET' });
      if (!data.enabled) {
        unlock();
        return;
      }
      setMessage('Entre le mot de passe ORIS pour ouvrir la session.', 'info');
    } catch (err) {
      setMessage('Authentification indisponible. Lance ORIS via le serveur local ou Vercel.', 'error');
    }
  }

  async function submitPassword(event){
    event.preventDefault();
    const form = event.currentTarget;
    const input = byId('oris-auth-password');
    const button = byId('oris-auth-submit');
    const password = String(input?.value || '').trim();
    if (!password) {
      setMessage('Mot de passe requis.', 'error');
      input?.focus();
      return;
    }

    if (button) button.disabled = true;
    setMessage('Vérification…', 'info');
    try {
      const { response, data } = await authFetch({
        method: 'POST',
        body: JSON.stringify({ password })
      });
      if (response.ok && data.ok) {
        form.reset();
        unlock();
        return;
      }
      setMessage(data.error || 'Mot de passe incorrect.', 'error');
      input?.focus();
    } catch (err) {
      setMessage('Impossible de vérifier le mot de passe.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  window.ORIS_AUTH = {
    lock(){
      try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
      setLocked(true);
    },
    unlock
  };

  document.addEventListener('DOMContentLoaded', () => {
    byId('oris-auth-form')?.addEventListener('submit', submitPassword);
    checkAuthStatus();
  });
})();
