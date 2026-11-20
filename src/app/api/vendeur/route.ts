import * as db from '@/lib/db';
import { normalizePhone } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { currentVendor } from '@/lib/shop';

// La boutique est tenue par Kanu : plus d'inscription de vendeurs extérieurs.
export async function POST() {
  return fail('La boutique est tenue par Kanu : il n’est pas possible d’y vendre.', 403);
}

// Modifier le profil de la boutique Kanu (administrateurs seulement)
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
