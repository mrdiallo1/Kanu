import * as db from '@/lib/db';
import { normalizePhone } from '@/lib/auth';
import { body, fail, ok, rateLimit, str } from '@/lib/api';
import { addGuest } from '@/lib/events';
import { updateSession } from '@/lib/session';
import { PLANS } from '@/config/plans';

// Un invité rejoint avec le lien général et le code d'invitation.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (rateLimit(req, 'rejoindre', 15)) return fail('Trop de tentatives. Réessayez dans une minute.', 429);
  const { slug } = await ctx.params;
  const event = await db.events.bySlug(slug);
  if (!event || event.status === 'suspendu') return fail('Cet espace n’existe pas.', 404);
  if (event.status === 'brouillon') return fail('Cet espace n’est pas encore ouvert aux invités.', 403);

  const b = await body(req);
  const code = str(b.code, 10).toUpperCase().replace(/\s/g, '');
  const normalized = code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
  if (normalized !== event.code) return fail('Ce code ne correspond pas. Vérifiez le message d’invitation.', 401);

  const name = str(b.name, 80);
  if (name.length < 2) return fail('Indiquez votre nom pour que les mariés vous reconnaissent.');

  if ((await db.guests.seatCount(event.id)) + 1 > PLANS[event.plan].maxGuests) {
    return fail('Cet espace a atteint son nombre maximum d’invités.', 403);
  }
  const guest = await addGuest(event, {
    name,
    phone: normalizePhone(str(b.phone, 30)) || undefined,
    source: 'code',
    joinedAt: new Date().toISOString(),
  });
  await updateSession((s) => ({ ...s, g: { ...(s.g || {}), [event.id]: guest.id } }));
  return ok();
}
