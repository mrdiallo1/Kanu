
import * as db from '@/lib/db';
import { viewerFor } from '@/lib/auth';
import { body, fail, ok, rateLimit, str } from '@/lib/api';
import { canPost, feature, isOpen, storage as checkStorage } from '@/lib/access';
import {
  CHUNK_SIZE,
  LIMITS,
  kindFromMime,
  extFor,
} from '@/lib/uploads';
import * as r2 from '@/lib/storage';
import { newId } from '@/lib/ids';
import { bytes } from '@/lib/format';

// ============================================================
// INITIALISATION D'UN ENVOI MULTIPART R2
// ============================================================

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    // Protection contre les envois excessifs.
    if (rateLimit(req, 'envois', 120)) {
      return fail(
        'Trop d’envois en même temps. Patientez un instant.',
        429,
      );
    }

    // Récupération de l'événement.
    const { slug } = await ctx.params;
    const event = await db.events.bySlug(slug);

    if (!event) {
      return fail('Espace introuvable.', 404);
    }

    // Vérification du visiteur.
    const viewer = await viewerFor(event);

    if (!viewer) {
      return fail('Rejoignez l’espace pour publier.', 401);
    }

    // Lecture des informations du fichier.
    const b = await body(req);

    const mime =
      str(b.mime, 100) || 'application/octet-stream';

    const size = Number(b.size) || 0;

    const kind = kindFromMime(mime);

    // Vérification du type.
    if (!kind) {
      return fail(
        'Ce type de fichier n’est pas accepté. Envoyez des photos, des vidéos ou un vocal.',
      );
    }

    // Vérification de la taille.
    if (!Number.isSafeInteger(size) || size <= 0) {
      return fail('Fichier vide ou taille invalide.');
    }

    if (size > LIMITS[kind]) {
      return fail(
        `Ce fichier dépasse la taille maximale (${bytes(LIMITS[kind])}).`,
      );
    }

    // Vérification des autorisations.
    if (kind === 'audio') {
      if (!isOpen(event)) {
        return fail('Le livre d’or est fermé.');
      }

      if (!feature(event, 'livreOrVocal')) {
        return fail(
          'Les messages vocaux ne font pas partie de cette offre.',
        );
      }
    } else if (!canPost(event, viewer)) {
      return fail(
        'Les publications ne sont pas autorisées pour vous dans cet espace.',
        403,
      );
    }

    // Vérification de l'espace disponible pour l'événement.
    const st = await checkStorage(event);

    if (size > st.free) {
      return fail(
        'L’espace de stockage de cette fête est plein. Les souvenirs déjà publiés restent disponibles.',
        507,
      );
    }

    // ========================================================
    // PRÉPARATION DU TRANSFERT
    // ========================================================

    const id = newId();

    const folder =
      kind === 'photo'
        ? 'photos'
        : kind === 'video'
          ? 'videos'
          : 'vocaux';

    const storageKey =
      `events/${event.id}/${folder}/${id}${extFor(mime, str(b.name, 200) || 'fichier')}`;

    // Création de l'enregistrement temporaire Firestore.
    const up = await db.uploads.create({
      id,
      eventId: event.id,
      guestId:
        viewer.kind === 'guest'
          ? viewer.guest.id
          : undefined,
      byOwner: viewer.kind === 'owner',
      authorName: viewer.name,
      kind,
      mime,
      size,
      received: 0,
      originalName: str(b.name, 200) || 'fichier',
      caption: str(b.caption, 300) || undefined,
      official:
        viewer.kind === 'guest' &&
        viewer.guest.role === 'photographe',
      guestbookText:
        kind === 'audio'
          ? str(b.text, 1500)
          : undefined,
      createdAt: new Date().toISOString(),
    });

    let r2UploadId: string | undefined;

    try {
      // Création du transfert multipart dans Cloudflare R2.
      r2UploadId = await r2.createMultipart(
        storageKey,
        mime.split(';')[0],
      );

      // Enregistrement de l'identifiant R2 et de la clé
      // dans le document d'envoi Firestore.
      await db.uploads.setMultipart(up.id, {
        r2UploadId,
        storageKey,
      });

      return ok(
        {
          id: up.id,
          chunkSize: CHUNK_SIZE,
        },
        201,
      );
    } catch (error) {
      // Si R2 a créé le transfert mais que Firestore
      // n'a pas pu l'enregistrer, on annule le transfert.
      if (r2UploadId) {
        try {
          await r2.abortMultipart(storageKey, r2UploadId);
        } catch (abortError) {
          console.error(
            'Erreur annulation multipart R2 :',
            abortError,
          );
        }
      }

      // Suppression de l'enregistrement temporaire.
      try {
        await db.uploads.remove(up.id);
      } catch (removeError) {
        console.error(
          'Erreur suppression envoi Firestore :',
          removeError,
        );
      }

      throw error;
    }
  } catch (error) {
    console.error('Erreur initialisation envoi :', error);

    return fail(
      'Impossible de démarrer le transfert du fichier. Réessayez.',
      500,
    );
  }
}
