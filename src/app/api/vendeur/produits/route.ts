import * as db from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { currentVendor, productFields, saveProductPhoto } from '@/lib/shop';
import { newId } from '@/lib/ids';
import type { Product } from '@/lib/types';

export async function POST(req: Request) {
  const { vendor } = await currentVendor();
  if (!vendor) return fail('Profil vendeur introuvable.', 404);
  if (vendor.status === 'suspendu') return fail('Votre compte vendeur est suspendu.', 403);
  const form = await req.formData();
  const { data, error } = productFields(form);
  if (error) return fail(error);

  const id = newId();
  const photos: string[] = [];
  try {
    for (const f of form.getAll('photos').slice(0, 5)) {
      if (f instanceof File && f.size > 0) photos.push(await saveProductPhoto(id, f));
    }
  } catch (e) {
    return fail((e as Error).message || 'Une photo n’a pas pu être lue. Essayez un JPG ou un PNG.');
  }
  await db.products.create({
    ...(data as Product),
    id,
    vendorId: vendor.id,
    photos,
    createdAt: new Date().toISOString(),
  });
  return ok({ id }, 201);
}
