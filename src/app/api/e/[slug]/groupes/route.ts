import * as db from '@/lib/db';
import { viewerFor } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { canCreateGroups, groupSummaries } from '@/lib/chat';
import { newId } from '@/lib/ids';

type Ctx = { params: Promise<{ slug: string }> };

async function load(ctx: Ctx) {
  const { slug } = await ctx.params;
  const event = await db.events.bySlug(slug);
  if (!event || event.status === 'suspendu') return null;
  const viewer = await viewerFor(event);
  return viewer ? { event, viewer } : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Accès refusé.', 401);
  return ok({ groups: await groupSummaries(l.event, l.viewer), canCreate: canCreateGroups(l.viewer) });
}

export async function POST(req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Accès refusé.', 401);
  if (!canCreateGroups(l.viewer)) return fail('Seuls les organisateurs et les invités autorisés créent des groupes.', 403);
  const b = await body(req);
  const name = str(b.name, 60);
  if (name.length < 2) return fail('Donnez un nom au groupe.');

  const guests = new Set((await db.guests.list(l.event.id)).filter((g) => !g.blocked).map((g) => g.id));
  const ids = Array.isArray(b.memberIds) ? (b.memberIds as string[]).filter((id) => guests.has(id)) : [];
  if (l.viewer.kind === 'guest' && !ids.includes(l.viewer.guest.id)) ids.push(l.viewer.guest.id);

  const now = new Date().toISOString();
  const g = await db.groups.create({
    id: newId(),
    eventId: l.event.id,
    name,
    description: str(b.description, 300) || undefined,
    createdBy: l.viewer.kind === 'owner' ? { kind: 'owner', id: l.viewer.user.id } : { kind: 'guest', id: l.viewer.guest.id },
    adminGuestIds: l.viewer.kind === 'guest' ? [l.viewer.guest.id] : [],
    memberGuestIds: [...new Set(ids)],
    reads: {},
    createdAt: now,
    updatedAt: now,
  });
  await db.messages.create({
    id: newId(),
    groupId: g.id,
    eventId: l.event.id,
    author: { kind: 'owner', id: 'systeme', name: 'Kanu' },
    text: `${l.viewer.name} a créé le groupe « ${name} ».`,
    createdAt: now,
  });
  return ok({ id: g.id }, 201);
}
