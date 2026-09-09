import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createSessionToken, isAuthenticated, setSessionCookie, verifyPassword } from '../lib/auth-session.js';
import { encryptMemo, decryptMemo, getRemoteMemo, saveRemoteMemo } from '../lib/memo-store.js';
import { createMemoHandler } from '../api/memo.js';

const env = { ORIS_ACCESS_PASSWORD:'mot-de-passe-test', GH_TOKEN:'token-github-test' };
function requestWithSession(method = 'GET', body) {
  const token = createSessionToken(env, Date.UTC(2026, 8, 4));
  return { method, body, headers:{ cookie:`oris_session=${encodeURIComponent(token)}` } };
}
function response() {
  return { headers:{}, setHeader(k,v){ this.headers[k]=v; }, status(code){ this.code=code; return this; }, json(body){ this.body=body; return this; } };
}
function github(initial = null) {
  let stored = initial, sha = initial ? 'sha-1' : '', serial = initial ? 1 : 0;
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (!options.method) {
      if (!stored) return { status:404, ok:false, json:async()=>({}) };
      return { status:200, ok:true, json:async()=>({ sha, content:Buffer.from(stored).toString('base64') }) };
    }
    const sent = JSON.parse(options.body);
    if (sha && sent.sha !== sha) return { status:409, ok:false, json:async()=>({}) };
    stored = Buffer.from(sent.content, 'base64').toString('utf8');
    sha = `sha-${++serial}`;
    return { status:200, ok:true, json:async()=>({ content:{ sha } }) };
  };
  return { fetchImpl, calls, stored:()=>stored, sha:()=>sha, externalWrite(value){ stored=value; sha=`sha-${++serial}`; } };
}

test('session ORIS : cookie signé, expiration et mauvais mot de passe refusés', () => {
  const now = Date.UTC(2026, 8, 4);
  const token = createSessionToken(env, now);
  assert.equal(isAuthenticated({ headers:{ cookie:`x=1; oris_session=${token}` } }, env, now), true);
  assert.equal(isAuthenticated({ headers:{ cookie:`oris_session=${token}x` } }, env, now), false);
  assert.equal(isAuthenticated({ headers:{ cookie:`oris_session=${token}` } }, env, now + 8 * 86400000), false);
  assert.equal(verifyPassword('mot-de-passe-test', env), true);
  assert.equal(verifyPassword('mauvais', env), false);
  const res = response();
  setSessionCookie({ headers:{ 'x-forwarded-proto':'https' } }, res, env);
  assert.match(res.headers['Set-Cookie'], /HttpOnly; SameSite=Strict; Max-Age=604800; Secure$/);
});

test('mémo : chiffrement authentifié, aucun texte lisible et mauvaise clé refusée', () => {
  const encrypted = encryptMemo({ text:'Note interne très sensible', updatedAt:'2026-09-04T10:00:00.000Z' }, env.ORIS_ACCESS_PASSWORD);
  assert.doesNotMatch(encrypted, /Note interne|sensible/);
  assert.match(encrypted, /"kdf":"scrypt"/);
  assert.equal(decryptMemo(encrypted, env.ORIS_ACCESS_PASSWORD).text, 'Note interne très sensible');
  assert.throws(()=>decryptMemo(encrypted, 'autre-clé'));
});

test('mémo : création et relecture utilisent uniquement le chemin distant fixe', async () => {
  const gh = github();
  assert.deepEqual(await getRemoteMemo({ env, fetchImpl:gh.fetchImpl }), { exists:false, revision:'', text:'', updatedAt:'' });
  const saved = await saveRemoteMemo({ text:'Mémo partagé', baseRevision:'' }, { env, fetchImpl:gh.fetchImpl, now:()=>new Date('2026-09-04T11:00:00Z') });
  assert.equal(saved.revision, 'sha-1');
  assert.doesNotMatch(gh.stored(), /Mémo partagé/);
  const loaded = await getRemoteMemo({ env, fetchImpl:gh.fetchImpl });
  assert.equal(loaded.text, 'Mémo partagé'); assert.equal(loaded.updatedAt, '2026-09-04T11:00:00.000Z');
  assert.ok(gh.calls.every(call=>call.url.includes('/musheepcoin/musheep/contents/data/memo.private.json')));
});

test('mémo : un SHA périmé bloque l’écrasement provenant d’un autre PC', async () => {
  const first = encryptMemo({ text:'PC A', updatedAt:'2026-09-04T10:00:00Z' }, env.ORIS_ACCESS_PASSWORD);
  const gh = github(first);
  await assert.rejects(saveRemoteMemo({ text:'PC B', baseRevision:'ancien-sha' }, { env, fetchImpl:gh.fetchImpl }), error=>error.status===409 && error.details.revision==='sha-1');
  assert.equal((await getRemoteMemo({ env, fetchImpl:gh.fetchImpl })).text, 'PC A');
});

test('route Mémo : session exigée, méthodes bornées et erreurs JSON propres', async () => {
  const gh = github();
  const handler = createMemoHandler({ env, fetchImpl:gh.fetchImpl });
  const unauth = response(); await handler({ method:'GET', headers:{} }, unauth); assert.equal(unauth.code, 401);
  const read = response(); await handler(requestWithSession(), read); assert.equal(read.code, 200); assert.equal(read.body.exists, false);
  const invalid = response(); await handler(requestWithSession('POST', '{'), invalid); assert.equal(invalid.code, 400);
  const method = response(); await handler(requestWithSession('DELETE'), method); assert.equal(method.code, 405); assert.equal(method.headers.Allow, 'GET, POST');
  assert.equal(read.headers['Cache-Control'], 'no-store, private');
});

test('interface Mémo : Save explicite, chargement distant, limite et messages de conflit présents', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
  assert.match(html, /id="memo-save"[^>]*>Save</);
  assert.match(html, /id="memo-load"[^>]*>Charger en ligne</);
  assert.match(html, /id="memo" maxlength="100000"/);
  assert.match(script, /baseRevision:memoRemoteRevision/);
  assert.match(script, /Le mémo a changé sur un autre PC/);
  assert.match(script, /window\.ORIS_MEMO_SYNC/);
});
