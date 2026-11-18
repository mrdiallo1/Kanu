'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import type { Zone } from '@/lib/types';

export function ZoneEditor({ eventId, zones, multi }: { eventId: string; zones: Zone[]; multi: boolean }) {
  const router = useRouter();
  const [list, setList] = useState(zones);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const upd = (i: number, p: Partial<Zone>) => setList(list.map((z, j) => (j === i ? { ...z, ...p } : z)));

  async function save() {
    const r = await api(`/api/espaces/${eventId}`, 'PATCH', { zones: list });
    if (!r.ok) {
      setMsg('');
      return setError(r.error);
    }
    setError('');
    setMsg('Accès enregistrés.');
    router.refresh();
  }

  return (
    <div className="panel stack" style={{ ['--gap' as string]: '16px' }}>
      <h3>Espaces contrôlés</h3>
      {list.map((z, i) => (
        <div key={z.id} className="stack" style={{ ['--gap' as string]: '8px', borderTop: i ? '1px solid var(--trait)' : 0, paddingTop: i ? 14 : 0 }}>
          <div className="row">
            <input className="input" style={{ flex: 1 }} value={z.name} aria-label="Nom de l’espace" onChange={(e) => upd(i, { name: e.target.value })} />
            {list.length > 1 && (
              <button className="link-btn red" onClick={() => setList(list.filter((_, j) => j !== i))}>
                Retirer
              </button>
            )}
          </div>
          <label className="check small">
            <input type="checkbox" checked={z.singleEntry} onChange={(e) => upd(i, { singleEntry: e.target.checked })} />
            <span>Une seule entrée par invitation</span>
          </label>
          <label className="check small">
            <input type="checkbox" checked={z.openToAll} onChange={(e) => upd(i, { openToAll: e.target.checked })} />
            <span>Accordé à ceux qui rejoignent avec le code général</span>
          </label>
        </div>
      ))}
      <div className="row">
        {(multi || list.length < 2) && (
          <button className="btn quiet sm" onClick={() => setList([...list, { id: '', name: '', singleEntry: true, openToAll: false }])}>
            Ajouter un espace
          </button>
        )}
        <button className="btn sm" onClick={save}>
          Enregistrer
        </button>
      </div>
      {!multi && <p className="tiny">Plus de deux espaces (par exemple une salle VIP) avec l’offre Prestige.</p>}
      {msg && <p className="alert ok small">{msg}</p>}
      {error && <p className="alert err small">{error}</p>}
    </div>
  );
}
