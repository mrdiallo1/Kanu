import Link from 'next/link';
import * as db from '@/lib/db';
import { CATEGORIES, categoryName } from '@/config/shop';
import { ShopBar } from '@/components/shop/ShopBar';
import { ProductCard } from '@/components/shop/ProductCard';

export const metadata = { title: 'Boutique' };

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const { c, q } = await searchParams;
  const category = CATEGORIES.some((x) => x.id === c) ? c : undefined;
  const list = await db.products.catalog({ category, q });
  const hint = CATEGORIES.find((x) => x.id === category)?.hint;

  return (
    <>
      <ShopBar title="Boutique" back="/tableau" sub="Tout pour la fête, livré chez vous" />
      <form className="shop-search" action="/boutique" role="search">
        {category && <input type="hidden" name="c" value={category} />}
        <input name="q" type="search" defaultValue={q} placeholder="Riz, chaises, eau, bâche…" aria-label="Rechercher un produit" />
      </form>
      <nav className="cat-scroll" aria-label="Catégories">
        <Link href="/boutique" aria-current={!category ? 'page' : undefined}>
          Tout
        </Link>
        {CATEGORIES.map((x) => (
          <Link key={x.id} href={`/boutique?c=${x.id}`} aria-current={category === x.id ? 'page' : undefined}>
            {x.name}
          </Link>
        ))}
      </nav>

      <main style={{ maxWidth: 1180, margin: '0 auto' }}>
        {(category || q) && (
          <p className="small muted" style={{ padding: '8px 16px 0' }}>
            {list.length} résultat{list.length > 1 ? 's' : ''}
            {category ? ` dans ${categoryName(category)}` : ''}
            {q ? ` pour « ${q} »` : ''}. {hint}
          </p>
        )}
        {list.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }} className="stack">
            <h3 style={{ fontSize: 24 }}>Rien pour l’instant</h3>
            <p className="muted">
              {q ? 'Essayez un autre mot, ou une autre catégorie.' : 'Les vendeurs ajoutent leurs produits au fur et à mesure. Revenez bientôt.'}
            </p>
          </div>
        ) : (
          <div className="shop-grid">
            {list.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
        <div style={{ padding: '24px 16px 56px' }}>
          <div className="panel sand row between">
            <div>
              <b>Vous êtes commerçant ou prestataire ?</b>
              <p className="small muted">Vendez ou louez vos produits aux familles qui préparent leur fête.</p>
            </div>
            <Link href="/vendeur" className="btn ghost sm">
              Vendre sur la boutique
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
