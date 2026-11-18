import * as db from '@/lib/db';
import { hashPassword, normalizePhone } from '@/lib/auth';
import { body, fail, ok, rateLimit, str } from '@/lib/api';
import { newId } from '@/lib/ids';
import { updateSession } from '@/lib/session';

export async function POST(req: Request) {
  if (rateLimit(req, 'inscription', 10)) return fail('Trop de tentatives. Réessayez dans une minute.', 429);
  const b = await body(req);
  const name = str(b.name, 80);
  const phone = normalizePhone(str(b.phone, 30));
  const password = typeof b.password === 'string' ? b.password : '';

  if (name.length < 2) return fail('Indiquez votre nom.');
  if (phone.length < 8) return fail('Indiquez un numéro de téléphone valide.');
  if (password.length < 6) return fail('Le mot de passe doit contenir au moins 6 caractères.');
  if (await db.users.byPhone(phone)) return fail('Ce numéro a déjà un compte. Connectez-vous.', 409);

  const user = await db.users.create({
    id: newId(),
    name,
    phone,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  await updateSession((s) => ({ ...s, u: user.id }));
  return ok({ ok: true });
}
