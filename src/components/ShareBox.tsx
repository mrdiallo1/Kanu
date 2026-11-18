'use client';

import { useState } from 'react';
import { copy } from '@/lib/client';

export function ShareBox({ link, message, light = true }: { link: string; message: string; light?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="row">
      <a className={`btn sm ${light ? 'white' : ''}`} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
        Envoyer sur WhatsApp
      </a>
      <button
        type="button"
        className={`btn sm ${light ? 'ghost' : 'quiet'}`}
        style={light ? { color: 'inherit', borderColor: 'currentColor' } : undefined}
        onClick={async () => {
          if (await copy(link)) {
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }
        }}
      >
        {done ? 'Lien copié' : 'Copier le lien'}
      </button>
    </div>
  );
}
