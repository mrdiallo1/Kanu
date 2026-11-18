import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { viewerFor } from '@/lib/auth';
import { fail, ok } from '@/lib/api';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const entry = await db.guestbook.byId(id);
  if (!entry) return fail('Message introuvable.', 404);
  const event = await db.events.byId(entry.eventId);
  if (!event) return fail('Espace introuvable.', 404);
  const v = await viewerFor(event);
  const mine = v?.kind === 'guest' && v.guest.id === entry.guestId && event.settings.guestsCanDeleteOwn;
  if (v?.kind !== 'owner' && !mine) return fail('Accès refusé.', 403);

  await db.guestbook.remove(entry.id);
  if (entry.audioMediaId) {
    const m = await db.media.remove(entry.audioMediaId);
    if (m) await storage.remove(m.storageKey);
  }
  return ok();
}
