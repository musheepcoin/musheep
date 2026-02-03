import fetch from "node-fetch"; // ✅ compatibilité Node 18+

export default async function handler(req, res) {
  try {
    // ✅ Anti-cache côté Vercel / proxy (CRITIQUE)
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

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

    // ✅ URLs : on sépare "base" (PUT) et "GET ref" (lecture meta)
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const urlRefBranch = `${baseUrl}?ref=${branch}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };

    // 🔹 MODE LECTURE — FIX FINAL : lire via SHA du HEAD (pas ref=main)
    if (message === "read") {
      // 1) Récupère le SHA du dernier commit de la branche
      const headUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`;
      const headRes = await fetch(headUrl, { headers, cache: "no-store" });
      const headJson = await headRes.json();

      if (!headRes.ok || !headJson?.sha) {
        console.error("❌ Lecture HEAD échouée:", headJson);
        return res
          .status(headRes.status || 500)
          .json({ error: "Impossible de lire le HEAD", meta: headJson });
      }

      const headSha = headJson.sha;

      // 2) Lit le fichier au SHA exact (immuable => plus de retard/cache de branche)
      const urlAtSha = `${baseUrl}?ref=${headSha}`;
      const getRes = await fetch(urlAtSha, { headers, cache: "no-store" });
      const meta = await getRes.json();

      if (!getRes.ok) {
        console.error("❌ Lecture GitHub échouée:", meta);
        return res.status(getRes.status).json({ error: "Lecture GitHub échouée", meta });
      }

      if (meta && meta.content) {
        const decoded = Buffer.from(meta.content, "base64").toString("utf8");
        return res.status(200).json({ content: decoded, headSha });
      } else {
        console.warn("⚠️ Aucun champ content trouvé dans la réponse GitHub");
        return res.status(200).json({ content: null, headSha });
      }
    }

    // 🔹 Étape 1 — Récupération du SHA existant (sur la branche)
    let sha;
    const getRes = await fetch(urlRefBranch, { headers, cache: "no-store" });
    if (getRes.ok) {
      const meta = await getRes.json();
      sha = meta.sha;
    }

    // 🔹 Étape 2 — Validation du contenu reçu
    if (!content) {
      console.error("❌ Aucun content reçu du front !");
      return res.status(422).json({ error: "Missing content" });
    }

    // ✅ Payload PUT
    const bodyPut = {
      message: message || `maj auto ${new Date().toISOString()}`,
      content: Buffer.from(content).toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    };

    // 🔹 Étape 3 — Upload GitHub (PUT sur baseUrl, sans ?ref=branch)
    const putRes = await fetch(baseUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(bodyPut),
      cache: "no-store",
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
