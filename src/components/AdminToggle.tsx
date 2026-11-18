'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export function AdminToggle({ id, suspended }: { id: string; suspended: boolean }) {
  const router = useRouter();
  return (
    <button
      className={`btn sm ${suspended ? 'quiet' : 'danger'}`}
      onClick={async () => {
        if (!suspended && !confirm('Suspendre cet espace ? Plus personne ne pourra y accéder.')) return;
        await api(`/api/admin/espaces/${id}`, 'PATCH', { status: suspended ? 'actif' : 'suspendu' });
        router.refresh();
      }}
    >
      {suspended ? 'Réactiver' : 'Suspendre'}
    </button>
  );
}

export function VendorStatus({ id, status }: { id: string; status: 'en_attente' | 'valide' | 'suspendu' }) {
  const router = useRouter();
  const set = async (s: string) => {
    await api(`/api/admin/vendeurs/${id}`, 'PATCH', { status: s });
    router.refresh();
  };
  if (status === 'en_attente')
    return (
      <button className="btn sm" onClick={() => set('valide')}>
        Valider
      </button>
    );
  return (
    <button className={`btn sm ${status === 'valide' ? 'danger' : 'quiet'}`} onClick={() => set(status === 'valide' ? 'suspendu' : 'valide')}>
      {status === 'valide' ? 'Suspendre' : 'Réactiver'}
    </button>
  );
}
