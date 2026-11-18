
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { viewerFor } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { CHUNK_SIZE, finalize, partNumberFromOffset } from '@/lib/uploads';

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const { id } = await ctx.params;

  const up = await db.uploads.byId(id);
  if (!up) return null;

  const event = await db.events.byId(up.eventId);
  if (!event) return null;

  const v = await viewerFor(event);
  if (!v) return null;

  const mine =
    (v.kind === 'owner' && up.byOwner) ||
    (v.kind === 'guest' && v.guest.id === up.guestId);

  return mine ? up : null;
}

/**
 * Vérifie la progression de l'envoi.
 * Utilisé pour reprendre après une coupure Internet.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const up = await load(ctx);

  if (!up) {
    return fail('Envoi introuvable.', 404);
  }

  return ok({
    received: up.received,
    size: up.size,
  });
}

/**
 * Reçoit un morceau et l'envoie directement vers Cloudflare R2.
 * x-offset indique la position du morceau dans le fichier.
 */
export async function PUT(req: Request, ctx: Ctx) {
  const up = await load(ctx);

  if (!up) {
    return fail('Envoi introuvable.', 404);
  }

  if (!up.r2UploadId || !up.storageKey) {
    return fail('Transfert R2 non initialisé.', 409);
  }

  const offsetHeader = req.headers.get('x-offset');

  if (offsetHeader === null) {
    return fail('Position du morceau manquante.');
  }

  const offset = Number(offsetHeader);
  const current = up.received;

  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset % CHUNK_SIZE !== 0
  ) {
    return fail('Position du morceau invalide.');
  }

  // Le client doit envoyer les morceaux dans l'ordre.
  if (offset !== current) {
    return ok({
      received: current,
      retry: true,
    }, 409);
  }

  const chunk = new Uint8Array(await req.arrayBuffer());

  if (
    chunk.byteLength === 0 ||
    chunk.byteLength > CHUNK_SIZE
  ) {
    return fail('Morceau invalide.');
  }

  if (current + chunk.byteLength > up.size) {
    return fail('Le fichier est plus grand qu’annoncé.');
  }

  // Tous les morceaux sauf le dernier doivent avoir la taille prévue.
  const isLastPart = current + chunk.byteLength === up.size;

  if (!isLastPart && chunk.byteLength !== CHUNK_SIZE) {
    return fail('Taille du morceau incorrecte.');
  }

  const partNumber = partNumberFromOffset(offset);

  if (partNumber < 1 || partNumber > 10000) {
    return fail('Nombre de morceaux invalide.');
  }

  try {
    // Envoi du morceau directement vers R2.
    const part = await storage.uploadPart(
      up.storageKey,
      up.r2UploadId,
      partNumber,
      chunk,
    );

    // Enregistrement de la progression dans Firestore.
    await db.uploads.addPart(up.id, part);

    const updated = await db.uploads.byId(up.id);

    if (!updated) {
      return fail('Envoi introuvable après transfert.', 404);
    }

    // Tous les octets ont été reçus : finalisation du fichier.
    if (updated.received === updated.size) {
      try {
        const media = await finalize(updated);

        return ok({
          received: updated.received,
          done: true,
          mediaId: media.id,
        });
      } catch (error) {
        console.error('Erreur finalisation R2 :', error);

        return fail(
          error instanceof Error
            ? error.message
            : 'Impossible de finaliser le fichier.',
          422,
        );
      }
    }

    return ok({
      received: updated.received,
      done: false,
    });
  } catch (error) {
    console.error('Erreur transfert vers R2 :', error);

    return fail(
      'Impossible de transférer ce morceau. Réessayez.',
      500,
    );
  }
}

/**
 * Annule le transfert multipart et libère l'espace réservé.
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const up = await load(ctx);

  if (!up) {
    return fail('Envoi introuvable.', 404);
  }

  try {
    if (up.r2UploadId && up.storageKey) {
      await storage.abortMultipart(
        up.storageKey,
        up.r2UploadId,
      );
    }
  } catch (error) {
    // Le transfert peut déjà avoir été finalisé ou annulé.
    console.error('Erreur annulation multipart R2 :', error);
  }

  await db.uploads.remove(up.id);

  return ok();
}
