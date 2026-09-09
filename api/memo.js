import { isAuthenticated } from '../lib/auth-session.js';
import { getRemoteMemo, saveRemoteMemo, MemoStoreError } from '../lib/memo-store.js';

export function createMemoHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, private');
    if (!isAuthenticated(req, env)) return res.status(401).json({ error: 'Session ORIS requise.' });
    try {
      if (req.method === 'GET') return res.status(200).json(await getRemoteMemo({ env, fetchImpl }));
      if (req.method === 'POST') {
        let body;
        try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
        catch { throw new MemoStoreError('Mémo invalide.', 400); }
        return res.status(200).json(await saveRemoteMemo(body, { env, fetchImpl }));
      }
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
      const known = error instanceof MemoStoreError;
      return res.status(known ? error.status : 500).json({ error: known ? error.message : 'Erreur du mémo distant.', ...(known ? error.details : {}) });
    }
  };
}

export default createMemoHandler();
