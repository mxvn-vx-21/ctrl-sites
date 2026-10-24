import { json, sameOrigin } from './util.js';
import { getUser } from './session.js';
export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
export const SPA_ROUTES = new Set(['launchpad', 'pages', 'ai-studio', 'login', 'signup']);
export const RESERVED = new Set(['api','assets','login','signup','logout','launchpad','pages','ai-studio','admin','root','www','mail','support','help','about','terms','privacy','settings','dashboard','account','status','blog','docs','app','auth','verify','new','me','explore','discover','ctrl','monster','official','staff','team','security','abuse','billing','static','public','null','undefined','favicon','robots','sitemap','index','home','profile','user','users','cdn','dev','test']);
export const handleStatus = n => !HANDLE_RE.test(n) ? 'invalid' : RESERVED.has(n) ? 'reserved' : null;
export const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
export const cleanMulti = (s, max) => String(s ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
export function cleanUrl(u) {
  try { const x = new URL(String(u ?? '').trim()); if (!/^https?:$/.test(x.protocol) || x.username || x.password || x.href.length > 300) return null; return x.href; } catch { return null; }
}
export function projectInput(b) {
  const title = clean(b?.title, 60), tagline = clean(b?.tagline, 140), url = cleanUrl(b?.url), description = cleanMulti(b?.description, 500);
  if (!title || !tagline || !url) return null;
  return { title, tagline, url, description: description || null };
}
// Auth + CSRF guard for write endpoints. Returns {user,cookie} or a Response.
export async function guard(request, env, { write = true, needHandle = true } = {}) {
  if (write && !sameOrigin(request, env)) return json({ error: 'forbidden' }, 403);
  const s = await getUser(env, request);
  if (!s) return json({ error: 'unauthorized' }, 401);
  if (needHandle && !s.user.username) return json({ error: 'no_handle' }, 403);
  return s;
}
