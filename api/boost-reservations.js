function cleanModelRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('Requete BOOST invalide.');
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) throw new Error('Messages LLM manquants.');
  return {
    model: body.model || body.modelHint || 'gpt-5.6-luna',
    messages,
    temperature: Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : 0.1,
    max_completion_tokens: Math.min(16000, Math.max(800, Number(body.maxOutputTokens || 2500)))
  };
}

function parseJsonModelText(text) {
  const raw = String(text || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(raw || '{"usefulItems":[]}');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY manquante dans Vercel.');

    const modelRequest = cleanModelRequest(req.body);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelRequest.model,
        messages: modelRequest.messages,
        temperature: modelRequest.temperature,
        max_completion_tokens: modelRequest.max_completion_tokens,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.error?.message || `Erreur OpenAI ${response.status}`;
      throw new Error(detail);
    }

    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonModelText(content);
    return res.status(200).json(parsed && Array.isArray(parsed.usefulItems) ? parsed : { usefulItems: [] });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
