'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { Icon } from '../Icon';

/** Barre du haut de la boutique : retour, titre, panier. */
export function ShopBar({ title, back, sub }: { title: string; back?: string | true; sub?: string }) {
  const router = useRouter();
  const { count, ready } = useCart();
  return (
    <header className="appbar" style={{ paddingLeft: back ? 4 : 16 }}>
      {back &&
        (back === true ? (
          <button className="icon-btn" onClick={() => router.back()} aria-label="Retour">
            <Icon name="back" />
          </button>
        ) : (
          <Link className="icon-btn" href={back} aria-label="Retour">
            <Icon name="back" />
          </Link>
        ))}
      <h1>
        {title}
        {sub && <span className="sub">{sub}</span>}
      </h1>
      <Link href="/boutique/commandes" className="icon-btn" aria-label="Mes commandes">
        <Icon name="box" />
      </Link>
      <Link href="/boutique/panier" className="icon-btn" aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`} style={{ position: 'relative' }}>
        <Icon name="cart" />
        {ready && count > 0 && (
          <span className="badge" style={{ position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, fontSize: 11 }}>
            {count}
          </span>
        )}
      </Link>
    </header>
  );
}
