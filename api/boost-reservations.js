function configuredModel() {
  return process.env.OPENAI_MODEL || 'gpt-5.6-luna';
}

function configuredTimeoutMs() {
  return Number(process.env.OPENAI_TIMEOUT_MS || 60000);
}

function cleanModelRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('Requete Analyse Luna invalide.');
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) throw new Error('Messages LLM manquants.');
  return {
    model: configuredModel(),
    messages,
    max_completion_tokens: Math.min(16000, Math.max(800, Number(body.maxOutputTokens || 2500)))
  };
}

function parseJsonModelText(text) {
  const raw = String(text || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(raw || '{"controlAudits":[],"operationNotes":[]}');
}

function extractUsefulPayload(data) {
  const content = data?.choices?.[0]?.message?.content || '';
  const parsed = parseJsonModelText(content);
  if (!parsed || typeof parsed !== 'object') return { controlAudits: [], operationNotes: [], usefulItems: [] };
  const controlAudits = Array.isArray(parsed.controlAudits) ? parsed.controlAudits : [];
  const operationNotes = Array.isArray(parsed.operationNotes) ? parsed.operationNotes : [];
  const usefulItems = Array.isArray(parsed.usefulItems) ? parsed.usefulItems : [...controlAudits, ...operationNotes];
  return { ...parsed, controlAudits, operationNotes, usefulItems };
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), configuredTimeoutMs());
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelRequest.model,
        messages: modelRequest.messages,
        max_completion_tokens: modelRequest.max_completion_tokens,
        response_format: { type: 'json_object' }
      })
    }).finally(() => clearTimeout(timeout));

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.error?.message || `Erreur OpenAI ${response.status}`;
      throw new Error(detail);
    }

    return res.status(200).json(extractUsefulPayload(data));
  } catch (err) {
    const message = err?.name === 'AbortError'
      ? 'Timeout Luna : aucune reponse recue dans le delai.'
      : (err?.message || String(err));
    return res.status(500).json({ error: message });
  }
}
