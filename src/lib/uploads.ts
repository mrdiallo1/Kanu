
import path from 'node:path';
import sharp from 'sharp';

import * as db from '@/lib/db';
import * as storage from '@/lib/storage';

import type { Upload } from '@/lib/types';

// ============================================================
// CONFIGURATION
// ============================================================

export const CHUNK_SIZE = 8 * 1024 * 1024;

export const LIMITS = {
  photo: 60 * 1024 * 1024,
  video: 6 * 1024 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
};

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/3gpp': '.3gp',
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/aac': '.aac',
  'audio/x-m4a': '.m4a',
};

// ============================================================
// IDENTIFICATION DES FICHIERS
// ============================================================

export function kindFromMime(mime: string): Upload['kind'] | null {
  const base = mime.split(';')[0].trim().toLowerCase();

  if (!EXT[base]) return null;

  if (base.startsWith('image/')) return 'photo';
  if (base.startsWith('video/')) return 'video';
  if (base.startsWith('audio/')) return 'audio';

  return null;
}

export function extFor(mime: string, name: string): string {
  const base = mime.split(';')[0].trim().toLowerCase();

  return (
    EXT[base] ||
    path.extname(name).toLowerCase().slice(0, 6) ||
    ''
  );
}

// ============================================================
// VALIDATION DE LA SIGNATURE
// ============================================================

export function looksValid(
  data: Uint8Array,
  kind: Upload['kind'],
): boolean {
  if (data.byteLength < 12) return false;

  const buf = Buffer.from(data);
  const hex = buf.toString('hex');
  const ascii = buf.toString('latin1');

  if (kind === 'photo') {
    return (
      hex.startsWith('ffd8ff') ||
      hex.startsWith('89504e47') ||
      ascii.startsWith('GIF8') ||
      (
        ascii.startsWith('RIFF') &&
        ascii.slice(8, 12) === 'WEBP'
      ) ||
      ascii.slice(4, 8) === 'ftyp'
    );
  }

  return (
    ascii.slice(4, 8) === 'ftyp' ||
    hex.startsWith('1a45dfa3') ||
    ascii.startsWith('OggS') ||
    ascii.startsWith('ID3') ||
    hex.startsWith('fff') ||
    ascii.slice(4, 8) === 'moov' ||
    ascii.slice(4, 8) === 'mdat' ||
    ascii.slice(4, 8) === 'wide'
  );
}

// ============================================================
// NUMÉRO DE PARTIE
// ============================================================

export function partNumberFromOffset(offset: number): number {
  return Math.floor(offset / CHUNK_SIZE) + 1;
}

// ============================================================
// FINALISATION R2
// ============================================================

export async function finalize(up: Upload) {
  if (!up.r2UploadId || !up.storageKey) {
    throw new Error('Informations du transfert R2 manquantes.');
  }

  if (up.received !== up.size) {
    throw new Error('Le fichier n’a pas été entièrement envoyé.');
  }

  // 1. Récupérer les parties présentes dans R2.
  const parts = await storage.listUploadedParts(
    up.storageKey,
    up.r2UploadId,
  );

  const sorted = [...parts].sort(
    (a, b) => a.partNumber - b.partNumber,
  );

  if (sorted.length === 0) {
    throw new Error('Aucune partie reçue par R2.');
  }

  // 2. Vérifier la continuité et les tailles.
  let totalSize = 0;

  for (let i = 0; i < sorted.length; i++) {
    const part = sorted[i];

    if (part.partNumber !== i + 1) {
      throw new Error('Une partie du fichier est manquante.');
    }

    if (
      i < sorted.length - 1 &&
      part.size < 5 * 1024 * 1024
    ) {
      throw new Error('Une partie intermédiaire est trop petite.');
    }

    totalSize += part.size;
  }

  if (totalSize !== up.size) {
    throw new Error(
      'La taille du fichier reçu ne correspond pas à la taille annoncée.',
    );
  }

  const mediaId = up.id;
  const key = up.storageKey;

  // 3. Finaliser le fichier avant de le lire.
  await storage.completeMultipart(
    key,
    up.r2UploadId,
    sorted,
  );

  // 4. Vérifier la signature du fichier finalisé.
  const firstBytes = await storage.getObject(
    key,
    'bytes=0-31',
  );

  if (!firstBytes.Body) {
    await storage.remove(key);
    throw new Error('Impossible de vérifier le fichier dans R2.');
  }

  const signature = Buffer.from(
    await firstBytes.Body.transformToByteArray(),
  );

  if (!looksValid(signature, up.kind)) {
    await storage.remove(key);
    await db.uploads.remove(up.id);

    throw new Error(
      'Ce fichier ne correspond pas à une photo, une vidéo ou un audio valide.',
    );
  }

  // ==========================================================
  // 5. CRÉATION DE LA MINIATURE
  // ==========================================================

  let thumbKey: string | undefined;

  if (up.kind === 'photo') {
    try {
      const original = await storage.getBuffer(key);

      const thumbnail = await sharp(original)
        .rotate()
        .resize({
          width: 720,
          height: 720,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 74 })
        .toBuffer();

      thumbKey = `events/${up.eventId}/vignettes/${mediaId}.webp`;

      await storage.saveBuffer(thumbKey, thumbnail);
    } catch (error) {
      console.error('Erreur création miniature :', error);
    }
  }

  // ==========================================================
  // 6. ENREGISTREMENT FIRESTORE
  // ==========================================================

  const m = await db.media.create({
    id: mediaId,
    eventId: up.eventId,
    guestId: up.guestId,
    byOwner: up.byOwner,
    authorName: up.authorName,
    kind: up.kind,
    mime: up.mime.split(';')[0],
    size: up.size,
    originalName: up.originalName,
    storageKey: key,
    thumbKey,
    caption: up.caption,
    official: up.official,
    createdAt: new Date().toISOString(),
  });

  // ==========================================================
  // 7. LIVRE D'OR AUDIO
  // ==========================================================

  if (up.kind === 'audio') {
    await db.guestbook.create({
      id: mediaId,
      eventId: up.eventId,
      guestId: up.guestId,
      authorName: up.authorName,
      text: up.guestbookText || undefined,
      audioMediaId: m.id,
      createdAt: m.createdAt,
    });
  }

  // ==========================================================
  // 8. NETTOYAGE
  // ==========================================================

  await db.uploads.remove(up.id);

  return m;
}
