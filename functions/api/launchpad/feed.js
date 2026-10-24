import { json } from '../../_lib/util.js';
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT p.id,p.title,p.tagline,p.url,p.created_at,u.username FROM projects p JOIN users u ON u.id=p.user_id WHERE u.username IS NOT NULL ORDER BY p.created_at DESC LIMIT 30').all();
  return json({ projects: results });
}
