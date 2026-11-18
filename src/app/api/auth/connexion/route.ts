import * as db from '@/lib/db';
import { normalizePhone, verifyPassword } from '@/lib/auth';
import { body, fail, ok, rateLimit, str } from '@/lib/api';
import { updateSession } from '@/lib/session';

export async function POST(req: Request) {
  if (rateLimit(req, 'connexion', 10)) return fail('Trop de tentatives. Réessayez dans une minute.', 429);
  const b = await body(req);
  const phone = normalizePhone(str(b.phone, 30));
  const password = typeof b.password === 'string' ? b.password : '';
  const user = await db.users.byPhone(phone);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail('Numéro ou mot de passe incorrect.', 401);
  }
  if (user.suspended) return fail('Ce compte est suspendu. Contactez l’assistance.', 403);
  await updateSession((s) => ({ ...s, u: user.id }));
  return ok();
}
