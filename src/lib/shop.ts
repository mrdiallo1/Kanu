import sharp from 'sharp';
import * as db from '@/lib/db';
import * as storage from '@/lib/storage';
import { currentUser, isAdmin } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { eventTitle } from '@/lib/format';
import { site } from '@/config/site';
import { newId } from '@/lib/ids';
import { CATEGORIES } from '@/config/shop';
import { str } from '@/lib/api';
import type { Product } from '@/lib/types';

// La boutique est tenue par Kanu : c'est nous qui vendons et livrons.
// Tous les produits appartiennent au « vendeur » fixe ci-dessous, et seuls
// les administrateurs (numéros dans ADMIN_PHONES) peuvent le gérer.
export const SHOP_VENDOR_ID = 'kanu';

/** Le profil « boutique Kanu », créé automatiquement la première fois. */
export async function shopVendor() {
  const existing = await db.vendors.byId(SHOP_VENDOR_ID);
  if (existing) return existing;
  const v = {
    id: SHOP_VENDOR_ID,
    userId: SHOP_VENDOR_ID,
    businessName: site.name,
    phone: site.supportWhatsapp.replace(/^223/, ''),
    city: site.city,
    description: '',
    status: 'valide' as const,
    createdAt: new Date().toISOString(),
  };
  await db.vendors.create(v);
  return v;
}

/** Utilisateur connecté et boutique Kanu (vendor = null si ce n'est pas un administrateur). */
export async function currentVendor() {
  const user = await currentUser();
  if (!user) return { user: null, vendor: null };
  if (!isAdmin(user)) return { user, vendor: null };
  return { user, vendor: await shopVendor() };
}


// ---------- Acheteurs ----------
// Les mariés (compte Kanu) et leurs INVITÉS peuvent commander pour la fête.
// Un invité n'a pas de compte : on le reconnaît grâce à son entrée dans
// l'espace de la fête (code + nom). Ses commandes sont enregistrées avec
// l'identifiant « invite:<id de l'invité> ».

export const guestBuyerId = (guestId: string) => `invite:${guestId}`;

/** Les fêtes où ce téléphone est entré comme invité (espaces actifs seulement). */
export async function guestBuyers() {
  const s = await getSession();
  const out: { guestId: string; buyerId: string; name: string; phone: string; event: { id: string; slug: string; title: string; date: string; place: string } }[] = [];
  for (const [eventId, guestId] of Object.entries(s.g || {})) {
    const [guest, event] = await Promise.all([db.guests.byId(guestId), db.events.byId(eventId)]);
    if (!guest || guest.blocked || guest.eventId !== eventId || !event || event.status !== 'actif') continue;
    out.push({
      guestId: guest.id,
      buyerId: guestBuyerId(guest.id),
      name: guest.name,
      phone: guest.phone || '',
      event: { id: event.id, slug: event.slug, title: eventTitle(event), date: event.date, place: event.receptionPlace || event.ceremonyPlace },
    });
  }
  return out;
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

/** Lit les champs d'un produit envoyés par le formulaire de gestion. */
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
