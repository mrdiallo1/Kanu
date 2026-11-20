import { ownerOf } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { METHODS, recentPendingPayment, startPayment, type MethodId } from '@/lib/payments';
import { normalizePhone } from '@/lib/auth';
import { PLANS, type PlanId } from '@/config/plans';
import * as db from '@/lib/db';

export async function POST(req: Request) {
  const b = await body(req);
  const own = await ownerOf(str(b.eventId, 60));
  if (!own) return fail('Accès refusé.', 403);
  if (own.event.status !== 'brouillon') return fail('Cet espace est déjà payé.');
  // Un paiement lancé il y a moins de 2 minutes n'est pas encore confirmé :
  // on évite de faire payer deux fois par un double appui.
  const last = await recentPendingPayment(own.event.id);
  if (last && Date.now() - Date.parse(last.createdAt) < 120_000) {
    return fail('Un paiement est déjà en cours. Terminez-le sur la page LigdiCash ou réessayez dans 2 minutes.', 409);
  }

  const method = str(b.method, 20) as MethodId;
  if (!METHODS.some((m) => m.id === method)) return fail('Choisissez un moyen de paiement.');
  const phone = normalizePhone(str(b.phone, 30));
  if (method !== 'carte' && phone.length < 8) return fail('Indiquez le numéro qui va payer.');

  const plan = str(b.plan, 20) as PlanId;
  if (plan in PLANS && plan !== own.event.plan) await db.events.update(own.event.id, { plan });

  try {
    const r = await startPayment({
      eventId: own.event.id,
      userId: own.user.id,
      plan: plan in PLANS ? plan : own.event.plan,
      method,
      phone,
    });
    return ok({ status: r.payment.status, reference: r.payment.reference, redirectUrl: r.redirectUrl });
  } catch (e) {
    return fail((e as Error).message, 503);
  }
}
