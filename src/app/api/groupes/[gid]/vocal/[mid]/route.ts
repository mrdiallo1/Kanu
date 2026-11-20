// Écoute d'un message vocal (réservé aux membres du groupe).
// Le fichier ne change jamais : le téléphone le garde en mémoire après la première écoute.
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { fail } from '@/lib/api';
import { loadGroup } from '@/lib/chat';

export async function GET(req: Request, ctx: { params: Promise<{ gid: string; mid: string }> }) {
  const l = await loadGroup(ctx);
  if (!l) return fail('Groupe introuvable.', 404);
  const { mid } = await ctx.params;
  const m = await db.messages.byId(mid);
  if (!m || m.groupId !== l.group.id || !m.audio || m.deleted) return fail('Message introuvable.', 404);

  let data: Buffer;
  try {
    data = await storage.getBuffer(m.audio.key);
  } catch {
    return fail('Fichier introuvable.', 404);
  }
  const total = data.length;
  const headers = new Headers({
    'Content-Type': m.audio.mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=31536000, immutable',
  });

  // Lecture partielle : demandée par Safari (iPhone) pour lire l'audio
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (range) {
    let start = range[1] ? Number(range[1]) : 0;
    let end = range[2] ? Number(range[2]) : total - 1;
    if (!range[1] && range[2]) {
      start = Math.max(0, total - Number(range[2]));
      end = total - 1;
    }
    end = Math.min(end, total - 1);
    if (start > end || start >= total) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers });
  }
  headers.set('Content-Length', String(total));
  return new Response(new Uint8Array(data), { status: 200, headers });
}
