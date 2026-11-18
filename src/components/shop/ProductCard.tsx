import Link from 'next/link';
import { fcfa, productImage } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductPhoto({ p, index = 0 }: { p: Pick<Product, 'photos' | 'name'>; index?: number }) {
  return p.photos[index] ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={productImage(p.photos[index])} alt={p.name} loading="lazy" />
  ) : (
    <div className={`noimg-tile t${[...p.name].reduce((n, c) => n + c.charCodeAt(0), 0) % 4}`}>{p.name}</div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link href={`/boutique/produit/${p.id}`} className="pcard">
      <div className="ph">
        <ProductPhoto p={p} />
        {p.mode === 'location' && <span className="tag">Location</span>}
      </div>
      <span className="nm">{p.name}</span>
      <span>
        <span className="pr">{fcfa(p.price)}</span>
        <span className="un"> {p.unit}</span>
      </span>
    </Link>
  );
}
