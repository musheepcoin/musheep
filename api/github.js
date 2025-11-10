import fetch from "node-fetch"; // ✅ compatibilité Node 18+

export default async function handler(req, res) {
  try {
    // ✅ On autorise seulement POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ Lecture corps de requête
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { path, content, message } = body || {};

    // ✅ Config GitHub
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

    // 🔹 MODE LECTURE — optionnel
    if (message === "read") {
      const getRes = await fetch(url, { headers });
      const meta = await getRes.json();

      if (!getRes.ok) {
        console.error("❌ Lecture GitHub échouée:", meta);
        return res.status(getRes.status).json({ error: "Lecture GitHub échouée", meta });
      }

      if (meta && meta.content) {
        // ⚙️ On décode le base64 renvoyé par GitHub pour renvoyer du texte brut au front
        const decoded = Buffer.from(meta.content, "base64").toString("utf8");
        return res.status(200).json({ content: decoded });
      } else {
        console.warn("⚠️ Aucun champ content trouvé dans la réponse GitHub");
        return res.status(200).json({ content: null });
      }
    }

    // 🔹 Étape 1 — Récupération du SHA existant
    let sha;
    const getRes = await fetch(url, { headers });
    if (getRes.ok) {
      const meta = await getRes.json();
      sha = meta.sha;
    }

    // 🔹 Étape 2 — Validation du contenu reçu
    if (!content) {
      console.error("❌ Aucun content reçu du front !");
      return res.status(422).json({ error: "Missing content" });
    }

    // ❌ SUPPRIMÉ : encodage Base64 inutile (GitHub s’en charge)
    // const encodedContent = Buffer.from(content, "utf-8").toString("base64");

    // ✅ On envoie le texte brut, GitHub l’encode automatiquement
    const bodyPut = {
      message: message || `maj auto ${new Date().toISOString()}`,
      content: Buffer.from(content).toString("base64"), // ✅ encodage unique, conforme à la doc GitHub
      branch,
      ...(sha ? { sha } : {}),
    };

    // 🔹 Étape 3 — Upload GitHub
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
    console.log("✅ Upload GitHub réussi:", data.content?.path || path);
    res.status(200).json({ ok: true, data });

  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
}
