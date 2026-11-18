'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { Icon } from './Icon';
import { thumbSrc, type GalleryItem } from './PhotoLibrary';

const dist = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

export function PhotoViewer(props: {
  items: GalleryItem[];
  index: number;
  moderation: boolean;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { items, index, onIndex, onClose } = props;
  const m = items[index];
  const [chrome, setChrome] = useState(true);
  const [info, setInfo] = useState(false);
  const [toast, setToast] = useState('');
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [anim, setAnim] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const g = useRef({ x: 0, y: 0, t: 0, axis: '' as '' | 'x' | 'y' | 'pan', pinch: 0, s0: 1, p0: { x: 0, y: 0 }, lastTap: 0, moved: false });
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const go = useCallback(
    (dir: 1 | -1) => {
      if ((dir === 1 && !hasNext) || (dir === -1 && !hasPrev)) return;
      setAnim(true);
      setDx(dir === 1 ? -window.innerWidth : window.innerWidth);
      setTimeout(() => {
        setAnim(false);
        setDx(0);
        setScale(1);
        setPan({ x: 0, y: 0 });
        setInfo(false);
        onIndex(index + dir);
      }, 200);
    },
    [hasNext, hasPrev, index, onIndex],
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  function onStart(e: React.TouchEvent) {
    const s = g.current;
    if (e.touches.length === 2) {
      s.pinch = dist(e.touches[0], e.touches[1]);
      s.s0 = scale;
      s.axis = 'pan';
      return;
    }
    const t = e.touches[0];
    s.x = t.clientX;
    s.y = t.clientY;
    s.t = Date.now();
    s.axis = scale > 1 ? 'pan' : '';
    s.p0 = pan;
    s.moved = false;
  }

  function onMove(e: React.TouchEvent) {
    const s = g.current;
    if (e.touches.length === 2 && s.pinch) {
      const k = dist(e.touches[0], e.touches[1]) / s.pinch;
      setScale(Math.min(4, Math.max(1, s.s0 * k)));
      s.moved = true;
      return;
    }
    const t = e.touches[0];
    const mx = t.clientX - s.x;
    const my = t.clientY - s.y;
    if (Math.abs(mx) > 6 || Math.abs(my) > 6) s.moved = true;
    if (s.axis === 'pan') {
      setPan({ x: s.p0.x + mx, y: s.p0.y + my });
      return;
    }
    if (!s.axis && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (s.axis === 'x') setDx(mx);
    if (s.axis === 'y') setDy(Math.max(0, my));
  }

  function onEnd(e: React.TouchEvent) {
    const s = g.current;
    if (e.touches.length > 0) return;
    if (s.pinch) {
      s.pinch = 0;
      if (scale < 1.05) {
        setScale(1);
        setPan({ x: 0, y: 0 });
      }
      return;
    }
    const elapsed = Date.now() - s.t;
    if (!s.moved && elapsed < 300) {
      // tap simple ou double tap
      const now = Date.now();
      if (now - s.lastTap < 300) {
        if (tapTimer.current) clearTimeout(tapTimer.current);
        s.lastTap = 0;
        if (m.kind === 'photo') {
          if (scale > 1) {
            setScale(1);
            setPan({ x: 0, y: 0 });
          } else setScale(2.5);
        }
      } else {
        s.lastTap = now;
        tapTimer.current = setTimeout(() => setChrome((c) => !c), 300);
      }
      return;
    }
    if (s.axis === 'x') {
      const w = window.innerWidth;
      const fast = Math.abs(dx) / Math.max(1, elapsed) > 0.5;
      if ((dx < -w * 0.22 || (fast && dx < -30)) && hasNext) return go(1);
      if ((dx > w * 0.22 || (fast && dx > 30)) && hasPrev) return go(-1);
      setAnim(true);
      setDx(0);
      setTimeout(() => setAnim(false), 200);
    }
    if (s.axis === 'y') {
      if (dy > 110) return onClose();
      setAnim(true);
      setDy(0);
      setTimeout(() => setAnim(false), 200);
    }
    s.axis = '';
  }

  const fade = 1 - Math.min(0.7, dy / 400);
  const slide = (it: GalleryItem | undefined, current: boolean) => {
    if (!it) return <div className="pv-slide" />;
    if (it.kind === 'video') {
      return (
        <div className="pv-slide">
          {current ? <video key={it.id} src={`/api/medias/${it.id}`} controls autoPlay playsInline preload="auto" /> : <video src={thumbSrc(it)} preload="metadata" muted playsInline />}
        </div>
      );
    }
    return (
      <div className="pv-slide">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current ? `/api/medias/${it.id}` : thumbSrc(it)}
          alt={it.caption || `Photo de ${it.authorName}`}
          draggable={false}
          style={current ? { transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transition: g.current.pinch || g.current.axis === 'pan' ? 'none' : 'transform .2s' } : undefined}
          onDoubleClick={() => (scale > 1 ? (setScale(1), setPan({ x: 0, y: 0 })) : setScale(2.5))}
        />
      </div>
    );
  };

  const start = Math.max(0, index - 7);
  const strip = items.slice(start, index + 8);

  return (
    <div
      className={`pv${chrome ? '' : ' chrome-off'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Photo en plein écran"
      style={{ background: `rgba(0,0,0,${fade})` }}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
    >
      <div className="pv-top">
        <button className="icon-btn" onClick={onClose} aria-label="Fermer">
          <Icon name="back" />
        </button>
        <div className="pv-title">
          <b>
            {m.authorName}
            {m.official ? ', photographe' : ''}
          </b>
          <span>{new Date(m.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <span style={{ width: 44, textAlign: 'center', fontSize: 13, opacity: 0.8 }}>
          {index + 1}/{items.length}
        </span>
      </div>

      <div
        className="pv-track"
        style={{
          transform: `translate3d(calc(-100% + ${dx}px), ${dy}px, 0) scale(${1 - Math.min(0.25, dy / 1200)})`,
          transition: anim ? 'transform .2s ease-out' : 'none',
        }}
      >
        {slide(items[index - 1], false)}
        {slide(m, true)}
        {slide(items[index + 1], false)}
      </div>

      {hasPrev && (
        <button className="icon-btn only-d" style={{ position: 'absolute', left: 12, top: '50%', zIndex: 3, background: 'rgba(255,255,255,.15)' }} onClick={() => go(-1)} aria-label="Précédente">
          <Icon name="back" />
        </button>
      )}
      {hasNext && (
        <button
          className="icon-btn only-d"
          style={{ position: 'absolute', right: 12, top: '50%', zIndex: 3, background: 'rgba(255,255,255,.15)', transform: 'scaleX(-1)' }}
          onClick={() => go(1)}
          aria-label="Suivante"
        >
          <Icon name="back" />
        </button>
      )}

      {(info || m.caption) && chrome && (
        <p className="pv-caption">{info ? `${m.caption || 'Sans légende'}${m.kind === 'video' ? '' : ''}` : m.caption}</p>
      )}

      <div className="pv-strip" aria-hidden>
        {strip.map((it, i) => (
          <button key={it.id} className={start + i === index ? 'on' : ''} onClick={() => onIndex(start + i)} tabIndex={-1}>
            {it.kind === 'photo' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbSrc(it)} alt="" />
            ) : (
              <video src={thumbSrc(it)} preload="metadata" muted />
            )}
          </button>
        ))}
      </div>

      {toast && <div className="pv-toast">{toast}</div>}

      <div className="pv-bottom">
        <a className="icon-btn" href={`/api/medias/${m.id}?telecharger=1`} aria-label="Télécharger l’original" onClick={() => setToast('Téléchargement de l’original')}>
          <Icon name="download" />
        </a>
        <button className="icon-btn" onClick={() => setInfo(!info)} aria-label="Informations">
          <Icon name="info" />
        </button>
        {!props.moderation && !m.deletable && (
          <button
            className="icon-btn"
            aria-label="Signaler"
            onClick={async () => {
              const r = await api(`/api/medias/${m.id}`, 'POST');
              setToast(r.ok ? 'Signalé aux organisateurs' : r.error);
            }}
          >
            <Icon name="flag" />
          </button>
        )}
        {m.deletable && (
          <button
            className="icon-btn"
            aria-label="Supprimer"
            onClick={async () => {
              if (!confirm('Supprimer définitivement pour tout le monde ?')) return;
              const r = await api(`/api/medias/${m.id}`, 'DELETE');
              if (r.ok) props.onDeleted();
              else setToast(r.error);
            }}
          >
            <Icon name="trash" />
          </button>
        )}
      </div>
    </div>
  );
}
