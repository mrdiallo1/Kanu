'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadFile } from '@/lib/upload-client';
import { Icon } from './Icon';

interface Item {
  key: string;
  file: File;
  url: string;
  sent: number;
  state: 'pret' | 'envoi' | 'attente' | 'fini' | 'erreur';
  error?: string;
}

/** Le bouton « + » de la galerie est un <label htmlFor={UPLOAD_INPUT_ID}> : le choix des fichiers s'ouvre directement. */
export const UPLOAD_INPUT_ID = 'kanu-choisir-medias';

export function UploadSheet({ slug, freeBytes, onDone }: { slug: string; freeBytes: number; onDone: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [caption, setCaption] = useState('');
  const [running, setRunning] = useState(false);
  const [hidden, setHidden] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const open = items.length > 0 && !hidden;
  const onClose = () => {
    if (running) setHidden(true);
    else setItems([]);
  };

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), [items]);

  const upd = (key: string, p: Partial<Item>) => setItems((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)));

  function pick(files: FileList | null) {
    if (!files?.length) return;
    setHidden(false);
    const list = Array.from(files).map((file, i) => ({ key: `${Date.now()}-${i}`, file, url: URL.createObjectURL(file), sent: 0, state: 'pret' as const }));
    setItems((l) => [...l.filter((x) => x.state !== 'fini'), ...list]);
    if (input.current) input.current.value = '';
  }

  async function publish() {
    setRunning(true);
    const queue = items.filter((i) => i.state === 'pret' || i.state === 'erreur');
    const text = caption;
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const it = queue[next++];
        upd(it.key, { state: 'envoi', error: undefined });
        try {
          await uploadFile({
            slug,
            file: it.file,
            caption: text,
            onProgress: (sent) => upd(it.key, { sent }),
            onState: (s) => upd(it.key, { state: s === 'attente' ? 'attente' : 'envoi' }),
          });
          upd(it.key, { state: 'fini', sent: it.file.size });
        } catch (e) {
          upd(it.key, { state: 'erreur', error: (e as Error).message });
        }
      }
    };
    await Promise.all([worker(), worker()]);
    setRunning(false);
    onDone();
  }

  const total = items.reduce((n, i) => n + i.file.size, 0);
  const sent = items.reduce((n, i) => n + i.sent, 0);
  const done = items.length > 0 && items.every((i) => i.state === 'fini');
  const errors = items.filter((i) => i.state === 'erreur');
  const waiting = items.some((i) => i.state === 'attente');

  useEffect(() => {
    if (done && !running) {
      const t = setTimeout(() => {
        setItems([]);
        setCaption('');
        setHidden(false);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [done, running]);

  return (
    <>
      <input ref={input} id={UPLOAD_INPUT_ID} type="file" accept="image/*,video/*" multiple className="sr" onChange={(e) => pick(e.target.files)} />

      {/* Barre de progression qui reste visible quand la feuille est fermée */}
      {hidden && running && (
        <button className="mini-progress" onClick={() => setHidden(false)} style={{ border: 0, textAlign: 'left' }}>
          <span>{waiting ? 'En attente du réseau' : `Envoi ${Math.round((sent / Math.max(1, total)) * 100)} %`}</span>
          <span className="track">
            <span style={{ width: `${(sent / Math.max(1, total)) * 100}%` }} />
          </span>
        </button>
      )}

      {open && (
        <div className="sheet-bg" onClick={onClose}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Publier des photos" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>
                {items.length} élément{items.length > 1 ? 's' : ''}
              </h3>
              <button className="text-btn" onClick={onClose}>
                {running ? 'Masquer' : 'Fermer'}
              </button>
            </div>

            {freeBytes < total && !running && !done && (
              <p className="alert err small" style={{ marginBottom: 12 }}>
                Il ne reste pas assez de place dans l’espace pour tout envoyer. Retirez des vidéos.
              </p>
            )}

            <div className="up-thumbs">
              {items.map((it) => (
                <div key={it.key}>
                  {it.file.type.startsWith('image/') && !/heic|heif/.test(it.file.type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.url} alt="" />
                  ) : it.file.type.startsWith('video/') ? (
                    <video src={it.url} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="vid">Photo</span>
                  )}
                  {it.state !== 'pret' && (
                    <span className={`up-ring${it.state === 'fini' ? ' done' : it.state === 'erreur' ? ' err' : ''}`}>
                      {it.state === 'fini' ? <Icon name="check" stroke={3} /> : it.state === 'erreur' ? 'Échec' : it.state === 'attente' ? '…' : `${Math.round((it.sent / it.file.size) * 100)}%`}
                    </span>
                  )}
                  {it.state === 'pret' && !running && (
                    <button
                      onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                      aria-label="Retirer"
                      style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 99, border: 0, background: 'rgba(0,0,0,.55)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                    >
                      <Icon name="close" size={14} stroke={2.6} />
                    </button>
                  )}
                </div>
              ))}
              {!running && !done && (
                <div>
                  <button
                    onClick={() => input.current?.click()}
                    aria-label="Ajouter d’autres fichiers"
                    style={{ width: '100%', height: '100%', border: '2px dashed var(--trait)', background: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--encre-2)', display: 'grid', placeItems: 'center' }}
                  >
                    <Icon name="plus" />
                  </button>
                </div>
              )}
            </div>

            {errors.length > 0 && !running && <p className="alert err small" style={{ marginTop: 12 }}>{errors[0].error}</p>}
            {waiting && <p className="alert info small" style={{ marginTop: 12 }}>Connexion perdue. L’envoi reprendra tout seul au retour du réseau.</p>}

            {!done && (
              <div className="stack" style={{ ['--gap' as string]: '12px', marginTop: 16 }}>
                {!running && (
                  <input className="input" placeholder="Ajouter une légende (facultatif)" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} />
                )}
                <button className="btn block" onClick={publish} disabled={running}>
                  {running ? `Envoi ${Math.round((sent / Math.max(1, total)) * 100)} %` : errors.length ? 'Réessayer' : `Publier ${items.length > 1 ? `les ${items.length}` : ''}`}
                </button>
                <p className="tiny" style={{ textAlign: 'center' }}>Qualité originale. Vous pouvez fermer cette fenêtre pendant l’envoi.</p>
              </div>
            )}
            {done && <p className="alert ok" style={{ marginTop: 16 }}>Publié dans la galerie.</p>}
          </div>
        </div>
      )}
    </>
  );
}
