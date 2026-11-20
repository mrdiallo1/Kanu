import * as db from '@/lib/db';
import { body, fail, ok, str } from '@/lib/api';
import { after } from 'next/server';
import * as storage from '@/lib/storage';
import { PAGE_SIZE, isGroupAdmin, loadGroup as load, memberKey, messageView } from '@/lib/chat';
import { newId } from '@/lib/ids';

type Ctx = { params: Promise<{ gid: string }> };

/**
 * Messages d'un groupe.
 * - sans paramètre : les 50 derniers messages
 * - ?rev=N : vérification rapide (toutes les 2-3 s). Si rien n'a changé
 *   depuis la version N, on répond { same: true } sans lire les messages.
 * - ?avant=date : 50 messages plus anciens (en remontant dans la discussion)
 * - ?infos=1 : nom, description et membres (fiche du groupe)
 */
export async function GET(req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Groupe introuvable.', 404);
  const url = new URL(req.url);
  const key = memberKey(l.viewer);

  if (url.searchParams.get('infos') === '1') {
    const [guests, owner] = await Promise.all([db.guests.list(l.event.id), db.users.byId(l.event.ownerId)]);
    const byId = new Map(guests.map((g) => [g.id, g]));
    return ok({
      group: {
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
      },
    });
  }

  const before = url.searchParams.get('avant');
  if (before) {
    const older = await db.messages.before(l.group.id, before, PAGE_SIZE);
    return ok({ messages: older.map(messageView), hasMore: older.length === PAGE_SIZE });
  }

  const rev = l.group.rev ?? 0;
  const known = url.searchParams.get('rev');
  if (known !== null && Number(known) === rev) return ok({ same: true });

  const msgs = await db.messages.list(l.group.id, { limit: PAGE_SIZE });
  const count = l.group.msgCount ?? msgs.length;
  // « Lu » enregistré après la réponse : ne ralentit pas l'affichage
  if ((l.group.readCounts?.[key] ?? -1) < count) after(() => db.groups.markReadCount(l.group.id, key, count));
  return ok({
    me: key,
    rev,
    name: l.group.name,
    isAdmin: isGroupAdmin(l.group, l.viewer),
    messages: msgs.map(messageView),
    hasMore: count > msgs.length,
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
  // Les messages vocaux du groupe sont aussi effacés de R2
  const vocaux = (await db.messages.list(l.group.id)).filter((m) => m.audio);
  await Promise.all(vocaux.map((m) => storage.remove(m.audio!.key).catch(() => undefined)));
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
