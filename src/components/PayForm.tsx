'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const METHODS = [
  { id: 'orange', label: 'Orange Money' },
  { id: 'moov', label: 'Moov Money' },
  { id: 'wave', label: 'Wave' },
  { id: 'carte', label: 'Carte bancaire' },
];

export function PayForm({ eventId, amount, simulation }: { eventId: string; amount: string; simulation: boolean }) {
  const router = useRouter();
  const [method, setMethod] = useState('orange');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/paiements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, method, phone }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(json.error || 'Le paiement n’a pas abouti.');
    }
    if (json.redirectUrl) {
      window.location.href = json.redirectUrl;
      return;
    }
    router.push(`/tableau/${eventId}?bienvenue=1`);
    router.refresh();
  }

  return (
    <form onSubmit={pay} className="stack" style={{ ['--gap' as string]: '20px' }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 12 }}>Moyen de paiement</legend>
        <div className="choice-grid">
          {METHODS.map((m) => (
            <button type="button" key={m.id} className="choice" aria-pressed={method === m.id} onClick={() => setMethod(m.id)}>
              <span style={{ fontWeight: 650, fontSize: 18 }}>{m.label}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {method !== 'carte' && (
        <label className="field">
          <span>Numéro qui va payer</span>
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="76 12 34 56" required />
          <small>Vous recevrez une demande de confirmation sur ce téléphone.</small>
        </label>
      )}
      {simulation && (
        <p className="alert info small">
          Mode test : aucun argent n’est prélevé, le paiement est validé tout de suite.
        </p>
      )}
      {error && (
        <p className="alert err" role="alert">
          {error}
        </p>
      )}
      <button className="btn block" disabled={busy}>
        {busy ? 'Paiement en cours…' : `Payer ${amount}`}
      </button>
    </form>
  );
}
