export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    apiKeyLoaded: !!process.env.OPENAI_API_KEY,
    modelConfigured: process.env.OPENAI_MODEL || 'gpt-5.6-luna'
  });
}
