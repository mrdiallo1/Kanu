import * as db from '@/lib/db';
import { viewerFor } from '@/lib/auth';
import { body, fail, ok, rateLimit, str } from '@/lib/api';
import { feature, isOpen } from '@/lib/access';
import { newId } from '@/lib/ids';

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (rateLimit(req, 'livre-or', 20)) return fail('Trop de messages d’un coup. Patientez un instant.', 429);
  const { slug } = await ctx.params;
  const event = await db.events.bySlug(slug);
  if (!event) return fail('Espace introuvable.', 404);
  const viewer = await viewerFor(event);
  if (!viewer) return fail('Rejoignez l’espace pour écrire.', 401);
  if (!isOpen(event) || !feature(event, 'livreOrEcrit')) return fail('Le livre d’or est fermé.');

  const b = await body(req);
  const text = str(b.text, 1500);
  if (text.length < 2) return fail('Écrivez votre message.');
  const authorName = str(b.authorName, 80) || viewer.name;

  await db.guestbook.create({
    id: newId(),
    eventId: event.id,
    guestId: viewer.kind === 'guest' ? viewer.guest.id : undefined,
    authorName,
    text,
    createdAt: new Date().toISOString(),
  });
  return ok({}, 201);
}
