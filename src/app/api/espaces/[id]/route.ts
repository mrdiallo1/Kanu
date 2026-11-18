import * as db from '@/lib/db';
import { ownerOf } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { inviteCode, newId } from '@/lib/ids';
import { PLANS, hasFeature, type PlanId } from '@/config/plans';
import type { EventSpace, ProgramItem, Zone } from '@/lib/types';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const own = await ownerOf(id);
  if (!own) return fail('Accès refusé.', 403);
  const { event } = own;
  const b = await body(req);
  const patch: Partial<EventSpace> = {};

  for (const k of ['hostA', 'hostB', 'babyName', 'ceremonyPlace', 'receptionPlace'] as const) {
    if (k in b) patch[k] = str(b[k], 160);
  }
  if ('story' in b) patch.story = str(b.story, 2000);
  if ('welcome' in b) patch.welcome = str(b.welcome, 600);
  if ('date' in b && /^\d{4}-\d{2}-\d{2}$/.test(str(b.date))) patch.date = str(b.date);
  if ('time' in b && /^\d{2}:\d{2}$/.test(str(b.time))) patch.time = str(b.time);
  if (Array.isArray(b.program)) {
    patch.program = (b.program as ProgramItem[])
      .map((p) => ({ time: str(p?.time, 5), label: str(p?.label, 120) }))
      .filter((p) => p.label)
      .slice(0, 20);
  }
  if (b.settings && typeof b.settings === 'object') {
    const s = b.settings as Record<string, unknown>;
    patch.settings = {
      guestsCanPost: s.guestsCanPost !== false,
      guestsCanDeleteOwn: s.guestsCanDeleteOwn !== false,
    };
  }
  if (Array.isArray(b.zones)) {
    const zones = (b.zones as Partial<Zone>[])
      .map((z) => ({
        id: str(z.id, 60) || newId(),
        name: str(z.name, 40),
        singleEntry: !!z.singleEntry,
        openToAll: !!z.openToAll,
      }))
      .filter((z) => z.name)
      .slice(0, 8);
    if (zones.length === 0) return fail('Gardez au moins un espace d’accès.');
    if (zones.length > 2 && !hasFeature(event.plan, 'plusieursEspaces')) {
      return fail('Plus de deux espaces d’accès demande l’offre Prestige.');
    }
    patch.zones = zones;
  }
  // L'offre ne peut changer qu'avant le paiement.
  if ('plan' in b && event.status === 'brouillon' && (str(b.plan) as PlanId) in PLANS) {
    patch.plan = str(b.plan) as PlanId;
  }
  // Fermeture manuelle des publications
  if (b.status === 'ferme' && event.status === 'actif') patch.status = 'ferme';
  if (b.status === 'actif' && event.status === 'ferme') patch.status = 'actif';

  // Nouveau code d'invitation (si l'ancien a circulé trop largement)
  if (b.newCode === true) {
    let code = inviteCode();
    while (await db.events.byCode(code)) code = inviteCode();
    patch.code = code;
  }

  await db.events.update(event.id, patch);
  return ok();
}
