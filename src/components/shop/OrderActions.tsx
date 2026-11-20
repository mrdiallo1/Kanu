'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { NEXT_STATUS, ORDER_STATUS } from '@/config/shop';

export function CancelOrder({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="btn danger sm"
      onClick={async () => {
        if (!confirm('Annuler cette commande ?')) return;
        const r = await api(`/api/boutique/commandes/${id}`, 'PATCH', { status: 'annulee' });
        if (r.ok) router.refresh();
        else alert(r.error);
      }}
    >
      Annuler
    </button>
  );
}

const ACTION: Record<string, string> = {
  acceptee: 'Accepter',
  refusee: 'Refuser',
  en_preparation: 'En préparation',
  en_livraison: 'Partie en livraison',
  livree: 'Livrée et payée',
  terminee: 'Terminer',
  annulee: 'Annuler',
};

/** Boutons de l'équipe Kanu pour faire avancer une commande. */
export function VendorOrderActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = NEXT_STATUS[status] || [];
  if (!next.length) return null;
  return (
    <div className="row">
      {next.map((s) => (
        <button
          key={s}
          className={`btn sm ${s === 'refusee' || s === 'annulee' ? 'danger' : ''}`}
          disabled={busy}
          onClick={async () => {
            let note: string | undefined;
            if (s === 'refusee' || s === 'annulee') {
              const n = prompt('Expliquez brièvement au client pourquoi (facultatif) :');
              if (n === null) return;
              note = n;
            }
            setBusy(true);
            const r = await api(`/api/boutique/commandes/${id}`, 'PATCH', { status: s, note });
            setBusy(false);
            if (r.ok) router.refresh();
            else alert(r.error);
          }}
          title={ORDER_STATUS[s]}
        >
          {ACTION[s]}
        </button>
      ))}
    </div>
  );
}
