import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const token = process.env.GH_TOKEN;
    const owner = "musheepcoin";
    const repo = "musheep";
    const branch = "main";
    const { path, content, message } =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    if (!token) return res.status(500).json({ error: "Missing GH_TOKEN" });

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json"
    };

    // 🟢 1. GESTION DU GET (lecture du fichier GitHub)
    if (req.method === "GET") {
      console.log("🔹 Lecture proxy GET:", path);
      const r = await fetch(url, { headers });
      const data = await r.json();
      if (!r.ok) {
        console.error("❌ GET GitHub error:", data);
        return res.status(r.status).json({ error: data });
      }
      return res.status(200).json(data);
    }

    // 🟢 2. GESTION DU POST (création / mise à jour)
    if (req.method === "POST") {
      console.log("🔹 Écriture proxy POST:", path);
      const getRes = await fetch(url, { headers });
      const sha = getRes.status === 200 ? (await getRes.json()).sha : undefined;

      const body = {
        message: message || `maj auto ${new Date().toISOString()}`,
        content,
        branch,
        ...(sha ? { sha } : {})
      };

      const putRes = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
      });

      const text = await putRes.text();
      if (!putRes.ok) {
        console.error("❌ PUT GitHub error:", text);
        throw new Error(text);
      }

      const data = JSON.parse(text);
      return res.status(200).json({ ok: true, data });
    }

    // 🚫 3. Autres méthodes non supportées
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}
