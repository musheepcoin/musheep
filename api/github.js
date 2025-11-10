// /api/github.js

import fetch from "node-fetch"; // ✅ Ajout essentiel pour Vercel (Node 18+)

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ Assure-toi que le body est bien parsé
    const { path, content, message } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const token = process.env.GH_TOKEN;
    const owner = "musheepcoin";
    const repo = "musheep";
    const branch = "main";

    if (!token) {
      console.error("❌ GH_TOKEN manquant dans les variables d’environnement");
      return res.status(500).json({ error: "Missing GH_TOKEN" });
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json"
    };

    // 🔹 Étape 1 : récupérer le SHA (si le fichier existe)
    const getRes = await fetch(url, { headers });
    let sha;
    if (getRes.status === 200) {
      const meta = await getRes.json();
      sha = meta.sha;
    }

    // 🔹 Étape 2 : mise à jour du contenu
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

    if (!putRes.ok) {
      const text = await putRes.text();
      console.error("❌ GitHub PUT error:", text);
      return res.status(500).json({ error: `GitHub error: ${text}` });
    }

    const data = await putRes.json();
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("❌ Proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}

