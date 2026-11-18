import * as db from '@/lib/db';
import { viewerFor } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { isGroupAdmin, loadGroup as load, memberKey } from '@/lib/chat';
import { newId } from '@/lib/ids';

type Ctx = { params: Promise<{ gid: string }> };

/** Messages (tous, ou seulement ceux après ?apres=date) et informations du groupe. */
export async function GET(req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Groupe introuvable.', 404);
  const after = new URL(req.url).searchParams.get('apres') || undefined;
  const msgs = await db.messages.list(l.group.id, { after, limit: after ? undefined : 300 });
  const key = memberKey(l.viewer);
  const now = new Date().toISOString();
  await db.groups.markRead(l.group.id, key, now);

  let info = undefined;
  if (!after) {
    const guests = await db.guests.list(l.event.id);
    const byId = new Map(guests.map((g) => [g.id, g]));
    const owner = await db.users.byId(l.event.ownerId);
    info = {
      id: l.group.id,
      name: l.group.name,
      description: l.group.description || '',
      isAdmin: isGroupAdmin(l.group, l.viewer),
      isOwner: l.viewer.kind === 'owner',
      members: [
        { id: 'owner', name: owner?.name || 'Organisateurs', admin: true, owner: true },
        ...l.group.memberGuestIds
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((g) => ({ id: g!.id, name: g!.name, admin: l.group.adminGuestIds.includes(g!.id), owner: false })),
      ],
    };
  }
  return ok({
    me: key,
    group: info,
    messages: msgs.map((m) => ({
      id: m.id,
      text: m.text,
      at: m.createdAt,
      author: m.author.name,
      authorKey: m.author.id === 'systeme' ? 'systeme' : m.author.kind === 'owner' ? 'owner' : m.author.id,
    })),
  });
}

/** Modifier le groupe : nom, description, membres, administrateurs. */
export async function PATCH(req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Groupe introuvable.', 404);
  const b = await body(req);
  const g = l.group;
  const me = l.viewer;

  // Quitter le groupe : possible pour tout invité
  if (b.leave === true && me.kind === 'guest') {
    await db.groups.update(g.id, {
      memberGuestIds: g.memberGuestIds.filter((id) => id !== me.guest.id),
      adminGuestIds: g.adminGuestIds.filter((id) => id !== me.guest.id),
    });
    await systemMessage(g.id, g.eventId, `${me.name} a quitté le groupe.`);
    return ok();
  }

  if (!isGroupAdmin(g, me)) return fail('Seuls les administrateurs du groupe peuvent le modifier.', 403);

  const valid = new Set((await db.guests.list(l.event.id)).filter((x) => !x.blocked).map((x) => x.id));
  let members = [...g.memberGuestIds];
  let admins = [...g.adminGuestIds];
  const names = new Map((await db.guests.list(l.event.id)).map((x) => [x.id, x.name]));
  const notes: string[] = [];

  for (const id of Array.isArray(b.add) ? (b.add as string[]) : []) {
    if (valid.has(id) && !members.includes(id)) {
      members.push(id);
      notes.push(`${me.name} a ajouté ${names.get(id)}.`);
    }
  }
  for (const id of Array.isArray(b.remove) ? (b.remove as string[]) : []) {
    if (members.includes(id)) {
      members = members.filter((x) => x !== id);
      admins = admins.filter((x) => x !== id);
      notes.push(`${me.name} a retiré ${names.get(id)}.`);
    }
  }
  for (const id of Array.isArray(b.makeAdmin) ? (b.makeAdmin as string[]) : []) {
    if (members.includes(id) && !admins.includes(id)) admins.push(id);
  }
  for (const id of Array.isArray(b.removeAdmin) ? (b.removeAdmin as string[]) : []) {
    admins = admins.filter((x) => x !== id);
  }

  const patch: Record<string, unknown> = { memberGuestIds: members, adminGuestIds: admins };
  if ('name' in b) {
    const n = str(b.name, 60);
    if (n.length < 2) return fail('Le nom est trop court.');
    if (n !== g.name) notes.push(`${me.name} a renommé le groupe en « ${n} ».`);
    patch.name = n;
  }
  if ('description' in b) patch.description = str(b.description, 300) || undefined;
  await db.groups.update(g.id, patch);
  for (const n of notes) await systemMessage(g.id, g.eventId, n);
  return ok();
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Groupe introuvable.', 404);
  const creator = l.viewer.kind === 'guest' && l.group.createdBy.kind === 'guest' && l.group.createdBy.id === l.viewer.guest.id;
  if (l.viewer.kind !== 'owner' && !creator) return fail('Seuls les organisateurs ou le créateur peuvent supprimer le groupe.', 403);
  await db.groups.remove(l.group.id);
  return ok();
}

async function systemMessage(groupId: string, eventId: string, text: string) {
  await db.messages.create({
    id: newId(),
    groupId,
    eventId,
    author: { kind: 'owner', id: 'systeme', name: 'Kanu' },
    text,
    createdAt: new Date().toISOString(),
  });
}
