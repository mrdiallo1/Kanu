import { notFound } from 'next/navigation';
import * as db from '@/lib/db';
import { fcfa, productImage } from '@/lib/format';
import { categoryName } from '@/config/shop';
import { ShopBar } from '@/components/shop/ShopBar';
import { ProductPhoto } from '@/components/shop/ProductCard';
import { AddToCart } from '@/components/shop/AddToCart';
import { SHOP_VENDOR_ID } from '@/lib/shop';
import { site } from '@/config/site';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.products.byId(id);
  const vendor = p ? await db.vendors.byId(p.vendorId) : null;
  if (!p || !vendor || vendor.status !== 'valide' || !p.active || p.vendorId !== SHOP_VENDOR_ID) notFound();

  return (
    <>
      <ShopBar title={categoryName(p.category)} back={`/boutique?c=${p.category}`} />
      <main style={{ maxWidth: 980, margin: '0 auto', paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>
        <div className="cols" style={{ ['--n' as string]: 2, gap: 0 }}>
          <div className="gallery-strip" aria-label="Photos du produit">
            {p.photos.length ? (
              p.photos.map((k, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={k} src={productImage(k)} alt={`${p.name}, photo ${i + 1}`} />
              ))
            ) : (
              <div>
                <ProductPhoto p={p} />
              </div>
            )}
          </div>
          <div className="stack" style={{ ['--gap' as string]: '16px', padding: '20px 16px' }}>
            {p.photos.length > 1 && <p className="tiny">Faites glisser pour voir les {p.photos.length} photos.</p>}
            <div>
              {p.mode === 'location' && <span className="pill warn" style={{ marginBottom: 8 }}>Location</span>}
              <h1 style={{ fontSize: 30, lineHeight: 1.1 }}>{p.name}</h1>
              <p style={{ marginTop: 10 }}>
                <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.03em' }}>{fcfa(p.price)}</span>
                <span className="muted"> {p.unit}</span>
              </p>
              <p className="small muted" style={{ marginTop: 4 }}>
                {p.stock > 0 ? `${p.stock} disponibles` : 'Disponible sur demande'}
                {p.minQty > 1 ? `, minimum ${p.minQty}` : ''}
              </p>
            </div>
            {p.description && <p style={{ whiteSpace: 'pre-wrap' }}>{p.description}</p>}
            {p.delivery && (
              <div className="panel sand">
                <b className="small">Livraison ou retrait</b>
                <p className="small" style={{ marginTop: 4 }}>
                  {p.delivery}
                </p>
              </div>
            )}
            <div className="rows">
              <div style={{ cursor: 'default' }}>
                <span className="avatar sm" style={{ background: 'var(--orange)' }}>{site.name[0]}</span>
                <span className="grow">
                  <span className="name" style={{ display: 'block', fontSize: 16 }}>
                    Vendu et livré par {site.name}
                  </span>
                  <span className="meta">Paiement à la livraison, en espèces ou par mobile money.</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <AddToCart
        line={{
          productId: p.id,
          name: p.name,
          price: p.price,
          unit: p.unit,
          mode: p.mode,
          vendorId: vendor.id,
          vendorName: vendor.businessName,
          photo: p.photos[0],
          minQty: p.minQty,
          stock: p.stock,
        }}
      />
    </>
  );
}
