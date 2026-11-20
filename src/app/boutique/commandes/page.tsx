import { redirect } from 'next/navigation';
import Link from 'next/link';
import * as db from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { fcfa, longDate, dateTime } from '@/lib/format';
import { ORDER_STATUS } from '@/config/shop';
import { site } from '@/config/site';
import { guestBuyers } from '@/lib/shop';
import { ShopBar } from '@/components/shop/ShopBar';
import { CancelOrder } from '@/components/shop/OrderActions';

export const metadata = { title: 'Mes commandes' };

const tone = (s: string) => (['livree', 'terminee'].includes(s) ? 'ok' : ['refusee', 'annulee'].includes(s) ? 'no' : 'warn');

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const user = await currentUser();
  const guests = await guestBuyers();
  if (!user && guests.length === 0) redirect('/connexion?suite=/boutique/commandes');
  const { ok } = await searchParams;
  // Commandes passées avec le compte et/ou comme invité d'une fête
  const ids = [...(user ? [user.id] : []), ...guests.map((g) => g.buyerId)];
  const list = (await Promise.all(ids.map((id) => db.orders.byBuyer(id)))).flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const forEvent = new Map(guests.map((g) => [g.event.id, g.event.title]));

  return (
    <>
      <ShopBar title="Mes commandes" back="/boutique" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '12px 16px 48px' }} className="stack">
        {ok && (
          <p className="alert ok">
            {Number(ok) > 1 ? `${ok} commandes envoyées` : 'Commande envoyée'}. Nous allons vous appeler pour confirmer.
            Vous paierez à la livraison.
          </p>
        )}
        {list.length === 0 ? (
          <div style={{ padding: '40px 8px', textAlign: 'center' }} className="stack">
            <h2 style={{ fontSize: 26 }}>Aucune commande</h2>
            <p className="muted">Vos commandes de la boutique apparaîtront ici, avec leur suivi.</p>
            <div>
              <Link className="btn" href="/boutique">
                Aller à la boutique
              </Link>
            </div>
          </div>
        ) : (
          list.map((o) => {
            // Payée = livrée et réglée à la livraison
            const paid = ['livree', 'terminee'].includes(o.status);
            const closed = ['refusee', 'annulee'].includes(o.status);
            return (
              <article key={o.id} className="panel stack" style={{ ['--gap' as string]: '12px' }}>
                <div className="row between">
                  <div>
                    <b style={{ fontSize: 18 }}>Commande {o.reference}</b>
                    <div className="tiny">
                      {dateTime(o.createdAt)}
                      {o.eventId && forEvent.get(o.eventId) ? `, pour ${forEvent.get(o.eventId)}` : ''}
                    </div>
                  </div>
                  <span className={`pill ${tone(o.status)}`}>{ORDER_STATUS[o.status]}</span>
                </div>
                <div className="small">
                  {o.items.map((i) => (
                    <div key={i.productId} className="row between" style={{ padding: '4px 0', flexWrap: 'nowrap' }}>
                      <span>
                        {i.qty} × {i.name}
                      </span>
                      <span>{fcfa(i.qty * i.price)}</span>
                    </div>
                  ))}
                  <div className="row between" style={{ borderTop: '1px solid var(--trait)', paddingTop: 8, marginTop: 4, fontWeight: 700 }}>
                    <span>Total</span>
                    <span>{fcfa(o.total)}</span>
                  </div>
                </div>
                {!closed && (
                  <p className={`alert ${paid ? 'ok' : 'info'} small`} style={{ margin: 0 }}>
                    {paid ? `Payée : ${fcfa(o.total)} réglés à la livraison. Merci !` : `À payer à la livraison : ${fcfa(o.total)}.`}
                  </p>
                )}
                <p className="small muted">
                  {o.delivery === 'livraison' ? `Livraison : ${o.address}` : 'Retrait à notre dépôt'}, pour le {longDate(o.neededOn).toLowerCase()}.
                </p>
                <details>
                  <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>
                    Suivi
                  </summary>
                  <ul className="timeline small" style={{ marginTop: 12 }}>
                    {o.history.map((h, i) => (
                      <li key={i}>
                        <b>{ORDER_STATUS[h.status]}</b> <span className="muted">{dateTime(h.at)}</span>
                        {h.note && <div className="muted">{h.note}</div>}
                      </li>
                    ))}
                  </ul>
                </details>
                <div className="row">
                  <a className="btn quiet sm" href={`https://wa.me/${site.supportWhatsapp}?text=${encodeURIComponent(`Bonjour ${site.name}, au sujet de ma commande ${o.reference}.`)}`} target="_blank" rel="noreferrer">
                    Nous écrire
                  </a>
                  {o.status === 'en_attente' && <CancelOrder id={o.id} />}
                </div>
              </article>
            );
          })
        )}
      </main>
    </>
  );
}
