function readPassword(req) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  return String(body.password || '').trim();
}

export default function handler(req, res) {
  const configuredPassword = String(process.env.ORIS_ACCESS_PASSWORD || '').trim();
  const enabled = !!configuredPassword;

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, enabled });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!enabled) {
    return res.status(200).json({ ok: true, enabled: false });
  }

  const password = readPassword(req);
  if (password && password === configuredPassword) {
    return res.status(200).json({ ok: true, enabled: true });
  }

  return res.status(401).json({ ok: false, enabled: true, error: 'Mot de passe incorrect.' });
}
