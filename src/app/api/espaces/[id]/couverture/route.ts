import sharp from 'sharp';
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { ownerOf } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { newId } from '@/lib/ids';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const own = await ownerOf(id);
  if (!own) return fail('Accès refusé.', 403);
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return fail('Choisissez une photo.');
  if (file.size > 15 * 1024 * 1024) return fail('La photo dépasse 15 Mo.');

  let out: Buffer;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 84 })
      .toBuffer();
  } catch {
    return fail('Ce fichier n’est pas une photo lisible. Essayez un JPG ou un PNG.');
  }

  const mediaId = newId();
  const key = `events/${own.event.id}/couverture/${mediaId}.jpg`;
  await storage.saveBuffer(key, out);
  await db.media.create({
    id: mediaId,
    eventId: own.event.id,
    byOwner: true,
    authorName: own.user.name,
    kind: 'cover',
    mime: 'image/jpeg',
    size: out.length,
    originalName: 'couverture.jpg',
    storageKey: key,
    createdAt: new Date().toISOString(),
  });
  const previous = own.event.coverMediaId;
  await db.events.update(own.event.id, { coverMediaId: mediaId });
  if (previous) {
    const old = await db.media.remove(previous);
    if (old) await storage.remove(old.storageKey);
  }
  return ok({ id: mediaId });
}

/** Retirer la photo de couple. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const own = await ownerOf(id);
  if (!own) return fail('Accès refusé.', 403);
  const previous = own.event.coverMediaId;
  await db.events.update(own.event.id, { coverMediaId: undefined });
  if (previous) {
    const old = await db.media.remove(previous);
    if (old) await storage.remove(old.storageKey);
  }
  return ok();
}
