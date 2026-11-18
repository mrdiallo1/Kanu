'use client';

// Application de l'agent à l'entrée.
// La liste des invités est gardée sur le téléphone : le contrôle continue
// même sans réseau, et les entrées sont envoyées dès que la connexion revient.

import jsQR from 'jsqr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface G {
  id: string;
  name: string;
  seats: number;
  token: string;
  access: string[];
  blocked: boolean;
}
interface Z {
  id: string;
  name: string;
  singleEntry: boolean;
}
interface C {
  guestId: string;
  zoneId: string;
  at: string;
}
interface Data {
  zones: Z[];
  guests: G[];
  checkins: C[];
  fetchedAt: string;
}

type Verdict =
  | { kind: 'yes'; guest: G }
  | { kind: 'no'; reason: string; guest?: G }
  | { kind: 'dup'; guest: G; at: string }
  | { kind: 'done'; guest: G };

const clock = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function tokenFrom(text: string) {
  const m = /\/invitation\/([A-Za-z0-9_-]+)/.exec(text);
  return m ? m[1] : text.trim();
}

export function ScannerApp({ slug, title, agentName }: { slug: string; title: string; agentName: string }) {
  const KEY = `kanu-controle-${slug}`;
  const QKEY = `kanu-controle-file-${slug}`;
  const [data, setData] = useState<Data | null>(null);
  const [queue, setQueue] = useState<C[]>([]);
  const [zone, setZone] = useState('');
  const [online, setOnline] = useState(true);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [camError, setCamError] = useState('');
  const [mode, setMode] = useState<'scan' | 'liste'>('scan');
  const [q, setQ] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lastText = useRef({ t: '', at: 0 });
  const verdictRef = useRef<Verdict | null>(null);
  verdictRef.current = verdict;

  // --- données locales ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setData(JSON.parse(saved));
      const qd = localStorage.getItem(QKEY);
      if (qd) setQueue(JSON.parse(qd));
      const z = localStorage.getItem(KEY + '-zone');
      if (z) setZone(z);
    } catch {
      /* stockage indisponible */
    }
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [KEY, QKEY]);

  const persist = (d: Data | null, qd: C[]) => {
    try {
      if (d) localStorage.setItem(KEY, JSON.stringify(d));
      localStorage.setItem(QKEY, JSON.stringify(qd));
    } catch {
      /* plein ou indisponible */
    }
  };

  const queueRef = useRef(queue);
  queueRef.current = queue;

  const sync = useCallback(async () => {
    try {
      const pending = queueRef.current;
      if (pending.length) {
        const r = await fetch(`/api/controle/${slug}/entrees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: pending }),
        });
        if (r.ok) {
          const sent = new Set(pending.map((p) => p.guestId + p.zoneId));
          setQueue((cur) => {
            const left = cur.filter((c) => !sent.has(c.guestId + c.zoneId));
            persist(null, left);
            return left;
          });
        }
      }
      const res = await fetch(`/api/controle/${slug}/liste`, { cache: 'no-store' });
      if (res.status === 401) return location.reload();
      if (!res.ok) throw new Error();
      const j = await res.json();
      const d: Data = { zones: j.event.zones, guests: j.guests, checkins: j.checkins, fetchedAt: j.fetchedAt };
      setData(d);
      persist(d, queueRef.current);
      setOnline(true);
      setZone((z) => z || d.zones.find((x) => x.singleEntry)?.id || d.zones[0]?.id || '');
    } catch {
      setOnline(false);
    }
  }, [slug]);

  useEffect(() => {
    sync();
    const t = setInterval(sync, 15_000);
    return () => clearInterval(t);
  }, [sync]);

  useEffect(() => {
    if (zone) localStorage.setItem(KEY + '-zone', zone);
  }, [zone, KEY]);

  const allCheckins = useMemo(() => [...(data?.checkins || []), ...queue], [data, queue]);
  const currentZone = data?.zones.find((z) => z.id === zone);

  // --- vérification ---
  const evaluate = useCallback(
    (g: G | undefined): Verdict => {
      if (!g) return { kind: 'no', reason: 'Ce QR code ne correspond à aucune invitation de cette fête.' };
      if (g.blocked) return { kind: 'no', reason: 'Cette invitation a été annulée par les organisateurs.', guest: g };
      if (!g.access.includes(zone)) {
        return { kind: 'no', reason: `Cette invitation ne donne pas accès : ${currentZone?.name.toLowerCase()}.`, guest: g };
      }
      const prev = allCheckins.find((c) => c.guestId === g.id && c.zoneId === zone);
      if (prev && currentZone?.singleEntry) return { kind: 'dup', guest: g, at: prev.at };
      return { kind: 'yes', guest: g };
    },
    [zone, currentZone, allCheckins],
  );

  const onText = useCallback(
    (text: string) => {
      if (!data || verdictRef.current) return;
      const now = Date.now();
      if (lastText.current.t === text && now - lastText.current.at < 3000) return;
      lastText.current = { t: text, at: now };
      const token = tokenFrom(text);
      setVerdict(evaluate(data.guests.find((g) => g.token === token)));
      navigator.vibrate?.(80);
    },
    [data, evaluate],
  );

  // --- caméra ---
  useEffect(() => {
    if (mode !== 'scan') return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stop) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        setCamError('');
        const tick = () => {
          if (stop) return;
          const c = canvas.current;
          if (c && v.readyState === v.HAVE_ENOUGH_DATA && !verdictRef.current) {
            const w = 480;
            const h = Math.round((v.videoHeight / v.videoWidth) * w) || 480;
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d', { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
            if (code?.data) onText(code.data);
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setCamError('La caméra n’est pas accessible. Autorisez-la dans le navigateur, ou utilisez la recherche par nom.');
      }
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [mode, onText]);

  function validate(g: G) {
    const c: C = { guestId: g.id, zoneId: zone, at: new Date().toISOString() };
    setQueue((cur) => {
      const next = [...cur, c];
      persist(null, next);
      return next;
    });
    setVerdict({ kind: 'done', guest: g });
    setTimeout(() => setVerdict((v) => (v?.kind === 'done' ? null : v)), 1400);
    setTimeout(sync, 200);
  }

  // --- compteurs ---
  const stats = useMemo(() => {
    if (!data) return { inside: 0, allowed: 0 };
    const byId = new Map(data.guests.map((g) => [g.id, g]));
    const ids = new Set(allCheckins.filter((c) => c.zoneId === zone).map((c) => c.guestId));
    const inside = [...ids].reduce((n, id) => n + (byId.get(id)?.seats || 1), 0);
    const allowed = data.guests.filter((g) => g.access.includes(zone) && !g.blocked).reduce((n, g) => n + g.seats, 0);
    return { inside, allowed };
  }, [data, allCheckins, zone]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!data || s.length < 2) return [];
    return data.guests.filter((g) => g.name.toLowerCase().includes(s)).slice(0, 30);
  }, [data, q]);

  return (
    <div className="scan-app">
      <div className="bar-top">
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div className="small" style={{ opacity: 0.7 }}>
            {agentName}
          </div>
        </div>
        <span className={`net${online ? '' : ' off'}`}>
          {online ? 'En ligne' : 'Hors ligne'}
          {queue.length > 0 ? `, ${queue.length} à envoyer` : ''}
        </span>
      </div>

      {data && (
        <div className="zone-pick" role="group" aria-label="Espace contrôlé">
          {data.zones.map((z) => (
            <button key={z.id} aria-pressed={zone === z.id} onClick={() => setZone(z.id)}>
              {z.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '0 18px 14px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 44, letterSpacing: '-0.04em', lineHeight: 1 }}>{stats.inside}</span>
        <span style={{ opacity: 0.75 }}>
          sur {stats.allowed} personnes entrées{currentZone ? `, ${currentZone.name.toLowerCase()}` : ''}
        </span>
      </div>

      {!data ? (
        <p style={{ padding: 18 }}>Chargement de la liste des invités…</p>
      ) : mode === 'scan' ? (
        <>
          <div className="viewfinder">
            <video ref={video} muted playsInline />
            <div className="frame" aria-hidden />
          </div>
          <canvas ref={canvas} hidden />
          {camError && <p className="alert err" style={{ margin: '14px 18px 0' }}>{camError}</p>}
          <div style={{ padding: 18 }}>
            <button className="btn block white" onClick={() => setMode('liste')}>
              Chercher un invité par son nom
            </button>
          </div>
        </>
      ) : (
        <div className="search">
          <div className="row" style={{ marginBottom: 12 }}>
            <input className="input" style={{ flex: 1 }} autoFocus placeholder="Nom de l’invité" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn sm white" onClick={() => setMode('scan')}>
              Scanner
            </button>
          </div>
          <div className="results">
            {results.map((g) => {
              const inside = allCheckins.some((c) => c.guestId === g.id && c.zoneId === zone);
              return (
                <button key={g.id} onClick={() => setVerdict(evaluate(g))}>
                  <span>
                    <b>{g.name}</b>
                    <br />
                    <span className="small" style={{ opacity: 0.7 }}>
                      {g.seats} personne{g.seats > 1 ? 's' : ''}
                    </span>
                  </span>
                  <span className="small" style={{ opacity: 0.8 }}>{inside ? 'Déjà entré' : g.access.includes(zone) ? 'Autorisé' : 'Pas d’accès'}</span>
                </button>
              );
            })}
            {q.trim().length >= 2 && results.length === 0 && <p style={{ opacity: 0.7 }}>Personne avec ce nom dans la liste.</p>}
          </div>
        </div>
      )}

      {verdict && (
        <div className={`verdict ${verdict.kind === 'yes' || verdict.kind === 'done' ? 'yes' : verdict.kind === 'dup' ? 'dup' : 'no'}`} role="alert">
          {verdict.kind === 'yes' && (
            <>
              <h2>Accès autorisé</h2>
              <p className="who">{verdict.guest.name}</p>
              <p style={{ fontSize: 20 }}>
                {verdict.guest.seats} personne{verdict.guest.seats > 1 ? 's' : ''}, {currentZone?.name.toLowerCase()}
              </p>
              <button className="btn white block" style={{ minHeight: 60, fontSize: 20 }} onClick={() => validate(verdict.guest)}>
                Valider l’entrée
              </button>
              <button className="btn ghost block" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => setVerdict(null)}>
                Annuler
              </button>
            </>
          )}
          {verdict.kind === 'done' && (
            <>
              <h2>Entrée validée</h2>
              <p className="who">{verdict.guest.name}</p>
            </>
          )}
          {verdict.kind === 'dup' && (
            <>
              <h2>Déjà entré</h2>
              <p className="who">{verdict.guest.name}</p>
              <p style={{ fontSize: 20 }}>Cette invitation a été scannée à {clock(verdict.at)}.</p>
              <button className="btn white block" onClick={() => setVerdict(null)}>
                Continuer
              </button>
            </>
          )}
          {verdict.kind === 'no' && (
            <>
              <h2>Accès refusé</h2>
              {verdict.guest && <p className="who">{verdict.guest.name}</p>}
              <p style={{ fontSize: 20 }}>{verdict.reason}</p>
              <button className="btn white block" onClick={() => setVerdict(null)}>
                Continuer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
