import { json } from '../../../_lib/util.js';
import { guard, projectInput } from '../../../_lib/launchpad.js';
export async function onRequestPut({ request, env, params }) {
  const g = await guard(request, env); if (g instanceof Response) return g;
  const p = projectInput(await request.json().catch(() => null)); if (!p) return json({ error: 'invalid' }, 400);
  const r = await env.DB.prepare('UPDATE projects SET title=?,tagline=?,url=?,description=?,updated_at=? WHERE id=? AND user_id=?').bind(p.title, p.tagline, p.url, p.description, Date.now(), params.id, g.user.id).run();
  return r.meta.changes ? json({ ok: true }) : json({ error: 'not_found' }, 404);
}
export async function onRequestDelete({ request, env, params }) {
  const g = await guard(request, env); if (g instanceof Response) return g;
  const r = await env.DB.prepare('DELETE FROM projects WHERE id=? AND user_id=?').bind(params.id, g.user.id).run();
  return r.meta.changes ? json({ ok: true }) : json({ error: 'not_found' }, 404);
}
