import PDFDocument from 'pdfkit';
import * as db from '@/lib/db';
import { eventTitle, hostsLine, longDate, typeLabel } from '@/lib/format';
import { extFor } from '@/lib/uploads';
import { slugify } from '@/lib/ids';
import { site } from '@/config/site';
import type { EventSpace, GuestbookEntry, Media } from '@/lib/types';

/** Taille maximale d'une archive : au-delà, l'export est découpé en plusieurs ZIP. */
export const PART_LIMIT = 4 * 1024 ** 3;

const pad = (n: number) => String(n).padStart(3, '0');

export function rootFolder(e: EventSpace) {
  return e.type === 'bapteme' ? 'SOUVENIRS_BAPTEME' : 'SOUVENIRS_MARIAGE';
}

/** Nom lisible : 001_Awa-Traore_2026-12-20.jpg (garde l'auteur et la date). */
export function exportName(m: Media, index: number) {
  const who = slugify(m.authorName).replace(/-/g, '_') || 'invite';
  const day = m.createdAt.slice(0, 10);
  return `${pad(index)}_${who}_${day}${extFor(m.mime, m.originalName)}`;
}

export interface ExportPlan {
  parts: { index: number; media: { m: Media; path: string }[]; size: number; withBook: boolean }[];
  total: number;
}

export async function planExport(e: EventSpace): Promise<ExportPlan> {
  const all = (await db.media.list(e.id, ['photo', 'video', 'audio'])).reverse();
  const root = rootFolder(e);
  const counters = { photo: 0, video: 0, audio: 0 };
  const folder = { photo: 'PHOTOS_ORIGINALES', video: 'VIDEOS_ORIGINALES', audio: 'MESSAGES_VOCAUX' };
  const entries = all.map((m) => {
    const k = m.kind as 'photo' | 'video' | 'audio';
    counters[k]++;
    return { m, path: `${root}/${folder[k]}/${exportName(m, counters[k])}` };
  });

  const parts: ExportPlan['parts'] = [{ index: 1, media: [], size: 0, withBook: true }];
  for (const it of entries) {
    let cur = parts[parts.length - 1];
    if (cur.size + it.m.size > PART_LIMIT && cur.media.length > 0) {
      cur = { index: parts.length + 1, media: [], size: 0, withBook: false };
      parts.push(cur);
    }
    cur.media.push(it);
    cur.size += it.m.size;
  }
  return { parts, total: entries.reduce((n, x) => n + x.m.size, 0) };
}

export function detailsText(e: EventSpace) {
  const lines = [
    eventTitle(e),
    '',
    `Type : ${typeLabel(e.type)}`,
    e.type === 'bapteme' ? `Enfant : ${e.babyName}` : '',
    e.type === 'bapteme' ? `Parents : ${e.hostA} et ${e.hostB}` : `Mariés : ${e.hostA} et ${e.hostB}`,
    `Date : ${longDate(e.date)} à ${e.time}`,
    e.ceremonyPlace ? `Cérémonie : ${e.ceremonyPlace}` : '',
    e.receptionPlace ? `Réception : ${e.receptionPlace}` : '',
    '',
    e.program.length ? 'Programme :' : '',
    ...e.program.map((p) => `  ${p.time}  ${p.label}`),
    '',
    e.welcome ? `Message de bienvenue :\n${e.welcome}` : '',
    '',
    e.story ? `Notre histoire :\n${e.story}` : '',
    '',
    `Exporté depuis ${site.name} le ${new Date().toLocaleDateString('fr-FR')}.`,
  ];
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

// ---------- Livre d'or PDF ----------

export function guestbookPdf(e: EventSpace, entries: GuestbookEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 64, info: { Title: `Livre d’or – ${hostsLine(e)}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const orange = '#E04800';
    const ink = '#21140D';

    // Page de titre
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(orange);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14).text('Livre d’or', 64, 120);
    doc.moveDown(1.5).fontSize(44).text(hostsLine(e), { width: doc.page.width - 128, lineGap: 4 });
    doc.moveDown(0.8).font('Helvetica').fontSize(16).text(longDate(e.date));
    if (e.ceremonyPlace) doc.moveDown(0.3).text(e.ceremonyPlace);
    doc
      .font('Helvetica')
      .fontSize(12)
      .text(`${entries.filter((x) => x.text).length} messages de vos proches`, 64, doc.page.height - 120);

    // Messages
    const written = entries.filter((x) => x.text).reverse();
    doc.addPage();
    doc.fillColor(ink);
    for (const m of written) {
      const h = doc.heightOfString(m.text!, { width: doc.page.width - 128, lineGap: 3 }) + 70;
      if (doc.y + h > doc.page.height - 64) doc.addPage();
      const y = doc.y;
      doc.rect(64, y, 3, h - 30).fill(orange);
      doc
        .fillColor(ink)
        .font('Helvetica')
        .fontSize(12.5)
        .text(m.text!, 80, y, { width: doc.page.width - 144, lineGap: 3 });
      doc.moveDown(0.5);
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .text(m.authorName, 80)
        .font('Helvetica')
        .fillColor('#7A6A60')
        .text(new Date(m.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
      doc.fillColor(ink).moveDown(1.6);
    }
    if (written.length === 0) doc.fontSize(13).text('Aucun message écrit pour le moment.');
    doc.end();
  });
}

// ---------- Mini-site souvenir (fonctionne sans Internet) ----------

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function miniSiteHtml(
  e: EventSpace,
  entries: GuestbookEntry[],
  audioFile: (mediaId: string) => string | undefined,
) {
  const items = [...entries]
    .reverse()
    .map((m) => {
      const audio = m.audioMediaId ? audioFile(m.audioMediaId) : undefined;
      const date = new Date(m.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      return `<article>
  ${m.text ? `<p class="t">${esc(m.text).replace(/\n/g, '<br>')}</p>` : ''}
  ${audio ? `<audio controls preload="none" src="audios/${esc(audio)}"></audio>` : ''}
  <p class="a"><b>${esc(m.authorName)}</b><span>${date}</span></p>
</article>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Livre d’or – ${esc(hostsLine(e))}</title>
<style>
  :root { --o:#FF5A00; --od:#D64000; --ink:#21140D; --soft:#7A6A60; }
  * { box-sizing:border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:var(--ink); background:#fff; }
  header { background:var(--o); color:#fff; padding:12vh 7vw 8vh; }
  header p { margin:0; font-size:18px; }
  h1 { font-size:clamp(44px, 9vw, 112px); line-height:.95; margin:.3em 0 .25em; letter-spacing:-.03em; font-weight:800; }
  main { max-width:720px; margin:0 auto; padding:56px 7vw 96px; }
  article { padding:28px 0 28px 22px; border-left:3px solid var(--o); margin-bottom:28px; }
  .t { font-size:19px; line-height:1.55; margin:0 0 14px; }
  .a { margin:0; display:flex; gap:12px; flex-wrap:wrap; font-size:15px; }
  .a span { color:var(--soft); }
  audio { width:100%; margin:4px 0 14px; }
  footer { text-align:center; color:var(--soft); font-size:14px; padding:0 0 48px; }
</style>
</head>
<body>
<header>
  <p>Livre d’or</p>
  <h1>${esc(hostsLine(e))}</h1>
  <p>${esc(longDate(e.date))}${e.ceremonyPlace ? ' – ' + esc(e.ceremonyPlace) : ''}</p>
</header>
<main>
${items || '<p>Aucun message.</p>'}
</main>
<footer>${entries.length} messages – souvenir créé avec ${site.name}</footer>
</body>
</html>`;
}
