'use client';

import { useEffect, useRef, useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { uploadFile } from '@/lib/upload-client';

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export function VoiceRecorder({ slug, maxSeconds, onDone }: { slug: string; maxSeconds: number; onDone: () => void }) {
  const [state, setState] = useState<'pret' | 'enregistre' | 'ecoute' | 'envoi'>('pret');
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = pickMime();
      const r = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined);
      const parts: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && parts.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(parts, { type: (r.mimeType || mime || 'audio/webm').split(';')[0] });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setState('ecoute');
      };
      rec.current = r;
      r.start(1000);
      setSeconds(0);
      setState('enregistre');
      const t0 = Date.now();
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setSeconds(s);
        if (s >= maxSeconds) stop();
      }, 250);
    } catch {
      setError('Le micro n’est pas accessible. Autorisez-le dans les réglages du navigateur, puis réessayez.');
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (rec.current?.state === 'recording') rec.current.stop();
  }

  function reset() {
    setBlob(null);
    setUrl('');
    setSeconds(0);
    setState('pret');
  }

  async function publish() {
    if (!blob) return;
    setState('envoi');
    setError('');
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    try {
      await uploadFile({
        slug,
        file: new File([blob], `vocal.${ext}`, { type: blob.type }),
        text,
        onProgress: (s, t) => setProgress(Math.round((s / t) * 100)),
      });
      reset();
      setText('');
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setState('ecoute');
    }
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const max = `${Math.floor(maxSeconds / 60)}:${String(maxSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="stack" style={{ ['--gap' as string]: '14px' }}>
      {state === 'pret' && (
        <div className="row">
          <button type="button" className="btn" onClick={start}>
            Enregistrer un vocal
          </button>
          <span className="small muted">{maxSeconds / 60} minutes maximum. Vous pourrez l’écouter avant de le publier.</span>
        </div>
      )}
      {state === 'enregistre' && (
        <div className="rec">
          <span className="dot" aria-hidden />
          <span className="time" aria-live="off">
            {mmss}
          </span>
          <span className="muted">sur {max}</span>
          <button type="button" className="btn" onClick={stop}>
            Arrêter
          </button>
        </div>
      )}
      {(state === 'ecoute' || state === 'envoi') && url && (
        <>
          <AudioPlayer src={url} label="votre enregistrement" />
          <label className="field">
            <span>Un mot avec le vocal (facultatif)</span>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
          </label>
          <div className="row">
            <button type="button" className="btn" onClick={publish} disabled={state === 'envoi'}>
              {state === 'envoi' ? `Envoi ${progress} %` : 'Publier le vocal'}
            </button>
            <button type="button" className="btn ghost" onClick={() => { reset(); start(); }} disabled={state === 'envoi'}>
              Recommencer
            </button>
            <button type="button" className="link-btn red" onClick={reset} disabled={state === 'envoi'}>
              Supprimer
            </button>
          </div>
        </>
      )}
      {error && <p className="alert err small">{error}</p>}
    </div>
  );
}
