'use client';

import { useState } from 'react';
import { api } from '@/lib/client';

export function Rsvp({ token, current }: { token: string; current: 'attente' | 'oui' | 'non' }) {
  const [v, setV] = useState(current);
  const answer = async (rsvp: 'oui' | 'non') => {
    const r = await api(`/api/invitation/${token}`, 'POST', { rsvp });
    if (r.ok) setV(rsvp);
  };
  return (
    <div className="panel sand stack" style={{ ['--gap' as string]: '12px' }}>
      <b style={{ fontSize: 19 }}>
        {v === 'oui' ? 'Vous avez répondu présent.' : v === 'non' ? 'Vous avez indiqué ne pas pouvoir venir.' : 'Serez-vous présent ?'}
      </b>
      <div className="row">
        <button className={`btn sm${v === 'oui' ? '' : ' ghost'}`} onClick={() => answer('oui')}>
          Je serai là
        </button>
        <button className={`btn sm${v === 'non' ? '' : ' ghost'}`} onClick={() => answer('non')}>
          Je ne pourrai pas venir
        </button>
      </div>
    </div>
  );
}
