import * as db from '@/lib/db';
import { body, fail, ok, rateLimit, str } from '@/lib/api';
import { updateSession } from '@/lib/session';

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (rateLimit(req, 'agent', 8)) return fail('Trop de tentatives. Réessayez dans une minute.', 429);
  const { slug } = await ctx.params;
  const event = await db.events.bySlug(slug);
  if (!event || event.status === 'suspendu') return fail('Espace introuvable.', 404);
  const b = await body(req);
  const agent = await db.agents.byPin(event.id, str(b.pin, 10).replace(/\D/g, ''));
  if (!agent) return fail('Code agent incorrect.', 401);
  await updateSession((s) => ({ ...s, a: { ...(s.a || {}), [event.id]: agent.id } }));
  return ok({ name: agent.name });
}
