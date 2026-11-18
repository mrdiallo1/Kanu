'use client';

// Panier de la boutique, gardé sur le téléphone (localStorage).

import { useCallback, useEffect, useState } from 'react';

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  unit: string;
  mode: 'vente' | 'location';
  vendorId: string;
  vendorName: string;
  photo?: string;
  minQty: number;
  stock: number;
  qty: number;
}

const KEY = 'kanu-panier';
const EVENT = 'kanu-panier-change';

function readCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function writeCart(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* stockage plein ou indisponible */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setLines(readCart());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const add = useCallback((l: CartLine) => {
    const cur = readCart();
    const i = cur.findIndex((x) => x.productId === l.productId);
    if (i >= 0) cur[i] = { ...cur[i], ...l, qty: cur[i].qty + l.qty };
    else cur.push(l);
    writeCart(cur);
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    writeCart(readCart().map((x) => (x.productId === productId ? { ...x, qty } : x)));
  }, []);

  const remove = useCallback((productId: string) => writeCart(readCart().filter((x) => x.productId !== productId)), []);
  const clear = useCallback(() => writeCart([]), []);

  return {
    lines,
    ready,
    count: lines.reduce((n, l) => n + 1, 0),
    total: lines.reduce((n, l) => n + l.price * l.qty, 0),
    add,
    setQty,
    remove,
    clear,
  };
}
