'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart, type CartLine } from '@/lib/cart';
import { Stepper } from './Stepper';

export function AddToCart({ line }: { line: Omit<CartLine, 'qty'> }) {
  const { add, lines } = useCart();
  const [qty, setQty] = useState(line.minQty);
  const [added, setAdded] = useState(false);
  const inCart = lines.find((l) => l.productId === line.productId);
  const max = line.stock > 0 ? line.stock : 99999;

  return (
    <div className="buybar">
      <Stepper value={qty} min={line.minQty} max={max} onChange={setQty} />
      {added ? (
        <Link href="/boutique/panier" className="btn">
          Voir le panier
        </Link>
      ) : (
        <button
          className="btn"
          onClick={() => {
            add({ ...line, qty });
            setAdded(true);
          }}
        >
          {inCart ? 'Ajouter encore' : 'Ajouter au panier'}
        </button>
      )}
    </div>
  );
}
