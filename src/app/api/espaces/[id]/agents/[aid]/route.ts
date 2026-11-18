import * as db from '@/lib/db';
import { ownerOf } from '@/lib/auth';
import { fail, ok } from '@/lib/api';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; aid: string }> }) {
  const { id, aid } = await ctx.params;
  const own = await ownerOf(id);
  if (!own) return fail('Accès refusé.', 403);
  const a = await db.agents.byId(aid);
  if (!a || a.eventId !== own.event.id) return fail('Agent introuvable.', 404);
  await db.agents.remove(a.id);
  return ok();
}
