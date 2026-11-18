import * as db from '@/lib/db';
import { body, fail, ok, rateLimit, str } from '@/lib/api';
import { loadGroup as load, memberKey } from '@/lib/chat';
import { newId } from '@/lib/ids';

export async function POST(req: Request, ctx: { params: Promise<{ gid: string }> }) {
  if (rateLimit(req, 'message', 40)) return fail('Vous envoyez trop de messages. Patientez un instant.', 429);
  const l = await load(ctx);
  if (!l) return fail('Groupe introuvable.', 404);
  const b = await body(req);
  const text = str(b.text, 2000);
  if (!text) return fail('Message vide.');
  const v = l.viewer;
  const now = new Date().toISOString();
  const m = await db.messages.create({
    id: newId(),
    groupId: l.group.id,
    eventId: l.event.id,
    author: v.kind === 'owner' ? { kind: 'owner', id: v.user.id, name: v.name } : { kind: 'guest', id: v.guest.id, name: v.name },
    text,
    createdAt: now,
  });
  await db.groups.markRead(l.group.id, memberKey(v), now);
  return ok({ id: m.id, at: m.createdAt }, 201);
}
