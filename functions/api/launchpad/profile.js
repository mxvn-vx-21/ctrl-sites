import { json } from '../../_lib/util.js';
import { guard, clean, cleanMulti } from '../../_lib/launchpad.js';
export async function onRequestPut({ request, env }) {
  const g = await guard(request, env); if (g instanceof Response) return g;
  const b = await request.json().catch(() => null);
  const name = clean(b?.name, 50) || null, bio = cleanMulti(b?.bio, 280) || null;
  await env.DB.prepare('UPDATE users SET name=?, bio=? WHERE id=?').bind(name, bio, g.user.id).run();
  return json({ ok: true, name, bio });
}
