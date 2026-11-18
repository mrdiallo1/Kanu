'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';

export function EnterButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await api<{ slug: string }>(`/api/invitation/${token}`, 'POST', {});
          if (!r.ok) {
            setBusy(false);
            return setError(r.error);
          }
          router.push(`/e/${r.data.slug}`);
        }}
      >
        {busy ? 'Ouverture…' : 'Entrer dans l’espace'}
      </button>
      {error && <p className="alert err small">{error}</p>}
    </>
  );
}
