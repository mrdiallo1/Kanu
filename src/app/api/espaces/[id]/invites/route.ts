import * as db from '@/lib/db';
import { normalizePhone, ownerOf } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { addGuest } from '@/lib/events';
import { PLANS, hasFeature } from '@/config/plans';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const own = await ownerOf(id);
  if (!own) return fail('Accès refusé.', 403);
  const { event } = own;
  const b = await body(req);

  const name = str(b.name, 80);
  if (name.length < 2) return fail('Indiquez le nom de l’invité.');
  const seats = Math.max(1, Math.min(20, Number(b.seats) || 1));
  const max = PLANS[event.plan].maxGuests;
  if ((await db.guests.seatCount(event.id)) + seats > max) {
    return fail(`Votre offre permet ${max} personnes au total. Retirez des invités ou changez d’offre.`);
  }
  const role = b.role === 'photographe' ? 'photographe' : 'invite';
  if (role === 'photographe' && !hasFeature(event.plan, 'photographe')) {
    return fail('L’accès photographe fait partie de l’offre Prestige.');
  }
  const zoneIds = new Set(event.zones.map((z) => z.id));
  const access = Array.isArray(b.access)
    ? (b.access as string[]).filter((z) => zoneIds.has(z))
    : event.zones.filter((z) => z.openToAll).map((z) => z.id);

  const guest = await addGuest(event, {
    name,
    phone: normalizePhone(str(b.phone, 30)) || undefined,
    seats,
    access,
    role,
  });
  return ok({ id: guest.id, token: guest.token }, 201);
}
