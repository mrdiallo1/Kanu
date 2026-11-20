// Modifier ou supprimer un message, comme sur WhatsApp :
// - modifier : seulement son propre message écrit, pendant 15 minutes
// - supprimer : son propre message, ou n'importe lequel pour un administrateur du groupe
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { body, fail, ok, str } from '@/lib/api';
import { EDIT_WINDOW_MS, isGroupAdmin, loadGroup, memberKey, messageView } from '@/lib/chat';

type Ctx = { params: Promise<{ gid: string; mid: string }> };

async function load(ctx: Ctx) {
  const l = await loadGroup(ctx);
  if (!l) return null;
  const { mid } = await ctx.params;
  const m = await db.messages.byId(mid);
  if (!m || m.groupId !== l.group.id || m.author.id === 'systeme') return null;
  const mine = (m.author.kind === 'owner' ? 'owner' : m.author.id) === memberKey(l.viewer);
  return { ...l, m, mine };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Message introuvable.', 404);
  if (!l.mine) return fail('Vous ne pouvez modifier que vos propres messages.', 403);
  if (l.m.deleted || l.m.audio) return fail('Ce message ne peut pas être modifié.');
  if (Date.now() - Date.parse(l.m.createdAt) > EDIT_WINDOW_MS) return fail('Un message ne peut être modifié que dans les 15 minutes après son envoi.');
  const text = str((await body(req)).text, 2000);
  if (!text) return fail('Message vide.');
  if (text === l.m.text) return ok({ message: messageView(l.m) });
  const next = await db.messages.update(l.m, { text, editedAt: new Date().toISOString() });
  return ok({ message: messageView(next) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Message introuvable.', 404);
  if (!l.mine && !isGroupAdmin(l.group, l.viewer)) return fail('Vous ne pouvez supprimer que vos propres messages.', 403);
  if (l.m.deleted) return ok();
  if (l.m.audio) await storage.remove(l.m.audio.key).catch(() => undefined);
  const next = await db.messages.update(l.m, { deleted: true, text: '', audio: undefined });
  return ok({ message: messageView(next) });
}
