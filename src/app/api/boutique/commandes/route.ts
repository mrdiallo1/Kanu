import * as db from '@/lib/db';
import { currentUser, normalizePhone } from '@/lib/auth';
import { body, fail, ok, rateLimit, str } from '@/lib/api';
import { newId, shortRef } from '@/lib/ids';
import type { Order, OrderItem } from '@/lib/types';
import { SHOP_VENDOR_ID, guestBuyers } from '@/lib/shop';

// Passer commande. Kanu est le seul vendeur : un panier = une commande, payée à la livraison.
export async function POST(req: Request) {
  if (rateLimit(req, 'commande', 10)) return fail('Trop de commandes en peu de temps. Patientez un instant.', 429);
  const user = await currentUser();
  const b = await body(req);

  // Qui commande ? Un compte Kanu (les mariés…) ou un invité entré dans l'espace d'une fête.
  const guests = user ? [] : await guestBuyers();
  const guest = guests.find((g) => g.event.id === str(b.eventId, 60)) || guests[0];
  if (!user && !guest) return fail('Connectez-vous, ou entrez dans l’espace de la fête avec votre code, pour commander.', 401);
  const buyer = user
    ? { id: user.id, name: user.name, phone: user.phone }
    : { id: guest!.buyerId, name: guest!.name, phone: guest!.phone };

  const lines = Array.isArray(b.items) ? (b.items as { productId: string; qty: number }[]).slice(0, 60) : [];
  if (lines.length === 0) return fail('Votre panier est vide.');
  const delivery = b.delivery === 'retrait' ? 'retrait' : 'livraison';
  const address = str(b.address, 300);
  const phone = normalizePhone(str(b.phone, 30)) || buyer.phone;
  if (phone.length < 8) return fail('Indiquez votre numéro de téléphone pour que nous puissions vous appeler.');
  const neededOn = /^\d{4}-\d{2}-\d{2}$/.test(str(b.neededOn)) ? str(b.neededOn) : '';
  if (delivery === 'livraison' && address.length < 4) return fail('Indiquez l’adresse de livraison.');
  if (!neededOn) return fail('Indiquez la date à laquelle vous en avez besoin.');

  let eventId: string | undefined;
  if (guest) {
    eventId = guest.event.id; // un invité commande pour sa fête
  } else if (b.eventId && user) {
    const e = await db.events.byId(str(b.eventId, 60));
    if (e && e.ownerId === user.id) eventId = e.id;
    // un compte qui est aussi invité de cette fête
    else if (e && (await guestBuyers()).some((g) => g.event.id === e.id)) eventId = e.id;
  }

  const byVendor = new Map<string, OrderItem[]>();
  for (const l of lines) {
    const p = await db.products.byId(String(l.productId));
    const qty = Math.round(Number(l.qty));
    if (!p || !p.active || p.vendorId !== SHOP_VENDOR_ID) return fail('Un produit de votre panier n’est plus disponible. Retirez-le puis réessayez.');
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
      buyerId: buyer.id,
      buyerName: buyer.name,
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
