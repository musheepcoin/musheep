import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'oris_session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function password(env = process.env) {
  return String(env.ORIS_ACCESS_PASSWORD || '').trim();
}
function signature(expires, secret) {
  return createHmac('sha256', secret).update(`oris:${expires}`).digest('hex');
}
function cookieValue(req, name) {
  const raw = String(req?.headers?.cookie || '');
  const entry = raw.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : '';
}
export function authEnabled(env = process.env) {
  return !!password(env);
}
export function createSessionToken(env = process.env, now = Date.now()) {
  const secret = password(env);
  if (!secret) return '';
  const expires = Math.floor(now / 1000) + MAX_AGE_SECONDS;
  return `${expires}.${signature(expires, secret)}`;
}
export function isAuthenticated(req, env = process.env, now = Date.now()) {
  const secret = password(env);
  if (!secret) return true;
  const [expiresRaw, supplied = ''] = cookieValue(req, COOKIE_NAME).split('.');
  const expires = Number(expiresRaw);
  if (!Number.isInteger(expires) || expires <= Math.floor(now / 1000)) return false;
  const expected = signature(expires, secret);
  const left = Buffer.from(supplied), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function setSessionCookie(req, res, env = process.env) {
  const token = createSessionToken(env);
  if (!token) return;
  const forwarded = String(req?.headers?.['x-forwarded-proto'] || '').toLowerCase();
  const secure = forwarded === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}${secure}`);
}
export function verifyPassword(value, env = process.env) {
  const expected = Buffer.from(password(env));
  const supplied = Buffer.from(String(value || '').trim());
  return expected.length === supplied.length && expected.length > 0 && timingSafeEqual(expected, supplied);
}

