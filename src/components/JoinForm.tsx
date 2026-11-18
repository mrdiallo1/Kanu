'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';

export function JoinForm({ slug, title, date }: { slug: string; title: string; date: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await api(`/api/e/${slug}/rejoindre`, 'POST', { code, name });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.replace(`/e/${slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={join} className="stack" style={{ ['--gap' as string]: '18px' }}>
      <div>
        <h1 style={{ fontSize: 34 }}>Vous êtes invité</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          {title}, {date.toLowerCase()}. Indiquez votre nom pour entrer : programme, photos de tous, discussions et livre d’or.
        </p>
      </div>
      <label className="field">
        <span>Votre nom</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" placeholder="Mariam Keïta" />
        <small>Il apparaîtra sous vos photos et vos messages.</small>
      </label>
      <label className="field">
        <span>Code d’invitation</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          autoCapitalize="characters"
          placeholder="K7M-4QP"
          style={{ letterSpacing: '0.1em', fontWeight: 650 }}
        />
        {!params.get('code') && <small>Il est écrit dans le message d’invitation.</small>}
      </label>
      {error && (
        <p className="alert err" role="alert">
          {error}
        </p>
      )}
      <button className="btn block" disabled={busy}>
        {busy ? 'Un instant…' : 'Entrer'}
      </button>
    </form>
  );
}
