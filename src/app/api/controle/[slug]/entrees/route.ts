import * as db from '@/lib/db';
import { agentFor } from '@/lib/auth';
import { body, fail, ok } from '@/lib/api';
import { feature } from '@/lib/access';
import { newId } from '@/lib/ids';

interface Item {
  guestId: string;
  zoneId: string;
  at: string;
}

// Reçoit les entrées validées par l'agent, y compris celles faites hors ligne.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const event = await db.events.bySlug(slug);
  if (!event) return fail('Espace introuvable.', 404);
  if (!feature(event, 'qrCodes')) return fail('Le contrôle des entrées n’est pas inclus dans cette offre.', 403);
  const agent = await agentFor(event);
  if (!agent) return fail('Connexion agent requise.', 401);

  const b = await body<{ items?: Item[] }>(req);
  const items = Array.isArray(b.items) ? b.items.slice(0, 500) : [];
  const zoneIds = new Set(event.zones.map((z) => z.id));
  const results = [];

  for (const it of items) {
    const guest = await db.guests.byId(String(it.guestId));
    if (!guest || guest.eventId !== event.id || !zoneIds.has(String(it.zoneId))) continue;
    const at = !Number.isNaN(Date.parse(it.at)) ? new Date(it.at).toISOString() : new Date().toISOString();
    const r = await db.checkins.create({
      id: newId(),
      eventId: event.id,
      guestId: guest.id,
      zoneId: String(it.zoneId),
      agentId: agent.id,
      at,
    });
    results.push({ guestId: guest.id, zoneId: r.checkin.zoneId, at: r.checkin.at, duplicate: r.duplicate });
  }
  return ok({ results });
}
