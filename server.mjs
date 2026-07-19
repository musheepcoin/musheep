import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';

function loadEnvFile() {
  const envPath = join(__dirname, '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = value;
  });
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(text);
}

function contentType(path) {
  const ext = extname(path).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon'
  }[ext] || 'application/octet-stream';
}

function cleanModelRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('Requete BOOST invalide.');
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) throw new Error('Messages LLM manquants.');
  return {
    model: body.model || body.modelHint || 'gpt-5.6-luna',
    messages,
    max_completion_tokens: Math.min(16000, Math.max(800, Number(body.maxOutputTokens || 2500)))
  };
}

function handleAuth(req, res, body = {}) {
  const configuredPassword = String(process.env.ORIS_ACCESS_PASSWORD || '').trim();
  const enabled = !!configuredPassword;
  if (req.method === 'GET') {
    sendJson(res, 200, { ok: true, enabled });
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  if (!enabled) {
    sendJson(res, 200, { ok: true, enabled: false });
    return;
  }
  const password = String(body.password || '').trim();
  if (password && password === configuredPassword) {
    sendJson(res, 200, { ok: true, enabled: true });
    return;
  }
  sendJson(res, 401, { ok: false, enabled: true, error: 'Mot de passe incorrect.' });
}

function parseJsonModelText(text) {
  const raw = String(text || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(raw || '{"controlAudits":[],"operationNotes":[]}');
}

async function callOpenAiBoost(requestModel) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY manquante dans .env.');

  const modelRequest = cleanModelRequest(requestModel);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelRequest.model,
      messages: modelRequest.messages,
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
  if (!parsed || typeof parsed !== 'object') return { controlAudits: [], operationNotes: [], usefulItems: [] };
  const controlAudits = Array.isArray(parsed.controlAudits) ? parsed.controlAudits : [];
  const operationNotes = Array.isArray(parsed.operationNotes) ? parsed.operationNotes : [];
  const usefulItems = Array.isArray(parsed.usefulItems) ? parsed.usefulItems : [...controlAudits, ...operationNotes];
  return { ...parsed, controlAudits, operationNotes, usefulItems };
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const target = normalize(join(__dirname, pathname));
  if (!target.startsWith(normalize(__dirname))) {
    sendText(res, 403, 'Forbidden');
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(target) });
    createReadStream(target).pipe(res);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

loadEnvFile();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }
  try {
    if (url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, apiKeyLoaded: !!process.env.OPENAI_API_KEY });
      return;
    }
    if (url.pathname === '/api/auth') {
      const body = req.method === 'POST' ? await readRequestBody(req) : {};
      handleAuth(req, res, body);
      return;
    }
    if (url.pathname === '/api/boost-reservations' && req.method === 'POST') {
      const body = await readRequestBody(req);
      const result = await callOpenAiBoost(body);
      sendJson(res, 200, result);
      return;
    }
    await serveStatic(req, res, url);
  } catch (err) {
    sendJson(res, 500, { error: err?.message || String(err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`ORIS local server: http://${HOST}:${PORT}`);
  console.log(`OpenAI key loaded: ${process.env.OPENAI_API_KEY ? 'yes' : 'no'}`);
});
