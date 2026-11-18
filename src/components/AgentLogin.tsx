'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';

export function AgentLogin({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      className="stack"
      style={{ ['--gap' as string]: '18px', maxWidth: 420, margin: '0 auto', width: '100%' }}
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await api(`/api/controle/${slug}/connexion`, 'POST', { pin });
        if (!r.ok) return setError(r.error);
        router.refresh();
      }}
    >
      <p style={{ opacity: 0.75 }}>{title}</p>
      <h1 style={{ fontSize: 44 }}>Contrôle des entrées</h1>
      <label className="field">
        <span>Votre code agent</span>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6 chiffres"
          required
          style={{ fontSize: 28, letterSpacing: '0.3em', fontWeight: 700, textAlign: 'center', background: 'rgba(255,255,255,.08)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}
        />
        <small style={{ color: 'rgba(255,255,255,.7)' }}>Les organisateurs vous l’ont envoyé.</small>
      </label>
      {error && <p className="alert err">{error}</p>}
      <button className="btn block">Commencer</button>
    </form>
  );
}
