// Paiements avec LigdiCash (paiement avec redirection).
//
// Fonctionnement :
// 1. startPayment crée une facture chez LigdiCash et renvoie l'adresse de sa
//    page de paiement. Le client y choisit son opérateur (Orange Money,
//    Moov Money, Wave, carte…) et paie.
// 2. LigdiCash prévient le serveur (POST /api/paiements/rappel) et renvoie
//    le client sur GET /api/paiements/rappel, qui l'envoie vers son tableau
//    de bord (payé) ou vers la page de paiement (annulé).
// 3. Dans les deux cas, on redemande le statut à LigdiCash (checkPayment)
//    avec le jeton gardé à la création. Seule cette réponse fait passer le
//    paiement en « payé » : jamais une information venue du navigateur.
//
// .env.local :
//   PAYMENT_MODE=ligdicash          (ou simulation pour tester sans payer)
//   LIGDICASH_API_KEY=...           (Apikey de votre projet LigdiCash)
//   LIGDICASH_API_TOKEN=...         (API Token, sans le mot Bearer)
//   LIGDICASH_URL=https://app.ligdicash.com   (facultatif)
//   NEXT_PUBLIC_SITE_URL=https://votre-site   (adresse publique en https)

import * as db from '@/lib/db';
import { PLANS, type PlanId } from '@/config/plans';
import { site, siteUrl } from '@/config/site';
import { newId, shortRef } from '@/lib/ids';
import type { Payment } from '@/lib/types';

/** Le paiement, avec le jeton LigdiCash enregistré à la création */
type LigdiPayment = Payment & { providerToken?: string };

export const METHODS = [
  { id: 'orange', label: 'Orange Money' },
  { id: 'moov', label: 'Moov Money' },
  { id: 'wave', label: 'Wave' },
  { id: 'carte', label: 'Carte bancaire' },
] as const;

export type MethodId = (typeof METHODS)[number]['id'];

export interface StartResult {
  payment: Payment;
  /** Si le prestataire renvoie une page de paiement, rediriger le client ici */
  redirectUrl?: string;
}

const isSimulation = () => process.env.PAYMENT_MODE === 'simulation';

// ---------- Appels à l'API LigdiCash ----------

function ligdicash(path: string, init: RequestInit = {}) {
  const key = process.env.LIGDICASH_API_KEY;
  const token = process.env.LIGDICASH_API_TOKEN;
  if (!key || !token) throw new Error('LigdiCash : LIGDICASH_API_KEY ou LIGDICASH_API_TOKEN manquant dans .env.local');
  const base = (process.env.LIGDICASH_URL || 'https://app.ligdicash.com').replace(/\/$/, '');
  return fetch(base + path, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
    headers: {
      Apikey: key,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

interface LigdiCreate {
  response_code?: string;
  token?: string;
  response_text?: string;
}

interface LigdiConfirm {
  response_code?: string;
  response_text?: string;
  status?: 'completed' | 'pending' | 'notcompleted' | '';
  amount?: number | string;
  montant?: number | string;
}

// ---------- Démarrer un paiement ----------

export async function startPayment(opts: {
  eventId: string;
  userId: string;
  plan: PlanId;
  method: MethodId;
  phone?: string;
}): Promise<StartResult> {
  const plan = PLANS[opts.plan];
  const payment: Payment = {
    id: newId(),
    eventId: opts.eventId,
    userId: opts.userId,
    plan: plan.id,
    amount: plan.price,
    method: opts.method,
    phone: opts.phone,
    provider: isSimulation() ? 'simulation' : 'ligdicash',
    reference: shortRef(),
    status: 'en_attente',
    createdAt: new Date().toISOString(),
  };
  await db.payments.create(payment);

  if (payment.provider === 'simulation') {
    await markPaid(payment.id);
    return { payment: (await db.payments.byId(payment.id))! };
  }

  const user = await db.users.byId(opts.userId);
  const [firstname, ...rest] = (user?.name || '').split(' ');
  const base = siteUrl();

  let data: LigdiCreate = {};
  try {
    const res = await ligdicash('/pay/v01/redirect/checkout-invoice/create', {
      method: 'POST',
      body: JSON.stringify({
        commande: {
          invoice: {
            items: [
              {
                name: `${site.name} – offre ${plan.name}`,
                description: `Espace de fête ${site.name}, offre ${plan.name}`,
                quantity: 1,
                unit_price: plan.price,
                total_price: plan.price,
              },
            ],
            total_amount: plan.price,
            devise: 'XOF',
            description: `${site.name} – offre ${plan.name} (réf. ${payment.reference})`,
            // Toujours vide : sinon LigdiCash masque une partie des opérateurs
            customer: '',
            customer_firstname: firstname || '',
            customer_lastname: rest.join(' '),
            customer_email: '',
            external_id: '',
            otp: '',
          },
          store: { name: site.name, website_url: base },
          actions: {
            cancel_url: `${base}/api/paiements/rappel?p=${payment.id}&annule=1`,
            return_url: `${base}/api/paiements/rappel?p=${payment.id}`,
            callback_url: `${base}/api/paiements/rappel`,
          },
          custom_data: { transaction_id: payment.id, reference: payment.reference },
        },
      }),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    console.error('LigdiCash (création) :', e);
  }

  if (data.response_code !== '00' || !data.token || !data.response_text) {
    console.error('LigdiCash a refusé la facture :', data.response_text);
    await db.payments.update(payment.id, { status: 'echoue' });
    throw new Error('Le paiement n’a pas pu démarrer. Réessayez dans un instant.');
  }

  await db.payments.update(payment.id, { providerToken: data.token } as Partial<LigdiPayment>);
  return { payment: (await db.payments.byId(payment.id))!, redirectUrl: data.response_text };
}

// ---------- Vérifier un paiement auprès de LigdiCash ----------

/**
 * Demande le statut à LigdiCash et met à jour le paiement.
 * Renvoie le paiement à jour (statut 'paye', 'en_attente' ou 'echoue').
 */
export async function checkPayment(paymentId: string) {
  const p = (await db.payments.byId(paymentId)) as LigdiPayment | null;
  if (!p || p.status === 'paye' || p.provider !== 'ligdicash' || !p.providerToken) return p;

  let data: LigdiConfirm = {};
  try {
    const res = await ligdicash(`/pay/v01/redirect/checkout-invoice/confirm/?invoiceToken=${encodeURIComponent(p.providerToken)}`, {
      method: 'GET',
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    console.error('LigdiCash (vérification) :', e);
    return p; // on réessaiera plus tard
  }

  if (data.status === 'completed') {
    const paid = Number(data.amount ?? data.montant);
    if (paid >= p.amount) return markPaid(p.id);
    console.error(`LigdiCash : montant reçu ${paid} inférieur à ${p.amount} (paiement ${p.id})`);
    return p;
  }
  if (data.status === 'notcompleted') {
    await db.payments.update(p.id, { status: 'echoue' });
    return db.payments.byId(p.id);
  }
  return p; // 'pending' ou erreur technique : on attend
}

/** À appeler uniquement après confirmation par le prestataire. */
export async function markPaid(paymentId: string) {
  const p = await db.payments.byId(paymentId);
  if (!p || p.status === 'paye') return p;
  const now = new Date().toISOString();
  await db.payments.update(p.id, { status: 'paye', paidAt: now });
  await db.events.update(p.eventId, { status: 'actif', paidAt: now, plan: p.plan });
  return db.payments.byId(p.id);
}