'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { AudioPlayer } from './AudioPlayer';
import { VoiceRecorder } from './VoiceRecorder';

export interface BookEntry {
  id: string;
  authorName: string;
  text?: string;
  audioMediaId?: string;
  createdAt: string;
  deletable: boolean;
}

export function Guestbook(props: {
  slug: string;
  entries: BookEntry[];
  canWrite: boolean;
  voice: boolean;
  maxVoiceSeconds: number;
  defaultName: string;
  hostsLabel: string;
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [name, setName] = useState(props.defaultName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'ecrit' | 'vocal'>('ecrit');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await api(`/api/e/${props.slug}/livre-or`, 'POST', { text, authorName: name });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setText('');
    setError('');
    router.refresh();
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '40px' }}>
      {props.canWrite && (
        <div className="panel sand stack" style={{ ['--gap' as string]: '16px' }}>
          <h3>Un mot pour {props.hostsLabel}</h3>
          {props.voice && (
            <div className="filters">
              <button className="chip" aria-pressed={mode === 'ecrit'} onClick={() => setMode('ecrit')}>
                Message écrit
              </button>
              <button className="chip" aria-pressed={mode === 'vocal'} onClick={() => setMode('vocal')}>
                Message vocal
              </button>
            </div>
          )}
          {mode === 'ecrit' ? (
            <form onSubmit={send} className="stack" style={{ ['--gap' as string]: '14px' }}>
              <label className="field">
                <span>Votre message</span>
                <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} required placeholder="Vos vœux, vos félicitations, un souvenir…" />
              </label>
              <label className="field">
                <span>Signé</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </label>
              {error && <p className="alert err small">{error}</p>}
              <div>
                <button className="btn" disabled={busy}>
                  {busy ? 'Publication…' : 'Publier mon message'}
                </button>
              </div>
            </form>
          ) : (
            <VoiceRecorder slug={props.slug} maxSeconds={props.maxVoiceSeconds} onDone={() => router.refresh()} />
          )}
        </div>
      )}

      {props.entries.length === 0 ? (
        <p className="muted">Aucun message pour l’instant. Soyez le premier à écrire.</p>
      ) : (
        <div className="book">
          {props.entries.map((m) => (
            <article key={m.id}>
              {m.text && <p className="t">{m.text}</p>}
              {m.audioMediaId && <AudioPlayer src={`/api/medias/${m.audioMediaId}`} label={`le vocal de ${m.authorName}`} />}
              <div className="a">
                <b>{m.authorName}</b>
                <span>{new Date(m.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                {m.deletable && (
                  <button
                    className="link-btn red small"
                    onClick={async () => {
                      if (!confirm('Supprimer ce message ?')) return;
                      const r = await api(`/api/livre-or/${m.id}`, 'DELETE');
                      if (r.ok) router.refresh();
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
