export default async function handler(req, res) {
  const { path, content, message } = req.body || {};
  const token = process.env.GH_TOKEN;
  const owner = "musheepcoin";
  const repo = "musheep";
  const branch = "main";

  if (!token) return res.status(500).json({ error: "Missing GH_TOKEN" });

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const get = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const meta = get.status === 404 ? {} : await get.json();
    const sha = meta.sha || undefined;

    const body = {
      message: message || `maj auto ${new Date().toISOString()}`,
      content,
      branch,
      ...(sha ? { sha } : {})
    };

    const put = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify(body)
    });

    if (!put.ok) {
      const text = await put.text();
      throw new Error(`GitHub error: ${text}`);
    }

    const data = await put.json();
    res.status(200).json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
