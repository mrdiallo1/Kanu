'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import type { Vendor } from '@/lib/types';

export function VendorSignup({ defaultPhone }: { defaultPhone: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  return (
    <form
      className="stack"
      style={{ ['--gap' as string]: '18px' }}
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await api('/api/vendeur', 'POST', Object.fromEntries(new FormData(e.currentTarget)));
        if (!r.ok) return setError(r.error);
        router.refresh();
      }}
    >
      <div>
        <h1 style={{ fontSize: 36 }}>Vendre sur la boutique</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Les familles qui préparent un mariage ou un baptême commandent directement chez vous. Vous recevez la commande, vous confirmez,
          vous livrez et le client vous paie.
        </p>
      </div>
      <label className="field">
        <span>Nom du commerce</span>
        <input name="businessName" required placeholder="Diarra Location" />
      </label>
      <label className="field">
        <span>Téléphone des commandes</span>
        <input name="phone" type="tel" required defaultValue={defaultPhone} />
      </label>
      <label className="field">
        <span>Ville</span>
        <input name="city" defaultValue="Bamako" />
      </label>
      <label className="field">
        <span>Ce que vous proposez</span>
        <textarea name="description" placeholder="Location de chaises, tables et bâches. Livraison dans tout Bamako." />
      </label>
      {error && <p className="alert err">{error}</p>}
      <button className="btn block">Envoyer ma demande</button>
    </form>
  );
}

export function VendorProfileForm({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  return (
    <form
      className="stack"
      style={{ ['--gap' as string]: '18px' }}
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await api('/api/vendeur', 'PATCH', Object.fromEntries(new FormData(e.currentTarget)));
        setMsg(r.ok ? 'Profil enregistré.' : r.error);
        router.refresh();
      }}
    >
      <label className="field">
        <span>Nom du commerce</span>
        <input name="businessName" defaultValue={vendor.businessName} />
      </label>
      <label className="field">
        <span>Téléphone des commandes</span>
        <input name="phone" type="tel" defaultValue={vendor.phone} />
      </label>
      <label className="field">
        <span>Ville</span>
        <input name="city" defaultValue={vendor.city} />
      </label>
      <label className="field">
        <span>Présentation</span>
        <textarea name="description" defaultValue={vendor.description} />
      </label>
      {msg && <p className="alert ok small">{msg}</p>}
      <button className="btn block">Enregistrer</button>
    </form>
  );
}

export function ProductToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  return (
    <button
      className={`pill ${active ? 'ok' : ''}`}
      style={{ border: 0, cursor: 'pointer' }}
      onClick={async () => {
        const fd = new FormData();
        fd.append('toggle', '1');
        await fetch(`/api/vendeur/produits/${id}`, { method: 'PATCH', body: fd });
        router.refresh();
      }}
      aria-label={active ? 'Masquer le produit' : 'Remettre en vente'}
    >
      {active ? 'En ligne' : 'Masqué'}
    </button>
  );
}
