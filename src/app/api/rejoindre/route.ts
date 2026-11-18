import * as db from '@/lib/db';
import { body, fail, ok, rateLimit, str } from '@/lib/api';

// Saisie manuelle du code : retrouve l'espace correspondant.
export async function POST(req: Request) {
  if (rateLimit(req, 'code', 15)) return fail('Trop de tentatives. Réessayez dans une minute.', 429);
  const b = await body(req);
  let code = str(b.code, 10).toUpperCase().replace(/\s/g, '');
  if (code.length === 6) code = `${code.slice(0, 3)}-${code.slice(3)}`;
  const event = await db.events.byCode(code);
  if (!event || event.status === 'suspendu' || event.status === 'brouillon') {
    return fail('Aucun espace ouvert ne correspond à ce code.', 404);
  }
  return ok({ slug: event.slug, code: event.code });
}
