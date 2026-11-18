'use client';

// Grande carte du haut de l'accueil des mariés :
// la photo de couple (facultative) en fond, les prénoms et le compte à rebours en direct.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { j: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function CoupleHero(props: {
  eventId: string;
  names: string[];
  dateLabel: string;
  target: string; // date et heure de la fête (ISO)
  coverUrl?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/espaces/${props.eventId}/couverture`, { method: 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (input.current) input.current.value = '';
    if (!res.ok) return setError(j.error || 'La photo n’a pas pu être envoyée.');
    router.refresh();
  }

  async function remove() {
    if (!confirm('Retirer la photo de couple ?')) return;
    await fetch(`/api/espaces/${props.eventId}/couverture`, { method: 'DELETE' });
    router.refresh();
  }

  const target = new Date(props.target).getTime();
  const diff = now === null ? null : target - now;
  const p = parts(diff ?? 0);
  const sinceDays = diff !== null && diff < 0 ? Math.floor(-diff / 86400000) : 0;

  return (
    <section className={`ch${props.coverUrl ? ' has-photo' : ''}`} aria-label="Votre fête">
      {props.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ch-bg" src={props.coverUrl} alt="Votre photo de couple" />
      )}

      <input ref={input} type="file" accept="image/*" className="sr" onChange={(e) => upload(e.target.files?.[0])} id="photo-couple" />

      <div className="ch-top">
        {props.coverUrl ? (
          <div className="ch-photo-actions">
            <label htmlFor="photo-couple" className="ch-chip" aria-label="Changer la photo de couple">
              <Icon name="photos" size={18} />
              {busy ? 'Envoi…' : 'Changer'}
            </label>
            <button className="ch-chip" onClick={remove} aria-label="Retirer la photo de couple">
              <Icon name="close" size={16} />
            </button>
          </div>
        ) : (
          <span />
        )}
      </div>

      <div className="ch-body">
        <div className="ch-names">
          {props.names.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <div className="ch-date">{props.dateLabel}</div>

        {diff === null ? (
          <div className="ch-count" style={{ visibility: 'hidden' }}>
            <div>
              <b>00</b>
              <span>jours</span>
            </div>
          </div>
        ) : diff > 0 ? (
          <div className="ch-count" role="timer" aria-label={`Dans ${p.j} jours et ${p.h} heures`}>
            <div>
              <b>{p.j}</b>
              <span>{p.j > 1 ? 'jours' : 'jour'}</span>
            </div>
            <div>
              <b>{String(p.h).padStart(2, '0')}</b>
              <span>heures</span>
            </div>
            <div>
              <b>{String(p.m).padStart(2, '0')}</b>
              <span>min</span>
            </div>
            <div>
              <b>{String(p.s).padStart(2, '0')}</b>
              <span>sec</span>
            </div>
          </div>
        ) : (
          <div className="ch-done">{sinceDays === 0 ? 'C’est le grand jour. Félicitations !' : `Mariés depuis ${sinceDays} jour${sinceDays > 1 ? 's' : ''}`}</div>
        )}

        {!props.coverUrl && (
          <label htmlFor="photo-couple" className="ch-add">
            <span className="ic">
              <Icon name="photos" />
            </span>
            <span>
              <b>{busy ? 'Envoi de la photo…' : 'Ajouter votre photo de couple'}</b>
              <small>Facultatif. Elle s’affiche ici et dans l’aperçu du lien sur WhatsApp.</small>
            </span>
          </label>
        )}
        {error && <p className="ch-error">{error}</p>}
      </div>
    </section>
  );
}
