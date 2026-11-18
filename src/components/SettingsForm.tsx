'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import type { EventSpace } from '@/lib/types';
import { ProgramEditor } from './ProgramEditor';

export function SettingsForm({ event }: { event: EventSpace }) {
  const router = useRouter();
  const [f, setF] = useState({
    hostA: event.hostA,
    hostB: event.hostB,
    babyName: event.babyName || '',
    date: event.date,
    time: event.time,
    ceremonyPlace: event.ceremonyPlace,
    receptionPlace: event.receptionPlace,
    program: event.program,
    welcome: event.welcome,
    story: event.story,
    settings: event.settings,
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [cover, setCover] = useState('');
  const bapteme = event.type === 'bapteme';
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  async function save(e?: React.FormEvent, extra?: Record<string, unknown>, done = 'Modifications enregistrées.') {
    e?.preventDefault();
    const r = await api(`/api/espaces/${event.id}`, 'PATCH', extra ?? f);
    if (!r.ok) {
      setMsg('');
      return setError(r.error);
    }
    setError('');
    setMsg(done);
    router.refresh();
  }

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    setCover('Envoi de la photo…');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/espaces/${event.id}/couverture`, { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    setCover(res.ok ? 'Photo de couverture mise à jour.' : json.error || 'Échec de l’envoi.');
    router.refresh();
  }

  return (
    <div className="cols" style={{ ['--n' as string]: 2, alignItems: 'start' }}>
      <form onSubmit={save} className="stack" style={{ ['--gap' as string]: '18px' }}>
        <h2 style={{ fontSize: 32 }}>Informations</h2>
        {bapteme && (
          <label className="field">
            <span>Prénom de l’enfant</span>
            <input value={f.babyName} onChange={(e) => set({ babyName: e.target.value })} />
          </label>
        )}
        <div className="grid-2">
          <label className="field">
            <span>{bapteme ? 'Le père' : 'La mariée'}</span>
            <input value={f.hostA} onChange={(e) => set({ hostA: e.target.value })} />
          </label>
          <label className="field">
            <span>{bapteme ? 'La mère' : 'Le marié'}</span>
            <input value={f.hostB} onChange={(e) => set({ hostB: e.target.value })} />
          </label>
        </div>
        <div className="grid-2">
          <label className="field">
            <span>Date</span>
            <input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label className="field">
            <span>Heure</span>
            <input type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>{bapteme ? 'Lieu du baptême' : 'Lieu de la cérémonie'}</span>
          <input value={f.ceremonyPlace} onChange={(e) => set({ ceremonyPlace: e.target.value })} />
        </label>
        <label className="field">
          <span>{bapteme ? 'Lieu du repas' : 'Lieu du dîner ou de la réception'}</span>
          <input value={f.receptionPlace} onChange={(e) => set({ receptionPlace: e.target.value })} />
        </label>
        <ProgramEditor value={f.program} onChange={(program) => set({ program })} />
        <label className="field">
          <span>Message de bienvenue</span>
          <textarea value={f.welcome} onChange={(e) => set({ welcome: e.target.value })} />
        </label>
        <label className="field">
          <span>{bapteme ? 'Quelques mots sur la famille' : 'Votre histoire'}</span>
          <textarea value={f.story} onChange={(e) => set({ story: e.target.value })} />
        </label>
        {msg && <p className="alert ok small">{msg}</p>}
        {error && <p className="alert err small">{error}</p>}
        <div>
          <button className="btn">Enregistrer</button>
        </div>
      </form>

      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <div className="panel stack" style={{ ['--gap' as string]: '12px' }}>
          <h3>Photo de couverture</h3>
          <p className="muted small">Elle s’affiche en grand en haut de l’espace et sur les invitations.</p>
          {event.coverMediaId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/medias/${event.coverMediaId}`} alt="Couverture actuelle" style={{ borderRadius: 14, maxHeight: 220, objectFit: 'cover', width: '100%' }} />
          )}
          <div>
            <input id="cover" type="file" accept="image/*" className="sr" onChange={(e) => uploadCover(e.target.files?.[0])} />
            <label htmlFor="cover" className="btn ghost sm">
              {event.coverMediaId ? 'Changer la photo' : 'Ajouter une photo'}
            </label>
          </div>
          {cover && <p className="small muted">{cover}</p>}
        </div>

        <div className="panel stack" style={{ ['--gap' as string]: '12px' }}>
          <h3>Publications des invités</h3>
          <label className="check">
            <input
              type="checkbox"
              checked={f.settings.guestsCanPost}
              onChange={(e) => {
                const settings = { ...f.settings, guestsCanPost: e.target.checked };
                set({ settings });
                save(undefined, { settings });
              }}
            />
            <span>Les invités peuvent publier des photos et vidéos</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={f.settings.guestsCanDeleteOwn}
              onChange={(e) => {
                const settings = { ...f.settings, guestsCanDeleteOwn: e.target.checked };
                set({ settings });
                save(undefined, { settings });
              }}
            />
            <span>Un invité peut supprimer ses propres publications</span>
          </label>
          {event.status === 'actif' || event.status === 'ferme' ? (
            <div>
              <button
                className="btn quiet sm"
                onClick={() =>
                  save(
                    undefined,
                    { status: event.status === 'actif' ? 'ferme' : 'actif' },
                    event.status === 'actif' ? 'Publications fermées.' : 'Publications rouvertes.',
                  )
                }
              >
                {event.status === 'actif' ? 'Fermer les publications' : 'Rouvrir les publications'}
              </button>
            </div>
          ) : null}
        </div>

        <div className="panel stack" style={{ ['--gap' as string]: '12px' }}>
          <h3>Code d’invitation</h3>
          <p className="muted small">
            Code actuel : <b style={{ color: 'var(--encre)', letterSpacing: '0.06em' }}>{event.code}</b>. Si le lien a été partagé au-delà de vos
            invités, créez un nouveau code. Ceux qui ont déjà rejoint gardent leur accès.
          </p>
          <div>
            <button
              className="btn danger sm"
              onClick={() => confirm('Créer un nouveau code ? L’ancien ne fonctionnera plus.') && save(undefined, { newCode: true }, 'Nouveau code créé.')}
            >
              Créer un nouveau code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
