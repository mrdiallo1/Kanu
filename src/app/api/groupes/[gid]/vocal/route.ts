// Envoi d'un message vocal. Le fichier va sur Cloudflare R2 :
// events/{fête}/discussions/{groupe}/{message}.{m4a|webm|ogg}
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { fail, ok, rateLimit } from '@/lib/api';
import { loadGroup, messageView } from '@/lib/chat';
import { newId } from '@/lib/ids';

const MAX_SECONDS = 300; // 5 minutes
const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3' };

/** Le début du fichier doit être celui d'un vrai fichier audio */
function looksLikeAudio(b: Buffer) {
  const hex = b.subarray(0, 4).toString('hex');
  const ascii = b.subarray(0, 12).toString('latin1');
  return ascii.slice(4, 8) === 'ftyp' || hex === '1a45dfa3' || ascii.startsWith('OggS') || ascii.startsWith('ID3') || hex.startsWith('fff');
}

export async function POST(req: Request, ctx: { params: Promise<{ gid: string }> }) {
  if (rateLimit(req, 'vocal', 30)) return fail('Vous envoyez trop de messages. Patientez un instant.', 429);
  const l = await loadGroup(ctx);
  if (!l) return fail('Groupe introuvable.', 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('Envoi invalide.');
  }
  const file = form.get('audio');
  if (!(file instanceof Blob) || file.size === 0) return fail('Message vocal vide.');
  if (file.size > MAX_BYTES) return fail('Message vocal trop long (5 minutes au maximum).', 413);
  const mime = (file.type || '').split(';')[0].trim().toLowerCase();
  const ext = EXT[mime];
  if (!ext) return fail('Format audio non pris en charge.');
  const data = Buffer.from(await file.arrayBuffer());
  if (!looksLikeAudio(data)) return fail('Ce fichier n’est pas un audio valide.');

  const seconds = Math.max(1, Math.min(MAX_SECONDS, Math.round(Number(form.get('seconds')) || 1)));
  const id = newId();
  const type = mime === 'audio/x-m4a' ? 'audio/mp4' : mime;
  const key = `events/${l.event.id}/discussions/${l.group.id}/${id}.${ext}`;
  await storage.saveBuffer(key, data, type);

  const v = l.viewer;
  const m = await db.messages.create({
    id,
    groupId: l.group.id,
    eventId: l.event.id,
    author: v.kind === 'owner' ? { kind: 'owner', id: v.user.id, name: v.name } : { kind: 'guest', id: v.guest.id, name: v.name },
    text: '',
    audio: { key, mime: type, seconds, size: data.length },
    createdAt: new Date().toISOString(),
  });
  return ok({ message: messageView(m) }, 201);
}
