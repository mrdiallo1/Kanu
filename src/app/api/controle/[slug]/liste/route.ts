import * as db from '@/lib/db';
import { agentFor } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { feature } from '@/lib/access';

// Liste téléchargée sur le téléphone de l'agent pour pouvoir contrôler
// même quand le réseau ne passe plus. Contient uniquement le nécessaire.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const event = await db.events.bySlug(slug);
  if (!event) return fail('Espace introuvable.', 404);
  if (!feature(event, 'qrCodes')) return fail('Le contrôle des entrées n’est pas inclus dans cette offre.', 403);
  const agent = await agentFor(event);
  if (!agent) return fail('Connexion agent requise.', 401);

  const [guests, checkins] = await Promise.all([db.guests.list(event.id), db.checkins.list(event.id)]);
  return ok({
    event: { id: event.id, slug: event.slug, zones: event.zones },
    agent: { id: agent.id, name: agent.name },
    guests: guests.map((g) => ({
      id: g.id,
      name: g.name,
      seats: g.seats,
      token: g.token,
      access: g.access,
      blocked: g.blocked,
      photo: false,
    })),
    checkins: checkins.map((c) => ({ guestId: c.guestId, zoneId: c.zoneId, at: c.at })),
    fetchedAt: new Date().toISOString(),
  });
}
