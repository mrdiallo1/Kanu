import Link from 'next/link';
import { notFound } from 'next/navigation';
import * as db from '@/lib/db';
import { currentUser, isAdmin } from '@/lib/auth';
import { SiteHeader } from '@/components/SiteHeader';
import { StatusPill } from '@/components/StatusPill';
import { AdminToggle, VendorStatus } from '@/components/AdminToggle';
import { ORDER_STATUS } from '@/config/shop';
import { bytes, eventTitle, fcfa, shortDate } from '@/lib/format';
import { PLANS } from '@/config/plans';

export const metadata = { title: 'Administration' };

export default async function Page() {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();

  const [events, users, payments, totalBytes, vendors, orders] = await Promise.all([
    db.events.all(),
    db.users.all(),
    db.payments.all(),
    db.media.totalBytes(),
    db.vendors.all(),
    db.orders.all(),
  ]);
  const paid = payments.filter((p) => p.status === 'paye');
  const revenue = paid.reduce((n, p) => n + p.amount, 0);
  const rows = await Promise.all(
    events.map(async (e) => ({
      e,
      owner: users.find((u) => u.id === e.ownerId),
      seats: await db.guests.seatCount(e.id),
      used: (await db.media.bytesUsed(e.id)).stored,
    })),
  );

  return (
    <>
      <SiteHeader />
      <main className="wrap dash-body stack" style={{ ['--gap' as string]: '40px' }}>
        <h1 style={{ fontSize: 'clamp(38px, 6vw, 60px)' }}>Administration</h1>
        <div className="figures">
          <div>
            <b>{events.length}</b>espaces créés
          </div>
          <div>
            <b>{events.filter((e) => e.status === 'actif').length}</b>espaces ouverts
          </div>
          <div>
            <b>{users.length}</b>comptes organisateurs
          </div>
          <div>
            <b>{bytes(totalBytes)}</b>stockés au total
          </div>
        </div>

        <div className="panel orange row between">
          <div>
            <b style={{ fontSize: 19 }}>Revenus</b>
            <p>{paid.length} paiements validés</p>
          </div>
          <b style={{ fontFamily: 'var(--display)', fontSize: 44, letterSpacing: '-0.04em' }}>{fcfa(revenue)}</b>
        </div>

        <section>
          <h2 style={{ fontSize: 32, marginBottom: 16 }}>Espaces</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fête</th>
                  <th>Organisateur</th>
                  <th>Date</th>
                  <th>Offre</th>
                  <th>Invités</th>
                  <th>Stockage</th>
                  <th>État</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ e, owner, seats, used }) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/e/${e.slug}`}>{eventTitle(e)}</Link>
                    </td>
                    <td>
                      {owner?.name}
                      <div className="tiny">{owner?.phone}</div>
                    </td>
                    <td>{shortDate(e.date)}</td>
                    <td>{PLANS[e.plan].name}</td>
                    <td>
                      {seats}/{PLANS[e.plan].maxGuests}
                    </td>
                    <td>
                      {bytes(used)} / {PLANS[e.plan].storageGb} Go
                    </td>
                    <td>
                      <StatusPill event={e} />
                    </td>
                    <td>
                      <AdminToggle id={e.id} suspended={e.status === 'suspendu'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 32, marginBottom: 6 }}>Boutique</h2>
          <p className="muted small" style={{ marginBottom: 16 }}>
            {vendors.filter((v) => v.status === 'en_attente').length} vendeur(s) à valider, {orders.length} commandes au total pour{' '}
            {fcfa(orders.filter((o) => ['livree', 'terminee'].includes(o.status)).reduce((n, o) => n + o.total, 0))} livrés.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vendeur</th>
                  <th>Téléphone</th>
                  <th>Ville</th>
                  <th>Commandes</th>
                  <th>État</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => {
                  const vo = orders.filter((o) => o.vendorId === v.id);
                  return (
                    <tr key={v.id}>
                      <td>
                        <b>{v.businessName}</b>
                        <div className="tiny">{v.description.slice(0, 80)}</div>
                      </td>
                      <td>{v.phone}</td>
                      <td>{v.city}</td>
                      <td>
                        {vo.length}
                        {vo.length > 0 && <div className="tiny">dernière : {ORDER_STATUS[vo[0].status].toLowerCase()}</div>}
                      </td>
                      <td>
                        <VendorStatus id={v.id} status={v.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 32, marginBottom: 16 }}>Paiements</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Moyen</th>
                  <th>Prestataire</th>
                  <th>État</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.reference}</td>
                    <td>{shortDate(p.createdAt)}</td>
                    <td>{fcfa(p.amount)}</td>
                    <td>{p.method}</td>
                    <td>{p.provider}</td>
                    <td>
                      <span className={`pill ${p.status === 'paye' ? 'ok' : p.status === 'echoue' ? 'no' : 'warn'}`}>
                        {p.status === 'paye' ? 'Payé' : p.status === 'echoue' ? 'Échoué' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
