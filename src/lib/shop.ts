import sharp from 'sharp';
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { currentUser } from '@/lib/auth';
import { newId } from '@/lib/ids';
import { CATEGORIES } from '@/config/shop';
import { str } from '@/lib/api';
import type { Product } from '@/lib/types';

export async function currentVendor() {
  const user = await currentUser();
  if (!user) return { user: null, vendor: null };
  return { user, vendor: await db.vendors.byUser(user.id) };
}


/** Enregistre une photo de produit, redimensionnée (1200 px max). */
export async function saveProductPhoto(productId: string, file: File) {
  if (file.size > 15 * 1024 * 1024) throw new Error('Une photo dépasse 15 Mo.');
  const out = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  const key = `boutique/produits/${productId}/${newId()}.jpg`;
  await storage.saveBuffer(key, out);
  return key;
}

/** Lit les champs d'un produit envoyés par le formulaire vendeur. */
export function productFields(form: FormData): { data: Partial<Product>; error?: string } {
  const get = (k: string, max = 200) => str(form.get(k), max);
  const name = get('name', 100);
  const category = get('category', 40);
  const price = Math.round(Number(get('price', 12).replace(/\s/g, '')));
  const stock = Math.max(0, Math.round(Number(get('stock', 8)) || 0));
  const minQty = Math.max(1, Math.round(Number(get('minQty', 6)) || 1));
  if (name.length < 2) return { data: {}, error: 'Indiquez le nom du produit.' };
  if (!CATEGORIES.some((c) => c.id === category)) return { data: {}, error: 'Choisissez une catégorie.' };
  if (!Number.isFinite(price) || price <= 0) return { data: {}, error: 'Indiquez un prix en FCFA.' };
  return {
    data: {
      name,
      category,
      price,
      stock,
      minQty,
      unit: get('unit', 60) || 'l’unité',
      mode: get('mode') === 'location' ? 'location' : 'vente',
      description: get('description', 1500),
      delivery: get('delivery', 300),
      active: form.get('active') !== 'non',
    },
  };
}
