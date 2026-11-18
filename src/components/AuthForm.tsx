'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AuthForm({ mode, next }: { mode: 'connexion' | 'inscription'; next: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'inscription';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || 'Une erreur est survenue. Réessayez.');
    router.push(next);
    router.refresh();
  }

  const q = next !== '/tableau' ? `?suite=${encodeURIComponent(next)}` : '';
  return (
    <form onSubmit={submit} className="stack" style={{ ['--gap' as string]: '18px' }}>
      <div>
        <h1>{signup ? 'Créer un compte' : 'Se connecter'}</h1>
        <p className="muted">
          {signup
            ? 'Votre compte sert à gérer vos espaces. Vos invités, eux, n’en ont pas besoin.'
            : 'Avec le numéro utilisé à l’inscription.'}
        </p>
      </div>
      {signup && (
        <label className="field">
          <span>Votre nom</span>
          <input name="name" autoComplete="name" required minLength={2} placeholder="Awa Traoré" />
        </label>
      )}
      <label className="field">
        <span>Numéro de téléphone</span>
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="76 12 34 56" />
      </label>
      <label className="field">
        <span>Mot de passe</span>
        <input
          name="password"
          type="password"
          autoComplete={signup ? 'new-password' : 'current-password'}
          required
          minLength={6}
        />
        {signup && <small>Au moins 6 caractères.</small>}
      </label>
      {error && (
        <p className="alert err" role="alert">
          {error}
        </p>
      )}
      <button className="btn block" disabled={busy}>
        {busy ? 'Un instant…' : signup ? 'Créer mon compte' : 'Se connecter'}
      </button>
      <p className="small muted">
        {signup ? (
          <>
            Déjà un compte ? <Link href={`/connexion${q}`}>Se connecter</Link>
          </>
        ) : (
          <>
            Pas encore de compte ? <Link href={`/inscription${q}`}>Créer un compte</Link>
          </>
        )}
      </p>
    </form>
  );
}
