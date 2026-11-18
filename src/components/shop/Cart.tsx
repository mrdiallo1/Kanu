'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useCart } from '@/lib/cart';
import { api } from '@/lib/client';
import { fcfa, productImage } from '@/lib/format';
import { Stepper } from './Stepper';

interface Ev {
  id: string;
  title: string;
  date: string;
  place: string;
}

export function Cart({ user, events }: { user: { name: string; phone: string } | null; events: Ev[] }) {
  const router = useRouter();
  const cart = useCart();
  const [step, setStep] = useState<'panier' | 'commande'>('panier');
  const [eventId, setEventId] = useState(events[0]?.id || '');
  const ev = events.find((e) => e.id === eventId);
  const [delivery, setDelivery] = useState<'livraison' | 'retrait'>('livraison');
  const [address, setAddress] = useState(ev?.place || '');
  const [neededOn, setNeededOn] = useState(ev?.date || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const byVendor = useMemo(() => {
    const m = new Map<string, { name: string; lines: typeof cart.lines }>();
    for (const l of cart.lines) {
      const v = m.get(l.vendorId) || { name: l.vendorName, lines: [] };
      v.lines.push(l);
      m.set(l.vendorId, v);
    }
    return [...m.values()];
  }, [cart.lines]);

  if (!cart.ready) return null;

  if (cart.lines.length === 0) {
    return (
      <main style={{ padding: '56px 24px', textAlign: 'center' }} className="stack">
        <h2 style={{ fontSize: 28 }}>Votre panier est vide</h2>
        <p className="muted">Eau, riz, chaises, bâches : tout ce qu’il faut pour la fête est dans la boutique.</p>
        <div>
          <Link href="/boutique" className="btn">
            Parcourir la boutique
          </Link>
        </div>
      </main>
    );
  }

  async function order(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await api<{ references: string[] }>('/api/boutique/commandes', 'POST', {
      items: cart.lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      delivery,
      address,
      neededOn,
      phone,
      note,
      eventId: eventId || undefined,
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    cart.clear();
    router.push(`/boutique/commandes?ok=${r.data.references.length}`);
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '8px 16px calc(120px + env(safe-area-inset-bottom))' }}>
      {step === 'panier' ? (
        <>
          {byVendor.map((v) => (
            <section key={v.name} style={{ marginTop: 18 }}>
              <p className="small muted" style={{ marginBottom: 6 }}>
                Vendu par <b style={{ color: 'var(--encre)' }}>{v.name}</b>
              </p>
              <div className="rows">
                {v.lines.map((l) => (
                  <div key={l.productId} style={{ alignItems: 'flex-start', cursor: 'default' }}>
                    <Link href={`/boutique/produit/${l.productId}`} style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flex: 'none', background: 'var(--sable)' }}>
                      {l.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={productImage(l.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="noimg-tile" style={{ fontSize: 12 }}>
                          {l.name}
                        </div>
                      )}
                    </Link>
                    <span className="grow" style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontWeight: 650, lineHeight: 1.25 }}>{l.name}</span>
                      <span className="small muted">
                        {fcfa(l.price)} {l.unit}
                        {l.mode === 'location' ? ', location' : ''}
                      </span>
                      <span className="row between">
                        <Stepper small value={l.qty} min={l.minQty} max={l.stock > 0 ? l.stock : 99999} onChange={(q) => cart.setQty(l.productId, q)} />
                        <b>{fcfa(l.price * l.qty)}</b>
                      </span>
                      <button className="link-btn red small" style={{ justifySelf: 'start', textAlign: 'left' }} onClick={() => cart.remove(l.productId)}>
                        Retirer
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {byVendor.length > 1 && (
            <p className="tiny" style={{ marginTop: 16 }}>
              Votre panier contient des produits de {byVendor.length} vendeurs : chacun recevra sa propre commande.
            </p>
          )}
          <div className="buybar">
            <div style={{ flex: 'none' }}>
              <div className="tiny">Total</div>
              <b style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em' }}>{fcfa(cart.total)}</b>
            </div>
            {user ? (
              <button className="btn" onClick={() => setStep('commande')}>
                Commander
              </button>
            ) : (
              <Link className="btn" href="/connexion?suite=/boutique/panier">
                Se connecter pour commander
              </Link>
            )}
          </div>
        </>
      ) : (
        <form onSubmit={order} className="stack" style={{ ['--gap' as string]: '18px', marginTop: 16 }}>
          <button type="button" className="text-btn" style={{ justifySelf: 'start', padding: 0 }} onClick={() => setStep('panier')}>
            Revenir au panier
          </button>
          <h2 style={{ fontSize: 30 }}>Livraison</h2>
          {events.length > 0 && (
            <label className="field">
              <span>Pour quelle fête ?</span>
              <select
                value={eventId}
                onChange={(e) => {
                  setEventId(e.target.value);
                  const x = events.find((y) => y.id === e.target.value);
                  if (x) {
                    setNeededOn(x.date);
                    if (!address) setAddress(x.place);
                  }
                }}
              >
                {events.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
                <option value="">Une autre occasion</option>
              </select>
            </label>
          )}
          <div className="segment" role="group" aria-label="Mode de réception" style={{ alignSelf: 'start' }}>
            <button type="button" aria-pressed={delivery === 'livraison'} onClick={() => setDelivery('livraison')}>
              Livraison
            </button>
            <button type="button" aria-pressed={delivery === 'retrait'} onClick={() => setDelivery('retrait')}>
              Je viens chercher
            </button>
          </div>
          {delivery === 'livraison' && (
            <label className="field">
              <span>Adresse de livraison</span>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} required style={{ minHeight: 80 }} placeholder="Quartier, rue, repère (ex. derrière la mosquée de Badalabougou)" />
            </label>
          )}
          <label className="field">
            <span>Date à laquelle il vous le faut</span>
            <input type="date" value={neededOn} onChange={(e) => setNeededOn(e.target.value)} required />
          </label>
          <label className="field">
            <span>Téléphone pour le vendeur</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label className="field">
            <span>Précisions (facultatif)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Livrer avant 10 h, appeler en arrivant…" />
          </label>
          <div className="panel sand small">
            Vous ne payez rien maintenant. Le vendeur confirme la disponibilité, puis vous réglez à la livraison ou au retrait, en espèces ou par
            mobile money.
          </div>
          {error && <p className="alert err">{error}</p>}
          <div className="buybar">
            <div style={{ flex: 'none' }}>
              <div className="tiny">Total</div>
              <b style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em' }}>{fcfa(cart.total)}</b>
            </div>
            <button className="btn" disabled={busy}>
              {busy ? 'Envoi…' : 'Envoyer la commande'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
