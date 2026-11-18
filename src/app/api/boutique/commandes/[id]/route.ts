import * as db from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { NEXT_STATUS } from '@/config/shop';
import type { OrderStatus } from '@/lib/types';

// Le vendeur fait avancer la commande ; l'acheteur peut l'annuler tant qu'elle n'est pas acceptée.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return fail('Connectez-vous.', 401);
  const order = await db.orders.byId(id);
  if (!order) return fail('Commande introuvable.', 404);
  const b = await body(req);
  const status = str(b.status, 20) as OrderStatus;
  const note = str(b.note, 300) || undefined;
  const now = new Date().toISOString();

  const vendor = await db.vendors.byUser(user.id);
  const isVendor = vendor && vendor.id === order.vendorId;
  const isBuyer = order.buyerId === user.id;

  if (isBuyer && !isVendor) {
    if (status !== 'annulee' || order.status !== 'en_attente') {
      return fail('Vous pouvez annuler la commande tant que le vendeur ne l’a pas acceptée.');
    }
  } else if (isVendor) {
    if (!(NEXT_STATUS[order.status] || []).includes(status)) return fail('Cette étape n’est pas possible maintenant.');
    // Les articles vendus sortent du stock quand la commande est acceptée
    if (status === 'acceptee') {
      for (const it of order.items) {
        const p = await db.products.byId(it.productId);
        if (p && p.mode === 'vente' && p.stock > 0) await db.products.update(p.id, { stock: Math.max(0, p.stock - it.qty) });
      }
    }
  } else {
    return fail('Accès refusé.', 403);
  }

  await db.orders.update(order.id, { status, history: [...order.history, { status, at: now, note }] });
  return ok();
}
