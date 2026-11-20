// LigdiCash utilise cette adresse de deux façons :
// - POST : notification envoyée par LigdiCash quand le statut change (callback_url).
// - GET  : retour du client après paiement ou annulation (return_url / cancel_url).
// Dans les deux cas, on redemande le vrai statut à LigdiCash (checkPayment) :
// le contenu de la notification et l'adresse de retour ne prouvent rien.

import { NextResponse } from 'next/server';
import { ok } from '@/lib/api';
import { checkPayment } from '@/lib/payments';
import { currentUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { siteUrl } from '@/config/site';

const validId = (id: string | null): id is string => !!id && /^[\w-]{6,64}$/.test(id);

/** Retrouve notre identifiant de paiement (custom_data « transaction_id ») dans la notification. */
function transactionId(data: unknown, form?: URLSearchParams): string | null {
  const cd = (data as { custom_data?: unknown })?.custom_data;
  if (Array.isArray(cd)) {
    const e = cd.find((x) => x?.keyof_customdata === 'transaction_id');
    if (e?.valueof_customdata) return String(e.valueof_customdata);
  } else if (cd && typeof cd === 'object' && 'transaction_id' in cd) {
    return String((cd as Record<string, unknown>).transaction_id);
  }
  if (form) {
    for (const [k, v] of form.entries()) {
      if (k === 'transaction_id' || k.endsWith('[transaction_id]')) return v;
      if (v === 'transaction_id' && k.includes('keyof_customdata')) {
        const found = form.get(k.replace('keyof_customdata', 'valueof_customdata'));
        if (found) return found;
      }
    }
  }
  return null;
}

// Notification de LigdiCash (envoyée deux fois : en JSON et en formulaire)
export async function POST(req: Request) {
  let id: string | null = null;
  try {
    if ((req.headers.get('content-type') || '').includes('application/json')) {
      id = transactionId(await req.json());
    } else {
      const form = new URLSearchParams(await req.text());
      let parsed: unknown;
      try {
        const raw = form.get('custom_data');
        parsed = raw ? { custom_data: JSON.parse(raw) } : undefined;
      } catch {
        parsed = undefined;
      }
      id = transactionId(parsed, form);
    }
  } catch {
    id = null;
  }
  if (validId(id)) await checkPayment(id);
  // Toujours 200 : sinon LigdiCash renvoie la notification en boucle
  return ok({ received: true });
}

// Retour du client depuis la page LigdiCash.
// LigdiCash ajoute parfois « ?token=… » à la fin de l'adresse : on ne garde
// que l'identifiant. Le statut est revérifié même si la session a été perdue
// pendant le paiement (le tableau de bord contrôle ensuite le propriétaire).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get('p') || '').split('?')[0].trim();
  const cancelled = (url.searchParams.get('annule') || '').startsWith('1');
  const base = siteUrl();
  const before = validId(id) ? await db.payments.byId(id) : null;
  if (!before) return NextResponse.redirect(`${base}/tableau`);

  const p = (await checkPayment(before.id)) ?? before;
  const user = await currentUser();
  if (!user || user.id !== p.userId) return NextResponse.redirect(`${base}/tableau`);

  if (p.status === 'paye') return NextResponse.redirect(`${base}/tableau/${p.eventId}?bienvenue=1`);
  if (p.status === 'echoue' || cancelled) {
    return NextResponse.redirect(`${base}/paiement/${p.eventId}?echec=1`);
  }
  // Encore en attente de l'opérateur : le tableau de bord revérifie à chaque ouverture
  return NextResponse.redirect(`${base}/tableau/${p.eventId}?paiement=attente`);
}
