'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import type { Agent } from '@/lib/types';

export function AgentManager({ eventId, agents, scanUrl }: { eventId: string; agents: Agent[]; scanUrl: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await api(`/api/espaces/${eventId}/agents`, 'POST', { name });
    if (!r.ok) return setError(r.error);
    setName('');
    setError('');
    router.refresh();
  }

  return (
    <div className="panel stack" style={{ ['--gap' as string]: '16px' }}>
      <h3>Agents à l’entrée</h3>
      <p className="muted small">
        Chaque agent ouvre la page de contrôle sur son téléphone et entre son code. Il voit seulement ce qu’il faut pour
        vérifier les invitations.
      </p>
      <form onSubmit={add} className="row">
        <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Nom de l’agent" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn sm">Ajouter</button>
      </form>
      {error && <p className="alert err small">{error}</p>}
      {agents.map((a) => {
        const text = `Bonjour ${a.name}, voici ton accès pour contrôler les entrées : ${scanUrl} Code : ${a.pin}`;
        return (
          <div key={a.id} className="row between" style={{ borderTop: '1px solid var(--trait)', paddingTop: 12 }}>
            <div>
              <b>{a.name}</b>
              <div className="small muted">
                Code <span style={{ fontWeight: 700, color: 'var(--encre)', letterSpacing: '0.08em' }}>{a.pin}</span>
              </div>
            </div>
            <div className="row">
              <a className="btn quiet sm" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                Envoyer l’accès
              </a>
              <button
                className="link-btn red"
                onClick={async () => {
                  await api(`/api/espaces/${eventId}/agents/${a.id}`, 'DELETE');
                  router.refresh();
                }}
              >
                Retirer
              </button>
            </div>
          </div>
        );
      })}
      <p className="small">
        Page de contrôle : <a href={scanUrl}>{scanUrl.replace(/^https?:\/\//, '')}</a>
      </p>
    </div>
  );
}
