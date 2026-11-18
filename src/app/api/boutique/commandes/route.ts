import * as db from '@/lib/db';
import { currentUser, normalizePhone } from '@/lib/auth';
import { body, fail, ok, rateLimit, str } from '@/lib/api';
import { newId, shortRef } from '@/lib/ids';
import type { Order, OrderItem } from '@/lib/types';

// Passer commande. Le panier est découpé en une commande par vendeur.
export async function POST(req: Request) {
  if (rateLimit(req, 'commande', 10)) return fail('Trop de commandes en peu de temps. Patientez un instant.', 429);
  const user = await currentUser();
  if (!user) return fail('Connectez-vous pour commander.', 401);
  const b = await body(req);

  const lines = Array.isArray(b.items) ? (b.items as { productId: string; qty: number }[]).slice(0, 60) : [];
  if (lines.length === 0) return fail('Votre panier est vide.');
  const delivery = b.delivery === 'retrait' ? 'retrait' : 'livraison';
  const address = str(b.address, 300);
  const phone = normalizePhone(str(b.phone, 30)) || user.phone;
  const neededOn = /^\d{4}-\d{2}-\d{2}$/.test(str(b.neededOn)) ? str(b.neededOn) : '';
  if (delivery === 'livraison' && address.length < 4) return fail('Indiquez l’adresse de livraison.');
  if (!neededOn) return fail('Indiquez la date à laquelle vous en avez besoin.');

  let eventId: string | undefined;
  if (b.eventId) {
    const e = await db.events.byId(str(b.eventId, 60));
    if (e && e.ownerId === user.id) eventId = e.id;
  }

  const byVendor = new Map<string, OrderItem[]>();
  for (const l of lines) {
    const p = await db.products.byId(String(l.productId));
    const qty = Math.round(Number(l.qty));
    if (!p || !p.active) return fail('Un produit de votre panier n’est plus disponible. Retirez-le puis réessayez.');
    const vendor = await db.vendors.byId(p.vendorId);
    if (!vendor || vendor.status !== 'valide') return fail(`« ${p.name} » n’est plus disponible.`);
    if (!Number.isFinite(qty) || qty < p.minQty) return fail(`« ${p.name} » : minimum ${p.minQty}.`);
    if (p.stock > 0 && qty > p.stock) return fail(`« ${p.name} » : il n’en reste que ${p.stock}.`);
    const items = byVendor.get(p.vendorId) || [];
    items.push({ productId: p.id, name: p.name, unit: p.unit, mode: p.mode, price: p.price, qty });
    byVendor.set(p.vendorId, items);
  }

  const now = new Date().toISOString();
  const refs: string[] = [];
  for (const [vendorId, items] of byVendor) {
    const order: Order = {
      id: newId(),
      reference: shortRef().replace('KN', 'CMD'),
      buyerId: user.id,
      buyerName: user.name,
      buyerPhone: phone,
      eventId,
      vendorId,
      items,
      total: items.reduce((n, i) => n + i.price * i.qty, 0),
      delivery,
      address: delivery === 'livraison' ? address : '',
      neededOn,
      note: str(b.note, 600),
      status: 'en_attente',
      history: [{ status: 'en_attente', at: now }],
      createdAt: now,
    };
    await db.orders.create(order);
    refs.push(order.reference);
  }
  return ok({ references: refs }, 201);
}
