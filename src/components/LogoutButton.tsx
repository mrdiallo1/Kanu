'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="link-btn"
      style={{ color: 'var(--encre)', textDecoration: 'none' }}
      onClick={async () => {
        await fetch('/api/auth/deconnexion', { method: 'POST' });
        router.push('/');
        router.refresh();
      }}
    >
      Se déconnecter
    </button>
  );
}
