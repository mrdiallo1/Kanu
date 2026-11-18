import * as db from '@/lib/db';
import { guestToken, inviteCode, newId, slugify, slugSuffix } from '@/lib/ids';
import { siteUrl } from '@/config/site';
import type { EventSpace, EventType, Guest, ProgramItem, Zone } from '@/lib/types';
import type { PlanId } from '@/config/plans';
import { PLANS } from '@/config/plans';

export function defaultZones(type: EventType): Zone[] {
  return type === 'bapteme'
    ? [
        { id: newId(), name: 'Cérémonie', singleEntry: false, openToAll: true },
        { id: newId(), name: 'Repas', singleEntry: true, openToAll: false },
      ]
    : [
        { id: newId(), name: 'Cérémonie', singleEntry: false, openToAll: true },
        { id: newId(), name: 'Dîner', singleEntry: true, openToAll: false },
      ];
}

export function defaultProgram(type: EventType): ProgramItem[] {
  return type === 'bapteme'
    ? [
        { time: '08:00', label: 'Baptême et annonce du prénom' },
        { time: '10:00', label: 'Petit-déjeuner' },
        { time: '13:00', label: 'Repas' },
      ]
    : [
        { time: '15:00', label: 'Cérémonie' },
        { time: '17:00', label: 'Séance photo' },
        { time: '20:00', label: 'Dîner' },
        { time: '22:00', label: 'Soirée dansante' },
      ];
}

export interface EventInput {
  type: EventType;
  hostA: string;
  hostB: string;
  babyName?: string;
  date: string;
  time: string;
  ceremonyPlace: string;
  receptionPlace: string;
  program: ProgramItem[];
  story: string;
  welcome: string;
  plan: PlanId;
}

export async function createEvent(ownerId: string, input: EventInput): Promise<EventSpace> {
  let code = inviteCode();
  while (await db.events.byCode(code)) code = inviteCode();
  const base =
    input.type === 'bapteme'
      ? slugify(`bapteme-${input.babyName || input.hostA}`)
      : slugify(`${input.hostA}-et-${input.hostB}`);
  const event: EventSpace = {
    id: newId(),
    slug: `${base || 'fete'}-${slugSuffix()}`,
    code,
    ownerId,
    ...input,
    plan: PLANS[input.plan] ? input.plan : 'classique',
    status: 'brouillon',
    zones: defaultZones(input.type),
    settings: { guestsCanPost: true, guestsCanDeleteOwn: true },
    createdAt: new Date().toISOString(),
  };
  return db.events.create(event);
}

export async function addGuest(
  event: EventSpace,
  data: Partial<Guest> & { name: string },
): Promise<Guest> {
  const guest: Guest = {
    id: newId(),
    eventId: event.id,
    name: data.name,
    phone: data.phone,
    seats: Math.max(1, Math.min(20, data.seats ?? 1)),
    token: guestToken(),
    access: data.access ?? event.zones.filter((z) => z.openToAll).map((z) => z.id),
    role: data.role ?? 'invite',
    blocked: false,
    canPost: true,
    source: data.source ?? 'liste',
    rsvp: 'attente',
    joinedAt: data.joinedAt,
    createdAt: new Date().toISOString(),
  };
  return db.guests.create(guest);
}

export const inviteLink = (e: EventSpace) => `${siteUrl()}/e/${e.slug}?code=${encodeURIComponent(e.code)}`;
export const personalLink = (g: Guest) => `${siteUrl()}/invitation/${g.token}`;

export function whatsappLink(text: string, phone?: string) {
  const p = phone ? phone.replace(/\D/g, '') : '';
  const num = p && p.length === 8 ? '223' + p : p;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
