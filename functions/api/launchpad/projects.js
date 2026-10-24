import { json, limit } from '../../_lib/util.js';
import { guard, projectInput } from '../../_lib/launchpad.js';
export async function onRequestPost({ request, env }) {
  const g = await guard(request, env); if (g instanceof Response) return g;
  const p = projectInput(await request.json().catch(() => null)); if (!p) return json({ error: 'invalid' }, 400);
  if (!(await limit(env, 'pj:' + g.user.id, 20, 3600))) return json({ error: 'rate_limited' }, 429);
  const c = await env.DB.prepare('SELECT COUNT(*) n FROM projects WHERE user_id=?').bind(g.user.id).first();
  if (c.n >= 10) return json({ error: 'limit' }, 400);
  const id = crypto.randomUUID(), now = Date.now();
  await env.DB.prepare('INSERT INTO projects(id,user_id,title,tagline,url,description,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id, g.user.id, p.title, p.tagline, p.url, p.description, now, now).run();
  return json({ ok: true, project: { id, ...p, created_at: now } }, 201);
}
