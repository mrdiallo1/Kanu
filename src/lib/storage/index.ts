
import 'server-only';

import { Readable } from 'node:stream';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from '@aws-sdk/client-s3';

import type { UploadPart } from '@/lib/types';

// ============================================================
// CONFIGURATION CLOUDFLARE R2
// ============================================================

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
  throw new Error(
    'Configuration R2 incomplète. Vérifiez les variables R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY et R2_BUCKET_NAME.',
  );
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

// ============================================================
// VALIDATION DES CLÉS
// ============================================================

function validateKey(key: string): string {
  if (
    !key ||
    key.startsWith('/') ||
    key.includes('\\') ||
    key.split('/').some((part) => part === '..' || part === '.')
  ) {
    throw new Error('Clé de stockage invalide.');
  }

  return key;
}

// ============================================================
// CRÉATION D'UN TRANSFERT MULTIPART
// ============================================================

export async function createMultipart(
  key: string,
  mime: string,
): Promise<string> {
  const result = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
      ContentType: mime,
    }),
  );

  if (!result.UploadId) {
    throw new Error('Impossible de démarrer le transfert R2.');
  }

  return result.UploadId;
}

// ============================================================
// ENVOI D'UNE PARTIE
// ============================================================

export async function uploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  data: Uint8Array,
): Promise<UploadPart> {
  if (
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > 10000 ||
    data.byteLength === 0
  ) {
    throw new Error('Partie multipart invalide.');
  }

  const result = await client.send(
    new UploadPartCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: data,
      ContentLength: data.byteLength,
    }),
  );

  if (!result.ETag) {
    throw new Error('R2 n’a pas retourné l’ETag de la partie.');
  }

  return {
    partNumber,
    etag: result.ETag,
    size: data.byteLength,
  };
}

// ============================================================
// RÉCUPÉRATION DES PARTIES DÉJÀ ENVOYÉES
// ============================================================

export async function listUploadedParts(
  key: string,
  uploadId: string,
): Promise<UploadPart[]> {
  const result = await client.send(
    new ListPartsCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
      UploadId: uploadId,
    }),
  );

  const parts: UploadPart[] = [];

  for (const part of result.Parts ?? []) {
    if (
      part.PartNumber !== undefined &&
      part.ETag &&
      part.Size !== undefined
    ) {
      parts.push({
        partNumber: part.PartNumber,
        etag: part.ETag,
        size: part.Size,
      });
    }
  }

  return parts.sort((a, b) => a.partNumber - b.partNumber);
}

// ============================================================
// FINALISATION DU TRANSFERT MULTIPART
// ============================================================

export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: UploadPart[],
) {
  if (parts.length === 0) {
    throw new Error('Aucune partie à finaliser.');
  }

  const sorted = [...parts].sort(
    (a, b) => a.partNumber - b.partNumber,
  );

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].partNumber !== i + 1) {
      throw new Error('Une partie du fichier est manquante.');
    }
  }

  return client.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sorted.map((part) => ({
          PartNumber: part.partNumber,
          ETag: part.etag,
        })),
      },
    }),
  );
}

// ============================================================
// ANNULATION D'UN TRANSFERT
// ============================================================

export async function abortMultipart(
  key: string,
  uploadId: string,
): Promise<void> {
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
      UploadId: uploadId,
    }),
  );
}

// ============================================================
// ENREGISTREMENT D'UN BUFFER
// ============================================================

export async function saveBuffer(
  key: string,
  data: Buffer,
  contentType = 'application/octet-stream',
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
      Body: data,
      ContentLength: data.length,
      ContentType: contentType,
    }),
  );
}

// ============================================================
// SUPPRESSION D'UN FICHIER
// ============================================================

export async function remove(key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
    }),
  );
}

// ============================================================
// RÉCUPÉRATION DE LA TAILLE D'UN FICHIER
// ============================================================

export async function size(key: string): Promise<number> {
  const result = await client.send(
    new HeadObjectCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
    }),
  );

  if (result.ContentLength === undefined) {
    throw new Error('Taille du fichier indisponible.');
  }

  return result.ContentLength;
}

// ============================================================
// LECTURE COMPLÈTE D'UN FICHIER
// ============================================================

export async function getBuffer(key: string): Promise<Buffer> {
  const result = await client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
    }),
  );

  if (!result.Body) {
    throw new Error('Fichier introuvable dans R2.');
  }

  return Buffer.from(await result.Body.transformToByteArray());
}

// ============================================================
// LECTURE D'UN FICHIER AVEC PLAGE D'OCTETS
// ============================================================

export async function getObject(
  key: string,
  range?: string,
) {
  return client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: validateKey(key),
      ...(range ? { Range: range } : {}),
    }),
  );
}

// ============================================================
// CRÉATION D'UN FLUX DE LECTURE R2
// ============================================================

export function createReadStream(
  key: string,
  options?: { start?: number; end?: number },
): Readable {
  let range: string | undefined;

  if (options) {
    const start = options.start ?? 0;
    const end = options.end;

    if (
      !Number.isSafeInteger(start) ||
      start < 0 ||
      (end !== undefined &&
        (!Number.isSafeInteger(end) || end < start))
    ) {
      throw new Error('Plage de lecture invalide.');
    }

    range = `bytes=${start}-${end ?? ''}`;
  }

  return Readable.from(
    (async function* () {
      const result = await getObject(key, range);

      if (!result.Body) {
        throw new Error('Fichier introuvable dans R2.');
      }

      for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
        yield Buffer.from(chunk);
      }
    })(),
  );
}

// ============================================================
// EXPORT DU CLIENT R2
// ============================================================

export { client as r2Client };
