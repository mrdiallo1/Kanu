import * as db from '@/lib/db';
import { currentUser, isAdmin } from '@/lib/auth';
import { body, fail, ok } from '@/lib/api';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdmin(await currentUser())) return fail('Accès refusé.', 403);
  const { id } = await ctx.params;
  const b = await body(req);
  if (!['valide', 'suspendu', 'en_attente'].includes(String(b.status))) return fail('État inconnu.');
  await db.vendors.update(id, { status: b.status as 'valide' | 'suspendu' | 'en_attente' });
  return ok();
}
