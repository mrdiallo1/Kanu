'use client';

import { useEffect, useRef, useState } from 'react';

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export function AudioPlayer({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setT(a.currentTime);
    const onMeta = () => {
      // Certains enregistrements WebM n'annoncent pas leur durée : on la force.
      if (a.duration === Infinity) {
        a.currentTime = 1e9;
        a.ontimeupdate = () => {
          a.ontimeupdate = null;
          setD(a.duration);
          a.currentTime = 0;
        };
      } else setD(a.duration);
    };
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('ended', onEnd);
    a.addEventListener('pause', onEnd);
    a.addEventListener('play', () => setPlaying(true));
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('pause', onEnd);
    };
  }, [src]);

  return (
    <div className="player">
      <audio ref={ref} src={src} preload="metadata" />
      <button
        className="pp"
        aria-label={playing ? `Mettre en pause ${label}` : `Écouter ${label}`}
        onClick={() => {
          const a = ref.current!;
          if (a.paused) {
            document.querySelectorAll('audio').forEach((x) => x !== a && x.pause());
            a.play();
          } else a.pause();
        }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M3 1.5v11l9.5-5.5z" fill="currentColor" />
          </svg>
        )}
      </button>
      <input
        type="range"
        min={0}
        max={d || 0}
        step={0.1}
        value={Math.min(t, d || 0)}
        aria-label="Position dans le message"
        onChange={(e) => {
          if (ref.current) ref.current.currentTime = Number(e.target.value);
        }}
      />
      <time>
        {fmt(t)} / {fmt(d)}
      </time>
    </div>
  );
}
