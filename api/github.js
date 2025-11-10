import fetch from "node-fetch";

export default async function handler(req, res) {
  const log = (...args) => console.log("🧩", ...args);

  try {
    const token = process.env.GH_TOKEN;
    const owner = "musheepcoin";
    const repo = "musheep";
    const branch = "main";
    const { path, content, message } =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    log("🔹 METHOD:", req.method, "PATH:", path);

    if (!token) {
      log("❌ Token manquant !");
      return res.status(500).json({ error: "Missing GH_TOKEN" });
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json"
    };

    // 🔸 Gestion GET
    if (req.method === "GET") {
      log("➡️ Lecture depuis GitHub:", url);
      const r = await fetch(url, { headers });
      const text = await r.text();
      log("📥 Réponse GET:", r.status, text.slice(0, 200));
      return res.status(r.status).send(text);
    }

    // 🔸 Gestion POST
    if (req.method === "POST") {
      log("➡️ Écriture GitHub:", url);

      const getRes = await fetch(url, { headers });
      const metaTxt = await getRes.text();
      log("📄 Meta GET:", getRes.status, metaTxt.slice(0, 200));
      const sha = getRes.status === 200 ? JSON.parse(metaTxt).sha : undefined;

      const body = {
        message: message || `maj auto ${new Date().toISOString()}`,
        content,
        branch,
        ...(sha ? { sha } : {})
      };

      log("📤 PUT body:", body);

      const putRes = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
      });

      const text = await putRes.text();
      log("📥 PUT Response:", putRes.status, text.slice(0, 200));

      if (!putRes.ok) {
        throw new Error(`GitHub PUT failed: ${text}`);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ Proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}
