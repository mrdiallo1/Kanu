import * as db from '@/lib/db';
import { normalizePhone } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { currentVendor } from '@/lib/shop';
import { newId } from '@/lib/ids';

// Créer son profil vendeur (soumis à validation par l'administrateur).
export async function POST(req: Request) {
  const { user, vendor } = await currentVendor();
  if (!user) return fail('Connectez-vous d’abord.', 401);
  if (vendor) return fail('Vous avez déjà un profil vendeur.', 409);
  const b = await body(req);
  const businessName = str(b.businessName, 80);
  const phone = normalizePhone(str(b.phone, 30));
  if (businessName.length < 2) return fail('Indiquez le nom de votre commerce.');
  if (phone.length < 8) return fail('Indiquez un numéro joignable.');
  await db.vendors.create({
    id: newId(),
    userId: user.id,
    businessName,
    phone,
    city: str(b.city, 60) || 'Bamako',
    description: str(b.description, 600),
    status: 'en_attente',
    createdAt: new Date().toISOString(),
  });
  return ok({}, 201);
}

export async function PATCH(req: Request) {
  const { vendor } = await currentVendor();
  if (!vendor) return fail('Profil vendeur introuvable.', 404);
  const b = await body(req);
  const name = str(b.businessName, 80);
  await db.vendors.update(vendor.id, {
    businessName: name.length >= 2 ? name : vendor.businessName,
    phone: normalizePhone(str(b.phone, 30)) || vendor.phone,
    city: str(b.city, 60) || vendor.city,
    description: str(b.description, 600),
  });
  return ok();
}
