import * as db from '@/lib/db';
import { currentUser, isAdmin } from '@/lib/auth';
import { body, fail, ok } from '@/lib/api';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!isAdmin(user)) return fail('Accès refusé.', 403);
  const { id } = await ctx.params;
  const event = await db.events.byId(id);
  if (!event) return fail('Espace introuvable.', 404);
  const b = await body(req);
  if (b.status === 'suspendu') await db.events.update(id, { status: 'suspendu' });
  if (b.status === 'actif') await db.events.update(id, { status: event.paidAt ? 'actif' : 'brouillon' });
  return ok();
}
