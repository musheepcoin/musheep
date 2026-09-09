import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

export class MemoStoreError extends Error {
  constructor(message, status = 500, details = {}) { super(message); this.status = status; this.details = details; }
}

const OWNER = 'musheepcoin';
const REPO = 'musheep';
const BRANCH = 'main';
const PATH = 'data/memo.private.json';
const LIMIT = 100000;

function config(env) {
  const token = String(env.GH_TOKEN || '').trim();
  const secret = String(env.ORIS_ACCESS_PASSWORD || '').trim();
  if (!token) throw new MemoStoreError('Stockage distant indisponible : GH_TOKEN absent.', 503);
  if (!secret) throw new MemoStoreError('Stockage distant protégé indisponible : mot de passe ORIS absent.', 503);
  return { token, secret };
}
function headers(token) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
}
function key(secret, salt) { return scryptSync(secret, salt, 32); }
export function encryptMemo(value, secret) {
  const iv = randomBytes(12);
  const salt = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key(secret, salt), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ v: 1, alg: 'A256GCM', kdf: 'scrypt', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
}
export function decryptMemo(raw, secret) {
  try {
    const envelope = JSON.parse(raw);
    if (envelope?.v !== 1 || envelope?.alg !== 'A256GCM' || envelope?.kdf !== 'scrypt') throw new Error('format');
    const decipher = createDecipheriv('aes-256-gcm', key(secret, Buffer.from(envelope.salt, 'base64')), Buffer.from(envelope.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'));
  } catch { throw new MemoStoreError('Le mémo distant est illisible ou utilise une autre clé ORIS.', 500); }
}
async function readRemote(env, fetchImpl) {
  const { token, secret } = config(env);
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?ref=${BRANCH}`;
  const response = await fetchImpl(url, { headers: headers(token), cache: 'no-store' });
  if (response.status === 404) return { exists: false, revision: '', text: '', updatedAt: '' };
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.content || !data?.sha) throw new MemoStoreError('Impossible de lire le mémo distant.', 502);
  const decoded = Buffer.from(String(data.content).replace(/\s/g, ''), 'base64').toString('utf8');
  const memo = decryptMemo(decoded, secret);
  return { exists: true, revision: data.sha, text: String(memo.text || ''), updatedAt: String(memo.updatedAt || '') };
}
export async function getRemoteMemo({ env = process.env, fetchImpl = fetch } = {}) {
  return readRemote(env, fetchImpl);
}
export async function saveRemoteMemo(input, { env = process.env, fetchImpl = fetch, now = () => new Date() } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.text !== 'string' || input.text.length > LIMIT || typeof input.baseRevision !== 'string') {
    throw new MemoStoreError('Mémo invalide ou trop long.', 400);
  }
  const current = await readRemote(env, fetchImpl);
  if (input.baseRevision !== current.revision) {
    throw new MemoStoreError('Le mémo a été modifié sur un autre PC.', 409, { revision: current.revision, updatedAt: current.updatedAt });
  }
  const { token, secret } = config(env);
  const updatedAt = now().toISOString();
  const encrypted = encryptMemo({ text: input.text, updatedAt }, secret);
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
  const response = await fetchImpl(url, {
    method: 'PUT', headers: headers(token), cache: 'no-store',
    body: JSON.stringify({ message: 'Mise à jour du mémo ORIS', content: Buffer.from(encrypted).toString('base64'), branch: BRANCH, ...(current.revision ? { sha: current.revision } : {}) })
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 409 || response.status === 422) throw new MemoStoreError('Le mémo a été modifié pendant la sauvegarde.', 409);
  if (!response.ok || !data?.content?.sha) throw new MemoStoreError('Impossible de sauvegarder le mémo distant.', 502);
  return { ok: true, revision: data.content.sha, updatedAt };
}
