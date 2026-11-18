
// Image d'aperçu du lien d'invitation (balise og:image).
// C'est elle que WhatsApp, Facebook ou les SMS affichent quand on envoie le lien.
// - Si les mariés ont mis une photo de couple : cette photo, recadrée en 1200 × 630.
// - Sinon : une image orange avec leurs prénoms et la date.
// Elle est publique : quiconque a le lien d'invitation peut la voir.

import sharp from 'sharp';
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { hostsLine, longDate, typeLabel } from '@/lib/format';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]!,
  );

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  const event = await db.events.bySlug(slug);

  if (!event || event.status === 'suspendu') {
    return new Response('Introuvable', { status: 404 });
  }

  let jpg: Buffer | null = null;

  // Récupération de la photo de couverture.
  if (event.coverMediaId) {
    const cover = await db.media.byId(event.coverMediaId);

    if (cover) {
      try {
        const imageBuffer = await storage.getBuffer(cover.storageKey);

        jpg = await sharp(imageBuffer)
          .rotate()
          .resize(1200, 630, {
            fit: 'cover',
            position: 'attention',
          })
          .jpeg({ quality: 80 })
          .toBuffer();
      } catch {
        jpg = null;
      }
    }
  }

  // Image de remplacement si aucune photo n'est disponible.
  if (!jpg) {
    const names = esc(hostsLine(event));

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
        <rect width="1200" height="630" fill="#FF5A00"/>

        <circle
          cx="1060"
          cy="120"
          r="220"
          fill="#FF7A2E"
        />

        <text
          x="80"
          y="150"
          font-family="DejaVu Sans, Arial, sans-serif"
          font-size="38"
          font-weight="700"
          fill="#FFFFFF"
        >${esc(typeLabel(event.type))}</text>

        <text
          x="80"
          y="330"
          font-family="DejaVu Sans, Arial, sans-serif"
          font-size="${names.length > 22 ? 72 : 96}"
          font-weight="800"
          fill="#FFFFFF"
        >${names}</text>

        <text
          x="80"
          y="430"
          font-family="DejaVu Sans, Arial, sans-serif"
          font-size="40"
          fill="#FFFFFF"
        >${esc(longDate(event.date))}</text>

        <text
          x="80"
          y="560"
          font-family="DejaVu Sans, Arial, sans-serif"
          font-size="30"
          fill="#FFE3D1"
        >Touchez pour voir le programme et partager vos photos</text>
      </svg>
    `;

    jpg = await sharp(Buffer.from(svg))
      .jpeg({ quality: 86 })
      .toBuffer();
  }

  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpg.length),
      'Cache-Control': 'public, max-age=600',
    },
  });
}
