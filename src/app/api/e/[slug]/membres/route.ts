import * as db from '@/lib/db';
import { viewerFor } from '@/lib/auth';
import { fail, ok } from '@/lib/api';

// Liste des invités, pour choisir les membres d'un groupe.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const event = await db.events.bySlug(slug);
  if (!event) return fail('Espace introuvable.', 404);
  const v = await viewerFor(event);
  if (!v) return fail('Accès refusé.', 401);
  const list = (await db.guests.list(event.id)).filter((g) => !g.blocked);
  return ok({ guests: list.map((g) => ({ id: g.id, name: g.name })) });
}
