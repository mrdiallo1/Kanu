'use client';

// Galerie inspirée de l'app Photos de l'iPhone :
// grille carrée serrée regroupée par jour, sélection multiple,
// visionneuse plein écran avec balayage, pincer pour zoomer et glisser vers le bas pour fermer.

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { Icon } from './Icon';
import { PhotoViewer } from './PhotoViewer';
import { UPLOAD_INPUT_ID, UploadSheet } from './UploadSheet';

export interface GalleryItem {
  id: string;
  kind: 'photo' | 'video';
  authorName: string;
  caption?: string;
  createdAt: string;
  hasThumb: boolean;
  official?: boolean;
  deletable: boolean;
  reported?: number;
  mime: string;
}

export const thumbSrc = (m: GalleryItem) =>
  m.kind === 'photo' ? `/api/medias/${m.id}${m.hasThumb ? '?vignette=1' : ''}` : `/api/medias/${m.id}#t=0.1`;

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Aujourd’hui';
  if (same(d, y)) return 'Hier';
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function PhotoLibrary(props: {
  items: GalleryItem[];
  slug: string;
  canUpload: boolean;
  freeBytes: number;
  moderation?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<'tout' | 'photo' | 'video' | 'officiel' | 'signale'>('tout');
  const [author, setAuthor] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const [limit, setLimit] = useState(120);
  const [note, setNote] = useState('');
  const more = useRef<HTMLDivElement>(null);

  const authors = useMemo(() => [...new Set(props.items.map((i) => i.authorName))].sort((a, b) => a.localeCompare(b, 'fr')), [props.items]);
  const shown = useMemo(
    () =>
      props.items.filter((i) => {
        if (filter === 'photo' && i.kind !== 'photo') return false;
        if (filter === 'video' && i.kind !== 'video') return false;
        if (filter === 'officiel' && !i.official) return false;
        if (filter === 'signale' && !i.reported) return false;
        return !author || i.authorName === author;
      }),
    [props.items, filter, author],
  );

  // Regroupement par jour (le plus récent en haut, comme sur l'iPhone en mode « Jours »)
  const groups = useMemo(() => {
    const out: { label: string; items: { m: GalleryItem; index: number }[] }[] = [];
    shown.slice(0, limit).forEach((m, index) => {
      const label = dayLabel(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push({ m, index });
      else out.push({ label, items: [{ m, index }] });
    });
    return out;
  }, [shown, limit]);

  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setLimit((l) => l + 120), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shown.length]);

  const photos = props.items.filter((i) => i.kind === 'photo').length;
  const videos = props.items.length - photos;

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function downloadSelected() {
    const ids = [...selected];
    for (const id of ids) {
      const a = document.createElement('a');
      a.href = `/api/medias/${id}?telecharger=1`;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 450));
    }
    setNote(`${ids.length} téléchargement${ids.length > 1 ? 's' : ''} lancé${ids.length > 1 ? 's' : ''}.`);
    setSelecting(false);
    setSelected(new Set());
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (!confirm(`Supprimer ${ids.length} élément${ids.length > 1 ? 's' : ''} pour tout le monde ?`)) return;
    for (const id of ids) await api(`/api/medias/${id}`, 'DELETE');
    setSelecting(false);
    setSelected(new Set());
    router.refresh();
  }

  const selItems = props.items.filter((i) => selected.has(i.id));
  const canDeleteSel = selItems.length > 0 && selItems.every((i) => i.deletable);

  return (
    <div>
      <div className="pgrid-head">
        <div className="segment" role="group" aria-label="Afficher">
          {(
            [
              ['tout', 'Tout'],
              ['photo', 'Photos'],
              ['video', 'Vidéos'],
              ...(props.items.some((i) => i.official) ? [['officiel', 'Photographe']] : []),
              ...(props.moderation && props.items.some((i) => i.reported) ? [['signale', 'Signalées']] : []),
            ] as [typeof filter, string][]
          ).map(([k, l]) => (
            <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 4 }}>
          {authors.length > 1 && (
            <select
              className="input"
              style={{ width: 'auto', minHeight: 36, height: 36, padding: '0 10px', fontSize: 14.5, maxWidth: 150 }}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              aria-label="Filtrer par auteur"
            >
              <option value="">Tout le monde</option>
              {authors.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          )}
          {props.items.length > 0 && (
            <button
              className="text-btn"
              onClick={() => {
                setSelecting(!selecting);
                setSelected(new Set());
              }}
            >
              {selecting ? 'Annuler' : 'Sélectionner'}
            </button>
          )}
        </div>
      </div>

      {props.items.length === 0 ? (
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: 26 }}>Aucune photo pour l’instant</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            {props.canUpload ? 'Touchez le bouton + pour ajouter les vôtres. Tout le monde les verra ici.' : 'Les photos et vidéos des invités apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.label + g.items[0].index}>
              <div className="pday">
                <b>{g.label}</b>
                <span>{g.items.length}</span>
              </div>
              <div className="pgrid">
                {g.items.map(({ m, index }) => (
                  <Cell
                    key={m.id}
                    m={m}
                    selecting={selecting}
                    selected={selected.has(m.id)}
                    onClick={() => (selecting ? toggle(m.id) : setOpen(index))}
                  />
                ))}
              </div>
            </section>
          ))}
          <div ref={more} />
          <p className="pcount">
            {photos} photo{photos > 1 ? 's' : ''}, {videos} vidéo{videos > 1 ? 's' : ''}
          </p>
        </>
      )}

      {note && (
        <p className="alert ok small" style={{ margin: 16 }} onClick={() => setNote('')}>
          {note}
        </p>
      )}

      {selecting && (
        <div className="selbar">
          <button className="icon-btn orange" disabled={selected.size === 0} onClick={downloadSelected} aria-label="Télécharger la sélection">
            <Icon name="download" />
          </button>
          <b style={{ fontSize: 15.5 }}>
            {selected.size === 0 ? 'Sélectionnez des éléments' : `${selected.size} sélectionné${selected.size > 1 ? 's' : ''}`}
          </b>
          <button className="icon-btn orange" disabled={!canDeleteSel} onClick={deleteSelected} aria-label="Supprimer la sélection" style={{ opacity: canDeleteSel ? 1 : 0.3 }}>
            <Icon name="trash" />
          </button>
        </div>
      )}

      {props.canUpload && !selecting && (
        <label htmlFor={UPLOAD_INPUT_ID} className="fab" aria-label="Ajouter des photos ou des vidéos" role="button" tabIndex={0}>
          <Icon name="plus" size={28} stroke={2.4} />
        </label>
      )}

      {props.canUpload && <UploadSheet slug={props.slug} freeBytes={props.freeBytes} onDone={() => router.refresh()} />}

      {open !== null && shown[open] && (
        <PhotoViewer
          items={shown}
          index={open}
          moderation={!!props.moderation}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          onDeleted={() => {
            setOpen(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Cell({ m, selecting, selected, onClick }: { m: GalleryItem; selecting: boolean; selected: boolean; onClick: () => void }) {
  const [dur, setDur] = useState<number | null>(null);
  const heic = m.kind === 'photo' && !m.hasThumb && /heic|heif/.test(m.mime);
  return (
    <button className={`pcell${selected ? ' selected' : ''}`} onClick={onClick} aria-label={`${m.kind === 'video' ? 'Vidéo' : 'Photo'} de ${m.authorName}`}>
      {m.kind === 'photo' ? (
        heic ? (
          <span className="heic">Photo iPhone (HEIC)</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbSrc(m)} alt="" loading="lazy" decoding="async" />
        )
      ) : (
        <>
          <video src={thumbSrc(m)} preload="metadata" muted playsInline onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} />
          <span className="dur">
            <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden>
              <path d="M3 1.5v11l9.5-5.5z" fill="currentColor" />
            </svg>
            {dur && Number.isFinite(dur) ? fmtDur(dur) : ''}
          </span>
        </>
      )}
      {m.official && <span className="star">Photographe</span>}
      {selecting && <span className="sel">{selected && <Icon name="check" size={14} stroke={3} />}</span>}
    </button>
  );
}
