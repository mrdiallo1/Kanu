import { PLANS, hasFeature, quotaBytes, type Feature } from '@/config/plans';
import * as db from '@/lib/db';
import type { EventSpace } from '@/lib/types';
import type { Viewer } from '@/lib/auth';

/** Date de suppression : date de l'événement + durée de conservation de l'offre. */
export function expiresAt(e: EventSpace) {
  const d = new Date(e.date + 'T23:59:59');
  d.setDate(d.getDate() + PLANS[e.plan].retentionDays);
  return d;
}

export function daysLeft(e: EventSpace) {
  return Math.ceil((expiresAt(e).getTime() - Date.now()) / 86400000);
}

export function isOpen(e: EventSpace) {
  return e.status === 'actif' && daysLeft(e) > 0;
}

export function feature(e: EventSpace, f: Feature) {
  return hasFeature(e.plan, f);
}

export function canPost(e: EventSpace, v: Viewer | null) {
  if (!v || !isOpen(e)) return false;
  if (v.kind === 'owner') return true;
  if (v.guest.role === 'photographe') return true;
  return e.settings.guestsCanPost && v.guest.canPost;
}

export async function storage(e: EventSpace) {
  const { stored, reserved } = await db.media.bytesUsed(e.id);
  const total = quotaBytes(e.plan);
  return {
    total,
    stored,
    reserved,
    free: Math.max(0, total - stored - reserved),
    percent: Math.min(100, Math.round((stored / total) * 100)),
  };
}

export function storageWarning(percent: number) {
  if (percent >= 100) return 'L’espace est plein. Les nouveaux envois sont bloqués, tout le reste fonctionne.';
  if (percent >= 90) return 'L’espace est rempli à 90 %. Pensez à télécharger vos souvenirs.';
  if (percent >= 80) return 'L’espace est rempli à 80 %.';
  return null;
}
