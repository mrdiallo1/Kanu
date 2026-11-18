import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { fail, ok } from '@/lib/api';
import { currentVendor, productFields, saveProductPhoto } from '@/lib/shop';

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const { id } = await ctx.params;
  const { vendor } = await currentVendor();
  if (!vendor) return null;
  const product = await db.products.byId(id);
  if (!product || product.vendorId !== vendor.id) return null;
  return { vendor, product };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Produit introuvable.', 404);
  const form = await req.formData();

  // Simple bascule « disponible / masqué »
  if (form.get('toggle') === '1') {
    await db.products.update(l.product.id, { active: !l.product.active });
    return ok();
  }

  const { data, error } = productFields(form);
  if (error) return fail(error);
  const remove = new Set(form.getAll('removePhotos').map(String));
  const photos = l.product.photos.filter((k) => !remove.has(k));
  for (const k of remove) if (l.product.photos.includes(k)) await storage.remove(k);
  try {
    for (const f of form.getAll('photos')) {
      if (photos.length >= 5) break;
      if (f instanceof File && f.size > 0) photos.push(await saveProductPhoto(l.product.id, f));
    }
  } catch (e) {
    return fail((e as Error).message || 'Une photo n’a pas pu être lue.');
  }
  await db.products.update(l.product.id, { ...data, photos });
  return ok();
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const l = await load(ctx);
  if (!l) return fail('Produit introuvable.', 404);
  for (const k of l.product.photos) await storage.remove(k);
  await db.products.remove(l.product.id);
  return ok();
}
