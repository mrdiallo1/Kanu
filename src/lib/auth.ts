import crypto from 'node:crypto';
import * as db from '@/lib/db';
import { getSession } from '@/lib/session';
import type { Agent, EventSpace, Guest, User } from '@/lib/types';

// ---------- Mots de passe ----------

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return ref.length === test.length && crypto.timingSafeEqual(ref, test);
}

export function normalizePhone(raw: string) {
  let p = raw.replace(/[^\d+]/g, '');
  if (p.startsWith('+223')) p = p.slice(4);
  if (p.startsWith('00223')) p = p.slice(5);
  return p.replace(/\D/g, '');
}

// ---------- Utilisateur courant ----------

export async function currentUser(): Promise<User | null> {
  const s = await getSession();
  if (!s.u) return null;
  const u = await db.users.byId(s.u);
  return u && !u.suspended ? u : null;
}

export function isAdmin(u: User | null) {
  if (!u) return false;
  const list = (process.env.ADMIN_PHONES || '').split(',').map((x) => normalizePhone(x)).filter(Boolean);
  return list.includes(u.phone);
}

// ---------- Qui regarde cet espace ? ----------

export type Viewer =
  | { kind: 'owner'; user: User; name: string }
  | { kind: 'guest'; guest: Guest; name: string };

export async function viewerFor(event: EventSpace): Promise<Viewer | null> {
  const s = await getSession();
  if (s.u && s.u === event.ownerId) {
    const user = await db.users.byId(s.u);
    if (user) return { kind: 'owner', user, name: user.name };
  }
  const gid = s.g?.[event.id];
  if (gid) {
    const guest = await db.guests.byId(gid);
    if (guest && guest.eventId === event.id && !guest.blocked) {
      return { kind: 'guest', guest, name: guest.name };
    }
  }
  return null;
}

export async function agentFor(event: EventSpace): Promise<Agent | null> {
  const s = await getSession();
  const aid = s.a?.[event.id];
  if (!aid) return null;
  const a = await db.agents.byId(aid);
  return a && a.eventId === event.id ? a : null;
}

/** Pour les routes API réservées aux organisateurs d'un espace. */
export async function ownerOf(eventId: string) {
  const user = await currentUser();
  if (!user) return null;
  const event = await db.events.byId(eventId);
  if (!event || event.ownerId !== user.id) return null;
  return { user, event };
}
