import { cache } from 'react';
import * as db from '@/lib/db';
import { viewerFor, type Viewer } from '@/lib/auth';
import type { EventSpace, Group, Message } from '@/lib/types';

export const memberKey = (v: Viewer) => (v.kind === 'owner' ? 'owner' : v.guest.id);

export const canSeeGroup = (g: Group, v: Viewer) => v.kind === 'owner' || g.memberGuestIds.includes(v.guest.id);

export const isGroupAdmin = (g: Group, v: Viewer) => v.kind === 'owner' || g.adminGuestIds.includes(v.guest.id);

export const canCreateGroups = (v: Viewer) => v.kind === 'owner' || !!v.guest.canCreateGroups;

/** Délai pendant lequel on peut modifier son message (comme WhatsApp) */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Nombre de messages affichés à l'ouverture d'un groupe (les plus anciens se chargent en remontant) */
export const PAGE_SIZE = 50;

// Les groupes d'une fête : une seule lecture Firestore, partagée entre le
// layout (badge des non lus) et la page pendant le même affichage.
const groupsOf = cache(async (eventId: string) => {
  const list = await db.groups.byEvent(eventId);
  // Groupes créés avant cette version : résumé calculé une seule fois
  return Promise.all(list.map((g) => (g.msgCount === undefined ? db.groups.ensureSummary(g.id).then((x) => x || g) : g)));
});

/** Résumé des groupes visibles par quelqu'un, du plus récent au plus ancien. Aucune lecture de messages. */
export async function groupSummaries(event: EventSpace, v: Viewer) {
  const key = memberKey(v);
  const list = (await groupsOf(event.id)).filter((g) => canSeeGroup(g, v));
  return list
    .map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description || '',
      members: g.memberGuestIds.length + 1,
      isAdmin: isGroupAdmin(g, v),
      last: g.last
        ? {
            kind: g.last.kind,
            text: g.last.text,
            author: g.last.author,
            mine: g.last.authorKey === key,
            seconds: g.last.seconds,
            at: g.last.at,
          }
        : null,
      unread: Math.max(0, (g.msgCount ?? 0) - (g.readCounts?.[key] ?? 0)),
      updatedAt: g.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function unreadTotal(event: EventSpace, v: Viewer) {
  const s = await groupSummaries(event, v);
  return s.reduce((n, g) => n + g.unread, 0);
}

// Petite mémoire des fêtes (30 s) : la vérification d'accès des messages,
// appelée toutes les 2-3 secondes, évite ainsi une lecture Firestore.
const eventMemo = new Map<string, { at: number; event: EventSpace | null }>();
async function eventById(id: string) {
  const hit = eventMemo.get(id);
  if (hit && Date.now() - hit.at < 30_000) return hit.event;
  const event = await db.events.byId(id);
  eventMemo.set(id, { at: Date.now(), event });
  if (eventMemo.size > 500) eventMemo.delete(eventMemo.keys().next().value!);
  return event;
}

/** Charge un groupe et vérifie que la personne connectée en fait partie. */
export async function loadGroup(ctx: { params: Promise<{ gid: string }> }) {
  const { gid } = await ctx.params;
  const group = await db.groups.byId(gid);
  if (!group) return null;
  const event = await eventById(group.eventId);
  if (!event || event.status === 'suspendu') return null;
  const viewer = await viewerFor(event);
  if (!viewer || !canSeeGroup(group, viewer)) return null;
  return { group, event, viewer };
}

/** Ce que le navigateur reçoit pour chaque message */
export function messageView(m: Message) {
  return {
    id: m.id,
    text: m.deleted ? '' : m.text,
    at: m.createdAt,
    author: m.author.name,
    authorKey: m.author.id === 'systeme' ? 'systeme' : m.author.kind === 'owner' ? 'owner' : m.author.id,
    audio: m.audio && !m.deleted ? { url: `/api/groupes/${m.groupId}/vocal/${m.id}`, seconds: m.audio.seconds } : undefined,
    edited: !!m.editedAt && !m.deleted,
    deleted: !!m.deleted,
  };
}

export type MessageView = ReturnType<typeof messageView>;
