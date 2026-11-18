import * as db from '@/lib/db';
import { body, fail, ok } from '@/lib/api';
import { updateSession } from '@/lib/session';

// Lien personnel d'un invité : il entre dans l'espace et peut répondre présent.
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const guest = await db.guests.byToken(token);
  if (!guest || guest.blocked) return fail('Cette invitation n’est plus valable.', 404);
  const event = await db.events.byId(guest.eventId);
  if (!event || event.status === 'suspendu' || event.status === 'brouillon') {
    return fail('Cet espace n’est pas accessible pour le moment.', 403);
  }
  const b = await body(req);
  const now = new Date().toISOString();
  await db.guests.update(guest.id, {
    rsvp: b.rsvp === 'oui' || b.rsvp === 'non' ? b.rsvp : guest.rsvp,
    joinedAt: guest.joinedAt ?? now,
    lastSeenAt: now,
  });
  await updateSession((s) => ({ ...s, g: { ...(s.g || {}), [event.id]: guest.id } }));
  return ok({ slug: event.slug });
}
