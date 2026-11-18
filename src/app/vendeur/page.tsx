import Link from 'next/link';
import { redirect } from 'next/navigation';
import * as db from '@/lib/db';
import { currentVendor } from '@/lib/shop';
import { fcfa, longDate, dateTime } from '@/lib/format';
import { ORDER_STATUS, categoryName } from '@/config/shop';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { VendorSignup, VendorProfileForm, ProductToggle } from '@/components/shop/VendorForms';
import { VendorOrderActions } from '@/components/shop/OrderActions';
import { ProductPhoto } from '@/components/shop/ProductCard';

export const metadata = { title: 'Espace vendeur' };

const tone = (s: string) => (['livree', 'terminee'].includes(s) ? 'ok' : ['refusee', 'annulee'].includes(s) ? 'no' : 'warn');

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { user, vendor } = await currentVendor();
  if (!user) redirect('/inscription?suite=/vendeur');
  const { v } = await searchParams;

  if (!vendor) {
    return (
      <>
        <header className="appbar">
          <Logo />
          <span style={{ flex: 1 }} />
        </header>
        <main className="narrow" style={{ padding: '24px 0 64px' }}>
          <VendorSignup defaultPhone={user.phone} />
        </main>
      </>
    );
  }

  const view = v === 'produits' || v === 'profil' ? v : 'commandes';
  const [orders, products] = await Promise.all([db.orders.byVendor(vendor.id), db.products.byVendor(vendor.id)]);
  const open = orders.filter((o) => !['refusee', 'annulee', 'terminee', 'livree'].includes(o.status));
  const tabs = [
    { id: 'commandes', label: 'Commandes', icon: 'box', badge: orders.filter((o) => o.status === 'en_attente').length },
    { id: 'produits', label: 'Produits', icon: 'bag' },
    { id: 'profil', label: 'Profil', icon: 'settings' },
  ];

  return (
    <div className="with-nav">
      <header className="appbar">
        <h1>
          {vendor.businessName}
          <span className="sub">Espace vendeur</span>
        </h1>
        {view === 'produits' && (
          <Link href="/vendeur/produit/nouveau" className="icon-btn orange" aria-label="Ajouter un produit">
            <Icon name="plus" size={26} stroke={2.2} />
          </Link>
        )}
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '16px 16px 40px' }} className="stack">
        {vendor.status === 'en_attente' && (
          <p className="alert info">
            Votre compte est en cours de vérification. Vous pouvez déjà ajouter vos produits : ils apparaîtront dans la boutique dès la validation,
            en général sous 24 h.
          </p>
        )}
        {vendor.status === 'suspendu' && <p className="alert err">Votre compte vendeur est suspendu. Contactez l’assistance.</p>}

        {view === 'commandes' && (
          <>
            <div className="figures">
              <div>
                <b>{orders.filter((o) => o.status === 'en_attente').length}</b>à confirmer
              </div>
              <div>
                <b>{open.length}</b>en cours
              </div>
              <div>
                <b>{fcfa(orders.filter((o) => ['livree', 'terminee'].includes(o.status)).reduce((n, o) => n + o.total, 0)).replace(' FCFA', '')}</b>FCFA livrés
              </div>
              <div>
                <b>{products.filter((p) => p.active).length}</b>produits en ligne
              </div>
            </div>
            {orders.length === 0 ? (
              <p className="muted" style={{ padding: '24px 0' }}>
                Pas encore de commande. Elles apparaîtront ici, et vous pourrez les accepter ou les refuser.
              </p>
            ) : (
              orders.map((o) => (
                <article key={o.id} className="panel stack" style={{ ['--gap' as string]: '10px' }}>
                  <div className="row between">
                    <div>
                      <b style={{ fontSize: 18 }}>{o.buyerName}</b>
                      <div className="tiny">
                        {o.reference}, reçue le {dateTime(o.createdAt)}
                      </div>
                    </div>
                    <span className={`pill ${tone(o.status)}`}>{ORDER_STATUS[o.status]}</span>
                  </div>
                  <div className="small">
                    {o.items.map((i) => (
                      <div key={i.productId} className="row between" style={{ padding: '3px 0', flexWrap: 'nowrap' }}>
                        <span>
                          {i.qty} × {i.name} <span className="muted">({i.unit})</span>
                        </span>
                        <span>{fcfa(i.qty * i.price)}</span>
                      </div>
                    ))}
                    <div className="row between" style={{ borderTop: '1px solid var(--trait)', paddingTop: 6, marginTop: 4, fontWeight: 700 }}>
                      <span>Total</span>
                      <span>{fcfa(o.total)}</span>
                    </div>
                  </div>
                  <p className="small">
                    <b>Pour le {longDate(o.neededOn).toLowerCase()}</b>
                    <br />
                    {o.delivery === 'livraison' ? `Livraison : ${o.address}` : 'Le client vient chercher'}
                    {o.note && (
                      <>
                        <br />
                        <span className="muted">« {o.note} »</span>
                      </>
                    )}
                  </p>
                  <div className="row">
                    <a className="btn quiet sm" href={`tel:+223${o.buyerPhone}`}>
                      Appeler {o.buyerPhone}
                    </a>
                    <a className="btn quiet sm" href={`https://wa.me/223${o.buyerPhone}?text=${encodeURIComponent(`Bonjour, c’est ${vendor.businessName} au sujet de votre commande ${o.reference}.`)}`} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </div>
                  <VendorOrderActions id={o.id} status={o.status} />
                </article>
              ))
            )}
          </>
        )}

        {view === 'produits' && (
          <>
            {products.length === 0 ? (
              <div className="empty stack">
                <h3>Ajoutez votre premier produit</h3>
                <p>Une photo, un prix et l’unité (le sac, le pack, la chaise par jour) suffisent.</p>
                <div>
                  <Link href="/vendeur/produit/nouveau" className="btn">
                    Ajouter un produit
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rows">
                {products.map((p) => (
                  <div key={p.id} style={{ cursor: 'default' }}>
                    <Link href={`/vendeur/produit/${p.id}`} style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flex: 'none', display: 'block' }}>
                      <ProductPhoto p={p} />
                    </Link>
                    <Link href={`/vendeur/produit/${p.id}`} className="grow" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <span className="name" style={{ display: 'block', fontSize: 16 }}>
                        {p.name}
                      </span>
                      <span className="meta">
                        {fcfa(p.price)} {p.unit}, {categoryName(p.category).toLowerCase()}
                        {p.stock > 0 ? `, ${p.stock} en stock` : ''}
                      </span>
                    </Link>
                    <ProductToggle id={p.id} active={p.active} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'profil' && <VendorProfileForm vendor={vendor} />}
      </main>

      <nav className="bottom-nav" style={{ ['--items' as string]: 3 }} aria-label="Navigation vendeur">
        {tabs.map((t) => (
          <Link key={t.id} href={`/vendeur?v=${t.id}`} aria-current={view === t.id ? 'page' : undefined}>
            <Icon name={t.icon} size={25} />
            <span>{t.label}</span>
            {!!t.badge && <span className="badge">{t.badge}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
