import { Readable } from 'node:stream';
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { viewerFor } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import type { Media } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

async function allowed(m: Media, req: Request) {
  const event = await db.events.byId(m.eventId);
  if (!event || event.status === 'suspendu') return null;
  const viewer = await viewerFor(event);
  if (viewer) return { event, viewer };
  // La photo de couverture est visible avec le lien personnel d'un invité.
  const t = new URL(req.url).searchParams.get('t');
  if (m.kind === 'cover' && t) {
    const g = await db.guests.byToken(t);
    if (g && g.eventId === event.id && !g.blocked) return { event, viewer: null };
  }
  return null;
}

function safeName(m: Media) {
  const n = m.originalName.replace(/[^\w.\- ]+/g, '_');
  return n || 'fichier';
}

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const m = await db.media.byId(id);
  if (!m) return fail('Fichier introuvable.', 404);
  if (!(await allowed(m, req))) return fail('Accès refusé.', 403);

  const url = new URL(req.url);
  const thumb = url.searchParams.get('vignette') === '1' && m.thumbKey;
  const key = thumb ? m.thumbKey! : m.storageKey;
  const type = thumb ? 'image/webp' : m.mime;
  let total: number;
  try {
    total = await storage.size(key);
  } catch {
    return fail('Fichier introuvable.', 404);
  }

  const headers = new Headers({
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  });
  if (url.searchParams.get('telecharger') === '1') {
    headers.set('Content-Disposition', `attachment; filename="${safeName(m)}"`);
  }

  // Lecture partielle : permet d'avancer et reculer dans les vidéos.
  const range = req.headers.get('range');
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = match?.[1] ? Number(match[1]) : 0;
    let end = match?.[2] ? Number(match[2]) : total - 1;
    if (!match?.[1] && match?.[2]) {
      start = Math.max(0, total - Number(match[2]));
      end = total - 1;
    }
    end = Math.min(end, total - 1);
    if (start > end || start >= total) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    headers.set('Content-Length', String(end - start + 1));
    const stream = Readable.toWeb(storage.createReadStream(key, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }

  headers.set('Content-Length', String(total));
  const stream = Readable.toWeb(storage.createReadStream(key)) as ReadableStream;
  return new Response(stream, { status: 200, headers });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const m = await db.media.byId(id);
  if (!m) return fail('Fichier introuvable.', 404);
  const a = await allowed(m, req);
  if (!a?.viewer) return fail('Accès refusé.', 403);
  const isOwner = a.viewer.kind === 'owner';
  const isAuthor =
    a.viewer.kind === 'guest' && a.viewer.guest.id === m.guestId && a.event.settings.guestsCanDeleteOwn;
  if (!isOwner && !isAuthor) return fail('Vous ne pouvez pas supprimer cette publication.', 403);

  await db.media.remove(m.id);
  await storage.remove(m.storageKey);
  if (m.thumbKey) await storage.remove(m.thumbKey);
  if (m.kind === 'audio') {
    const entry = (await db.guestbook.list(m.eventId)).find((e) => e.audioMediaId === m.id);
    if (entry) await db.guestbook.remove(entry.id);
  }
  return ok();
}

/** Signalement d'une publication par un invité. */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const m = await db.media.byId(id);
  if (!m) return fail('Fichier introuvable.', 404);
  const a = await allowed(m, req);
  if (!a?.viewer) return fail('Accès refusé.', 403);
  await db.media.update(m.id, { reported: (m.reported || 0) + 1 });
  return ok();
}
