'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CATEGORIES } from '@/config/shop';
import { productImage } from '@/lib/format';
import type { Product } from '@/lib/types';
import { Icon } from '../Icon';

const UNIT_HINTS = ['le sac de 50 kg', 'le pack de 6 bouteilles', 'la chaise par jour', 'la bâche par jour', 'le carton', 'la prestation'];

export function ProductForm({ product }: { product: Product | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<'vente' | 'location'>(product?.mode || 'vente');
  const [keep, setKeep] = useState<string[]>(product?.photos || []);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    fd.set('mode', mode);
    fd.delete('pick');
    files.forEach((f) => fd.append('photos', f));
    (product?.photos || []).filter((k) => !keep.includes(k)).forEach((k) => fd.append('removePhotos', k));
    const res = await fetch(product ? `/api/vendeur/produits/${product.id}` : '/api/vendeur/produits', { method: product ? 'PATCH' : 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(j.error || 'Enregistrement impossible.');
    router.push('/vendeur?v=produits');
    router.refresh();
  }

  const total = keep.length + files.length;

  return (
    <form onSubmit={save} className="stack" style={{ ['--gap' as string]: '18px' }}>
      <div>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Photos ({total}/5)</span>
        <div className="up-thumbs" style={{ marginTop: 8 }}>
          {keep.map((k) => (
            <div key={k}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImage(k)} alt="" />
              <RemoveBtn onClick={() => setKeep(keep.filter((x) => x !== k))} />
            </div>
          ))}
          {previews.map((u, i) => (
            <div key={u}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" />
              <RemoveBtn onClick={() => setFiles(files.filter((_, j) => j !== i))} />
            </div>
          ))}
          {total < 5 && (
            <div>
              <label style={{ width: '100%', height: '100%', border: '2px dashed var(--trait)', borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--encre-2)' }}>
                <Icon name="plus" />
                <input name="pick" type="file" accept="image/*" multiple className="sr" onChange={(e) => e.target.files && setFiles([...files, ...Array.from(e.target.files)].slice(0, 5 - keep.length))} />
              </label>
            </div>
          )}
        </div>
      </div>
      <label className="field">
        <span>Nom du produit</span>
        <input name="name" required defaultValue={product?.name} placeholder="Riz brisé parfumé" />
      </label>
      <label className="field">
        <span>Catégorie</span>
        <select name="category" defaultValue={product?.category || ''} required>
          <option value="" disabled>
            Choisir
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="segment" role="group" aria-label="Vente ou location" style={{ alignSelf: 'start' }}>
        <button type="button" aria-pressed={mode === 'vente'} onClick={() => setMode('vente')}>
          Vente
        </button>
        <button type="button" aria-pressed={mode === 'location'} onClick={() => setMode('location')}>
          Location
        </button>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>Prix en FCFA</span>
          <input name="price" inputMode="numeric" required defaultValue={product?.price} placeholder="27500" />
        </label>
        <label className="field">
          <span>Pour</span>
          <input name="unit" list="units" required defaultValue={product?.unit} placeholder={mode === 'location' ? 'la chaise par jour' : 'le sac de 50 kg'} />
          <datalist id="units">
            {UNIT_HINTS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>Quantité disponible</span>
          <input name="stock" inputMode="numeric" defaultValue={product?.stock ?? ''} placeholder="0 = sur demande" />
        </label>
        <label className="field">
          <span>Quantité minimum</span>
          <input name="minQty" inputMode="numeric" defaultValue={product?.minQty ?? 1} />
        </label>
      </div>
      <label className="field">
        <span>Description</span>
        <textarea name="description" defaultValue={product?.description} placeholder="Qualité, marque, état, ce qui est inclus…" />
      </label>
      <label className="field">
        <span>Livraison ou retrait</span>
        <input name="delivery" defaultValue={product?.delivery} placeholder="Livraison gratuite dans Bamako dès 10 sacs" />
      </label>
      {error && <p className="alert err">{error}</p>}
      <button className="btn block" disabled={busy}>
        {busy ? 'Enregistrement…' : product ? 'Enregistrer' : 'Mettre en vente'}
      </button>
      {product && (
        <button
          type="button"
          className="btn danger block"
          onClick={async () => {
            if (!confirm('Supprimer ce produit ?')) return;
            await fetch(`/api/vendeur/produits/${product.id}`, { method: 'DELETE' });
            router.push('/vendeur?v=produits');
            router.refresh();
          }}
        >
          Supprimer le produit
        </button>
      )}
    </form>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Retirer la photo"
      style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 99, border: 0, background: 'rgba(0,0,0,.55)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
    >
      <Icon name="close" size={14} stroke={2.6} />
    </button>
  );
}
