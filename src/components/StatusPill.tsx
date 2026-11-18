import { daysLeft } from '@/lib/access';
import type { EventSpace } from '@/lib/types';

export function StatusPill({ event }: { event: EventSpace }) {
  if (event.status === 'brouillon') return <span className="pill warn">En attente de paiement</span>;
  if (event.status === 'suspendu') return <span className="pill no">Suspendu</span>;
  const d = daysLeft(event);
  if (d <= 0) return <span className="pill no">Expiré</span>;
  if (event.status === 'ferme') return <span className="pill">Publications fermées</span>;
  return <span className="pill ok">Ouvert</span>;
}
