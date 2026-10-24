import { HANDLE_RE, RESERVED, SPA_ROUTES } from './_lib/launchpad.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SEC = { 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };
const CSS = `@font-face{font-family:RDR2;src:url(/assets/fonts/rdr2.ttf);font-display:swap}@font-face{font-family:Orbitron;src:url(/assets/fonts/Orbitron-Regular.ttf);font-display:swap}@font-face{font-family:Dihjau;src:url(/assets/fonts/Dihjau-Regular.otf);font-display:swap}
*{box-sizing:border-box}body{margin:0;background:#050505;color:#f2f2f0;font:16px/1.6 Dihjau,system-ui,sans-serif;min-height:100vh;background-image:radial-gradient(60% 40% at 80% 0,rgba(255,255,255,.09),transparent)}
a{color:inherit;text-decoration:none}.w{max-width:860px;margin:0 auto;padding:28px 22px 80px}.top{display:flex;justify-content:space-between;align-items:center;letter-spacing:.24em;margin-bottom:64px}.top a:last-child{letter-spacing:0;color:#999;font-size:.9rem}
.eb{font:.72rem Orbitron,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#8d8d8b}h1{font:clamp(2.6rem,9vw,5.5rem)/1 RDR2,Impact,sans-serif;margin:14px 0;font-weight:400;word-break:break-word}
.bio{color:#a8a8a6;max-width:560px;white-space:pre-line}.g{background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:26px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-top:20px}.g h3{font:1.7rem/1.1 RDR2,Impact,sans-serif;font-weight:400;margin:0 0 8px}.g p{margin:0 0 18px;color:#a8a8a6}.g small{color:#8d8d8b;display:block;margin:-8px 0 16px;white-space:pre-line}
.b{display:inline-block;padding:10px 20px;border:1px solid rgba(255,255,255,.18);border-radius:999px}.b:hover,.b:focus-visible{background:#f2f2f0;color:#050505;outline:none}.empty{color:#8d8d8b;margin-top:20px}.url{color:#8d8d8b;font-size:.9rem;margin-left:12px;word-break:break-all}`;
const page = (title, desc, body, status = 200, extra = {}) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><style>${CSS}</style></head><body><div class="w"><div class="top"><a href="/">CTRL</a><a href="/#/launchpad">Launchpad</a></div>${body}</div></body></html>`, { status, headers: { ...SEC, ...extra } });
export async function onRequestGet({ request, env, params }) {
  const raw = String(params.handle || ''), n = raw.toLowerCase(), origin = new URL(request.url).origin;
  if (SPA_ROUTES.has(n)) return Response.redirect(`${origin}/#/${n}`, 302);
  if (!HANDLE_RE.test(n) || RESERVED.has(n) || !env.DB) return env.ASSETS.fetch(request);
  if (raw !== n) return Response.redirect(`${origin}/${n}`, 301);
  const u = await env.DB.prepare('SELECT id,username,name,bio FROM users WHERE username=?').bind(n).first();
  if (!u) return page(`ctrl.monster/${n} · CTRL`, 'This CTRL address is available.', `<div class="eb">Unclaimed</div><h1>ctrl.monster/${esc(n)}</h1><p class="bio">This address is available.</p><p><a class="b" href="/#/signup">Claim it</a></p>`, 404);
  const { results } = await env.DB.prepare('SELECT title,tagline,url,description FROM projects WHERE user_id=? ORDER BY created_at DESC LIMIT 10').bind(u.id).all();
  const sites = (await env.DB.prepare('SELECT slug FROM sites WHERE user_id=? AND current_deploy_id IS NOT NULL AND disabled=0 ORDER BY created_at DESC LIMIT 5').bind(u.id).all()).results;
  const siteHtml = sites.length ? `<div class="eb" style="margin-top:48px">Sites</div><p>${sites.map(x => { const h = `${x.slug}.${env.SITES_DOMAIN || 'ctrl.monster'}`; return `<a class="b" style="margin:0 10px 10px 0" href="https://${esc(h)}" rel="noopener nofollow ugc">${esc(h)}</a>`; }).join('')}</p>` : '';
  const cards = results.map(p => `<article class="g"><h3>${esc(p.title)}</h3><p>${esc(p.tagline)}</p>${p.description ? `<small>${esc(p.description)}</small>` : ''}<a class="b" href="${esc(p.url)}" target="_blank" rel="noopener nofollow ugc">Visit ↗</a></article>`).join('');
  const title = `${u.name || n} (ctrl.monster/${n}) · CTRL`;
  return page(title, u.bio || `${u.name || n} on CTRL`, `<div class="eb">ctrl.monster/${esc(n)}</div><h1>${esc(u.name || n)}</h1>${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : ''}<div class="eb" style="margin-top:48px">Launched</div>${cards ? `<div class="grid">${cards}</div>` : '<p class="empty">Nothing launched yet.</p>'}${siteHtml}`, 200, { 'cache-control': 'public, max-age=60' });
}
