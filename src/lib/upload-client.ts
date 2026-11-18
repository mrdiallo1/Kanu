'use client';

// Envoi par morceaux avec reprise automatique :
// si la connexion coupe, on attend le retour du réseau puis on demande
// au serveur où il en est, et on repart de là.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function waitOnline() {
  if (navigator.onLine) return Promise.resolve();
  return new Promise<void>((r) => window.addEventListener('online', () => r(), { once: true }));
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
  webm: 'video/webm',
  m4a: 'audio/mp4',
};

export function mimeOf(file: Blob & { name?: string }) {
  if (file.type) return file.type;
  const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
  return EXT_MIME[ext] || 'application/octet-stream';
}

function putChunk(url: string, offset: number, chunk: Blob, onProgress: (n: number) => void) {
  return new Promise<{ status: number; json: Record<string, unknown> }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-offset', String(offset));
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      let json = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* réponse vide */
      }
      resolve({ status: xhr.status, json });
    };
    xhr.onerror = () => reject(new Error('reseau'));
    xhr.ontimeout = () => reject(new Error('reseau'));
    xhr.timeout = 120_000;
    xhr.send(chunk);
  });
}

export interface UploadOptions {
  slug: string;
  file: Blob & { name?: string };
  caption?: string;
  text?: string;
  onProgress?: (sent: number, total: number) => void;
  onState?: (state: 'envoi' | 'attente' | 'reprise') => void;
}

export async function uploadFile(o: UploadOptions): Promise<string> {
  const mime = mimeOf(o.file);
  const start = await fetch(`/api/e/${o.slug}/envois`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: o.file.name || 'vocal', size: o.file.size, mime, caption: o.caption, text: o.text }),
  });
  const s = await start.json().catch(() => ({}));
  if (!start.ok) throw new Error(s.error || 'L’envoi n’a pas pu commencer.');

  const url = `/api/envois/${s.id}`;
  const size = o.file.size;
  const chunkSize: number = s.chunkSize;
  let offset = 0;
  let failures = 0;

  while (offset < size) {
    const chunk = o.file.slice(offset, Math.min(size, offset + chunkSize));
    try {
      o.onState?.('envoi');
      const r = await putChunk(url, offset, chunk, (n) => o.onProgress?.(offset + n, size));
      if (r.status === 200) {
        offset = Number(r.json.received);
        failures = 0;
        o.onProgress?.(offset, size);
        if (r.json.done) return String(r.json.mediaId);
      } else if (r.status === 409) {
        offset = Number(r.json.received);
      } else if (r.status >= 500 && r.status !== 507) {
        throw new Error('reseau');
      } else {
        throw new Error(String(r.json.error || 'Envoi refusé.'));
      }
    } catch (e) {
      if ((e as Error).message !== 'reseau') throw e;
      failures++;
      if (failures > 40) throw new Error('La connexion est trop instable. Réessayez plus tard.');
      o.onState?.('attente');
      await waitOnline();
      await sleep(Math.min(30_000, 1500 * failures));
      o.onState?.('reprise');
      try {
        const st = await fetch(url).then((r) => r.json());
        if (typeof st.received === 'number') offset = st.received;
      } catch {
        /* on réessaiera */
      }
    }
  }
  throw new Error('Envoi incomplet.');
}
