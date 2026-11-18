import { PassThrough, Readable } from 'node:stream';
import archiver from 'archiver';
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { ownerOf } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { feature } from '@/lib/access';
import { detailsText, guestbookPdf, miniSiteHtml, planExport, rootFolder } from '@/lib/export';
import { slugify } from '@/lib/ids';

// GET sans paramètre : renvoie le découpage en archives.
// GET ?partie=N : télécharge l'archive N (générée à la volée, sans recompression des médias).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const own = await ownerOf(id);
  if (!own) return fail('Accès refusé.', 403);
  const { event } = own;
  if (!feature(event, 'exportComplet')) {
    return fail('Le téléchargement complet fait partie des offres Classique et Prestige.', 403);
  }

  const plan = await planExport(event);
  const partParam = new URL(req.url).searchParams.get('partie');
  if (!partParam) {
    return ok({
      total: plan.total,
      parts: plan.parts.map((p) => ({ index: p.index, size: p.size, files: p.media.length, withBook: p.withBook })),
    });
  }

  const part = plan.parts.find((p) => p.index === Number(partParam));
  if (!part) return fail('Archive introuvable.', 404);

  const root = rootFolder(event);
  const zip = archiver('zip', { store: true }); // aucune compression : les originaux restent intacts
  const out = new PassThrough();
  zip.pipe(out);

  if (part.withBook) {
    const entries = await db.guestbook.list(event.id);
    zip.append(detailsText(event), { name: `${root}/INFORMATIONS/details.txt` });

    if (feature(event, 'livreOrPdf')) {
      zip.append(await guestbookPdf(event, entries), { name: `${root}/LIVRE_D_OR/livre_or.pdf` });
    }
    if (feature(event, 'miniSite')) {
      const audioNames = new Map<string, string>();
      for (const it of plan.parts.flatMap((p) => p.media)) {
        if (it.m.kind === 'audio') {
          const name = it.path.split('/').pop()!;
          audioNames.set(it.m.id, name);
          zip.append(storage.createReadStream(it.m.storageKey), { name: `${root}/LIVRE_D_OR/audios/${name}` });
        }
      }
      zip.append(miniSiteHtml(event, entries, (mid) => audioNames.get(mid)), {
        name: `${root}/LIVRE_D_OR/index.html`,
      });
    }
  }

  for (const it of part.media) {
    zip.append(storage.createReadStream(it.m.storageKey), { name: it.path, date: new Date(it.m.createdAt) });
  }
  zip.finalize();

  const base = slugify(event.type === 'bapteme' ? `bapteme-${event.babyName}` : `${event.hostA}-${event.hostB}`);
  const fileName = `souvenirs-${base}-partie-${part.index}.zip`;
  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
