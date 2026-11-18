import * as db from '@/lib/db';
import { viewerFor, type Viewer } from '@/lib/auth';
import type { EventSpace, Group } from '@/lib/types';

export const memberKey = (v: Viewer) => (v.kind === 'owner' ? 'owner' : v.guest.id);

export const canSeeGroup = (g: Group, v: Viewer) => v.kind === 'owner' || g.memberGuestIds.includes(v.guest.id);

export const isGroupAdmin = (g: Group, v: Viewer) => v.kind === 'owner' || g.adminGuestIds.includes(v.guest.id);

export const canCreateGroups = (v: Viewer) => v.kind === 'owner' || !!v.guest.canCreateGroups;

/** Résumé des groupes visibles par quelqu'un, du plus récent au plus ancien. */
export async function groupSummaries(event: EventSpace, v: Viewer) {
  const key = memberKey(v);
  const list = (await db.groups.byEvent(event.id)).filter((g) => canSeeGroup(g, v));
  const out = await Promise.all(
    list.map(async (g) => {
      const last = await db.messages.last(g.id);
      return {
        id: g.id,
        name: g.name,
        description: g.description || '',
        members: g.memberGuestIds.length + 1,
        isAdmin: isGroupAdmin(g, v),
        last: last ? { text: last.text, author: last.author.name, mine: (last.author.kind === 'owner' ? 'owner' : last.author.id) === key, at: last.createdAt } : null,
        unread: await db.messages.countAfter(g.id, g.reads[key], key),
        updatedAt: g.updatedAt,
      };
    }),
  );
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function unreadTotal(event: EventSpace, v: Viewer) {
  const s = await groupSummaries(event, v);
  return s.reduce((n, g) => n + g.unread, 0);
}

/** Charge un groupe et vérifie que la personne connectée en fait partie. */
export async function loadGroup(ctx: { params: Promise<{ gid: string }> }) {
  const { gid } = await ctx.params;
  const group = await db.groups.byId(gid);
  if (!group) return null;
  const event = await db.events.byId(group.eventId);
  if (!event || event.status === 'suspendu') return null;
  const viewer = await viewerFor(event);
  if (!viewer || !canSeeGroup(group, viewer)) return null;
  return { group, event, viewer };
}
