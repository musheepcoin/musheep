import fetch from "node-fetch"; // ✅ pour compatibilité Node 18+

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { path, content, message } = body || {};

    const token = process.env.GH_TOKEN;
    const owner = "musheepcoin";
    const repo = "musheep";
    const branch = "main";

    if (!token) {
      console.error("❌ GH_TOKEN manquant côté serveur");
      return res.status(500).json({ error: "Missing GH_TOKEN" });
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    };

    // 🔹 NOUVEAU : mode lecture (GET du contenu GitHub)
    if (message === "read") {
      const getRes = await fetch(url, { headers });
      const meta = await getRes.json();

      if (!getRes.ok) {
        console.error("❌ Lecture GitHub échouée:", meta);
        return res.status(getRes.status).json({ error: "Lecture GitHub échouée", meta });
      }

      // On ne renvoie que le champ "content" attendu par le front
      if (meta && meta.content) {
        return res.status(200).json({ content: meta.content });
      } else {
        console.warn("⚠️ Aucun champ content trouvé dans la réponse GitHub");
        return res.status(200).json({ content: null });
      }
    }

    // 🔹 Étape 1 — Récupérer le SHA du fichier pour mise à jour
    let sha = undefined;
    const getRes = await fetch(url, { headers });
    if (getRes.status === 200) {
      const meta = await getRes.json();
      sha = meta.sha;
    }

    // 🔹 Étape 2 — Encodage base64 automatique
    if (!content) {
      console.error("❌ Aucun content reçu du front !");
      return res.status(422).json({ error: "Missing content" });
    }

    const encodedContent = Buffer.from(content, "utf-8").toString("base64");

    const bodyPut = {
      message: message || `maj auto ${new Date().toISOString()}`,
      content: encodedContent,
      branch,
      ...(sha ? { sha } : {}),
    };

    // 🔹 Étape 3 — Upload GitHub (PUT)
    const putRes = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(bodyPut),
    });

    if (!putRes.ok) {
      const text = await putRes.text();
      console.error("❌ GitHub PUT failed:", text);
      throw new Error(`GitHub PUT failed: ${text}`);
    }

    const data = await putRes.json();
    res.status(200).json({ ok: true, data });

  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
}
