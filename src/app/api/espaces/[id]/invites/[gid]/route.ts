import * as db from '@/lib/db';
import { normalizePhone, ownerOf } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { PLANS } from '@/config/plans';
import { guestToken } from '@/lib/ids';
import type { Guest } from '@/lib/types';

type Ctx = { params: Promise<{ id: string; gid: string }> };

async function load(ctx: Ctx) {
  const { id, gid } = await ctx.params;
  const own = await ownerOf(id);
  if (!own) return null;
  const guest = await db.guests.byId(gid);
  if (!guest || guest.eventId !== own.event.id) return null;
  return { ...own, guest };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Accès refusé.', 403);
  const b = await body(req);
  const patch: Partial<Guest> = {};

  if ('name' in b) {
    const n = str(b.name, 80);
    if (n.length < 2) return fail('Le nom est trop court.');
    patch.name = n;
  }
  if ('phone' in b) patch.phone = normalizePhone(str(b.phone, 30)) || undefined;
  if ('seats' in b) {
    const seats = Math.max(1, Math.min(20, Number(b.seats) || 1));
    const others = (await db.guests.seatCount(l.event.id)) - l.guest.seats;
    if (others + seats > PLANS[l.event.plan].maxGuests) return fail('Limite de personnes de votre offre atteinte.');
    patch.seats = seats;
  }
  if (Array.isArray(b.access)) {
    const ids = new Set(l.event.zones.map((z) => z.id));
    patch.access = (b.access as string[]).filter((z) => ids.has(z));
  }
  if ('blocked' in b) patch.blocked = !!b.blocked;
  if ('canPost' in b) patch.canPost = !!b.canPost;
  if ('canCreateGroups' in b) patch.canCreateGroups = !!b.canCreateGroups;
  if (b.newToken === true) patch.token = guestToken();

  await db.guests.update(l.guest.id, patch);
  return ok();
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Accès refusé.', 403);
  await db.guests.remove(l.guest.id);
  return ok();
}
