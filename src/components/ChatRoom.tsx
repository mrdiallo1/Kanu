'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, copy } from '@/lib/client';
import { Icon } from './Icon';
import './chat.css';
import { MemberPicker } from './MemberPicker';
import { avatarColor, initials } from './ChatList';

// ---------- Types ----------

export interface Msg {
  id: string;
  text: string;
  at: string;
  author: string;
  authorKey: string;
  audio?: { url: string; seconds: number };
  edited?: boolean;
  deleted?: boolean;
  pending?: boolean;
  failed?: boolean;
}
interface Info {
  id: string;
  name: string;
  description: string;
  isAdmin: boolean;
  isOwner: boolean;
  members: { id: string; name: string; admin: boolean; owner: boolean }[];
}
interface Initial {
  me: string;
  rev: number;
  name: string;
  members: number;
  isAdmin: boolean;
  messages: Msg[];
  hasMore: boolean;
}

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const POLL_MS = 2500;

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayOf = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Aujourd’hui';
  const y = new Date();
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};
const colorIndex = (key: string) => [...key].reduce((n, c) => n + c.charCodeAt(0), 0) % 6;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Fusionne une liste reçue du serveur avec celle affichée (mise à jour, ajout, tri). */
function merge(cur: Msg[], fresh: Msg[], me: string) {
  const byId = new Map(cur.map((m) => [m.id, m]));
  for (const f of fresh) byId.set(f.id, f);
  let out = [...byId.values()];
  // Un message envoyé arrivé par la vérification avant la réponse de l'envoi : on retire la copie « en cours »
  const real = fresh.filter((f) => f.authorKey === me);
  out = out.filter((m) => !m.pending || !real.some((r) => (m.audio ? !!r.audio : r.text === m.text) && Math.abs(Date.parse(r.at) - Date.parse(m.at)) < 60_000));
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

// ---------- La discussion ----------

export function ChatRoom({ slug, groupId, initial }: { slug: string; groupId: string; initial: Initial }) {
  const router = useRouter();
  const me = initial.me;
  const [name, setName] = useState(initial.name);
  const [isAdmin, setIsAdmin] = useState(initial.isAdmin);
  const [msgs, setMsgs] = useState<Msg[]>(initial.messages);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<Msg | null>(null);
  const [menu, setMenu] = useState<Msg | null>(null);
  const [recording, setRecording] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [toast, setToast] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const keepOffset = useRef<number | null>(null);
  const rev = useRef(initial.rev);

  // Vérification rapide toutes les 2,5 s (seulement si l'écran est affiché)
  const refresh = useCallback(async () => {
    const r = await api<{ same?: boolean; rev: number; name: string; isAdmin: boolean; messages: Msg[] }>(`/api/groupes/${groupId}?rev=${rev.current}`, 'GET');
    if (!r.ok) {
      if (r.error && r.error.includes('introuvable')) router.replace(`/e/${slug}/discussions`);
      return;
    }
    if (r.data.same) return;
    rev.current = r.data.rev;
    setName(r.data.name);
    setIsAdmin(r.data.isAdmin);
    setMsgs((cur) => merge(cur, r.data.messages, me));
  }, [groupId, me, router, slug]);

  useEffect(() => {
    const t = setInterval(() => !document.hidden && refresh(), POLL_MS);
    const onShow = () => !document.hidden && refresh();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [refresh]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  async function loadOlder() {
    if (loadingOlder || !hasMore) return;
    const first = msgs.find((m) => !m.pending);
    if (!first) return;
    setLoadingOlder(true);
    const r = await api<{ messages: Msg[]; hasMore: boolean }>(`/api/groupes/${groupId}?avant=${encodeURIComponent(first.at)}`, 'GET');
    setLoadingOlder(false);
    if (!r.ok) return;
    keepOffset.current = scroller.current ? scroller.current.scrollHeight - scroller.current.scrollTop : null;
    setHasMore(r.data.hasMore);
    setMsgs((cur) => merge(cur, r.data.messages, me));
  }

  function onScroll() {
    const el = scroller.current!;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80) loadOlder();
  }

  function flash(s: string) {
    setToast(s);
    setTimeout(() => setToast(''), 2200);
  }

  async function send() {
    const t = text.trim();
    if (!t) return;
    if (editing) {
      const target = editing;
      setEditing(null);
      setText('');
      setMsgs((m) => m.map((x) => (x.id === target.id ? { ...x, text: t, edited: true } : x)));
      const r = await api<{ message: Msg }>(`/api/groupes/${groupId}/messages/${target.id}`, 'PATCH', { text: t });
      if (r.ok) setMsgs((m) => m.map((x) => (x.id === target.id ? r.data.message : x)));
      else {
        setMsgs((m) => m.map((x) => (x.id === target.id ? target : x)));
        flash(r.error);
      }
      return;
    }
    const tmp: Msg = { id: 'tmp-' + Date.now(), text: t, at: new Date().toISOString(), author: 'Vous', authorKey: me, pending: true };
    setMsgs((m) => [...m, tmp]);
    setText('');
    stick.current = true;
    area.current?.focus();
    const r = await api<{ message: Msg }>(`/api/groupes/${groupId}/messages`, 'POST', { text: t });
    setMsgs((m) => {
      if (!r.ok) return m.map((x) => (x.id === tmp.id ? { ...x, pending: false, failed: true } : x));
      const without = m.filter((x) => x.id !== tmp.id);
      return without.some((x) => x.id === r.data.message.id) ? without : merge(without, [r.data.message], me);
    });
  }

  async function sendVoice(blob: Blob, seconds: number) {
    const tmp: Msg = { id: 'tmp-' + Date.now(), text: '', at: new Date().toISOString(), author: 'Vous', authorKey: me, audio: { url: URL.createObjectURL(blob), seconds }, pending: true };
    setMsgs((m) => [...m, tmp]);
    stick.current = true;
    const fd = new FormData();
    fd.append('audio', blob, 'vocal');
    fd.append('seconds', String(seconds));
    let real: Msg | null = null;
    let error = '';
    try {
      const res = await fetch(`/api/groupes/${groupId}/vocal`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) real = data.message;
      else error = data.error || 'Le message vocal n’a pas été envoyé.';
    } catch {
      error = 'Pas de connexion. Le message vocal n’a pas été envoyé.';
    }
    setMsgs((m) => {
      if (!real) return m.map((x) => (x.id === tmp.id ? { ...x, pending: false, failed: true } : x));
      // On garde le son local (déjà chargé) pour une écoute immédiate
      const keep = { ...real, audio: real.audio ? { ...real.audio, url: tmp.audio!.url } : real.audio };
      const without = m.filter((x) => x.id !== tmp.id && x.id !== real!.id);
      return merge(without, [keep], me);
    });
    if (error) flash(error);
  }

  async function remove(m: Msg) {
    setMenu(null);
    if (!confirm('Supprimer ce message pour tout le monde ?')) return;
    const before = m;
    setMsgs((cur) => cur.map((x) => (x.id === m.id ? { ...x, deleted: true, text: '', audio: undefined, edited: false } : x)));
    const r = await api(`/api/groupes/${groupId}/messages/${m.id}`, 'DELETE');
    if (!r.ok) {
      setMsgs((cur) => cur.map((x) => (x.id === m.id ? before : x)));
      flash(r.error);
    }
  }

  function startEdit(m: Msg) {
    setMenu(null);
    setEditing(m);
    setText(m.text);
    setTimeout(() => {
      const el = area.current;
      if (!el) return;
      el.focus();
      el.style.height = 'auto';
      el.style.height = Math.min(140, el.scrollHeight) + 'px';
    }, 0);
  }

  const canEdit = (m: Msg) => m.authorKey === me && !m.audio && !m.deleted && !m.pending && Date.now() - Date.parse(m.at) < EDIT_WINDOW_MS;
  const canDelete = (m: Msg) => !m.deleted && !m.pending && m.authorKey !== 'systeme' && (m.authorKey === me || isAdmin);

  return (
    <div className="chat">
      <header className="appbar wa-room-bar" style={{ paddingLeft: 4 }}>
        <Link href={`/e/${slug}/discussions`} className="icon-btn" aria-label="Retour aux discussions">
          <Icon name="back" />
        </Link>
        <button className="wa-room-title" onClick={() => setShowInfo(true)}>
          <span className="avatar sm" style={{ background: avatarColor(name) }}>
            {initials(name)}
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="t">{name}</span>
            <span className="s">{initial.members} membres, touchez pour voir le groupe</span>
          </span>
        </button>
      </header>

      <div className="chat-scroll" ref={scroller} onScroll={onScroll}>
        {hasMore && (
          <div className="chat-day">
            <button className="wa-older" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? 'Chargement…' : 'Messages plus anciens'}
            </button>
          </div>
        )}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const newDay = !prev || dayOf(prev.at) !== dayOf(m.at);
          const day = newDay ? (
            <div className="chat-day" key={'d' + m.id}>
              <span>{dayOf(m.at)}</span>
            </div>
          ) : null;
          if (m.authorKey === 'systeme') {
            return (
              <div key={m.id}>
                {day}
                <div className="chat-sys">
                  <span>{m.text}</span>
                </div>
              </div>
            );
          }
          const mine = m.authorKey === me;
          const first = newDay || !prev || prev.authorKey !== m.authorKey || prev.authorKey === 'systeme';
          return (
            <div key={m.id}>
              {day}
              <div className={`msg${mine ? ' me' : ''}${first ? ' first' : ''}`}>
                <Bubble m={m} mine={mine} first={first} onMenu={() => (canEdit(m) || canDelete(m) || (!m.deleted && m.text) ? setMenu(m) : undefined)} />
              </div>
            </div>
          );
        })}
      </div>

      {recording ? (
        <Recorder
          onCancel={() => setRecording(false)}
          onDone={(blob, s) => {
            setRecording(false);
            sendVoice(blob, s);
          }}
        />
      ) : (
        <div>
          {editing && (
            <div className="wa-editbar">
              <span className="bar" />
              <span className="grow">
                <b>Modifier le message</b>
                <span>{editing.text}</span>
              </span>
              <button
                className="icon-btn"
                aria-label="Annuler la modification"
                onClick={() => {
                  setEditing(null);
                  setText('');
                }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              ref={area}
              rows={1}
              value={text}
              placeholder="Message"
              aria-label="Écrire un message"
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 721px)').matches) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            {text.trim() || editing ? (
              <button className="send" aria-label={editing ? 'Enregistrer la modification' : 'Envoyer'} disabled={!text.trim()}>
                <Icon name={editing ? 'check' : 'send'} size={22} stroke={2} />
              </button>
            ) : (
              <button type="button" className="send" aria-label="Enregistrer un message vocal" onClick={() => setRecording(true)}>
                <MicIcon />
              </button>
            )}
          </form>
        </div>
      )}

      {menu && (
        <div className="sheet-bg" onClick={() => setMenu(null)}>
          <div className="sheet wa-menu" role="dialog" aria-modal="true" aria-label="Actions sur le message" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <p className="wa-menu-preview">{menu.deleted ? 'Message supprimé' : menu.audio ? `Message vocal, ${clock(menu.audio.seconds)}` : menu.text}</p>
            {!menu.deleted && menu.text && (
              <button
                onClick={async () => {
                  const okCopy = await copy(menu.text);
                  setMenu(null);
                  flash(okCopy ? 'Message copié' : 'Copie impossible');
                }}
              >
                Copier
              </button>
            )}
            {canEdit(menu) && <button onClick={() => startEdit(menu)}>Modifier</button>}
            {canDelete(menu) && (
              <button className="danger" onClick={() => remove(menu)}>
                Supprimer pour tout le monde
              </button>
            )}
            <button className="quiet" onClick={() => setMenu(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {toast && <div className="wa-toast">{toast}</div>}

      {showInfo && (
        <GroupInfo
          slug={slug}
          groupId={groupId}
          me={me}
          onClose={() => setShowInfo(false)}
          onChange={() => refresh()}
          onGone={() => router.replace(`/e/${slug}/discussions`)}
        />
      )}
    </div>
  );
}

// ---------- Une bulle ----------

function Bubble({ m, mine, first, onMenu }: { m: Msg; mine: boolean; first: boolean; onMenu: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => {
    timer.current = setTimeout(() => {
      timer.current = null;
      if (navigator.vibrate) navigator.vibrate(15);
      onMenu();
    }, 450);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const time = m.failed ? 'Non envoyé' : m.pending ? 'Envoi…' : hhmm(m.at);
  return (
    <div
      className={`bubble${m.pending ? ' pending' : ''}${m.deleted ? ' deleted' : ''}${m.audio ? ' has-voice' : ''}`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => {
        e.preventDefault();
        stop();
        onMenu();
      }}
    >
      {first && !mine && <span className={`who name-colors-${colorIndex(m.authorKey)}`}>{m.author}</span>}
      {m.deleted ? (
        <span className="wa-deleted">
          <BlockIcon /> {mine ? 'Vous avez supprimé ce message' : 'Ce message a été supprimé'}
        </span>
      ) : m.audio ? (
        <VoiceNote src={m.audio.url} seconds={m.audio.seconds} mine={mine} id={m.id} />
      ) : (
        m.text
      )}
      <span className="t">
        {m.edited && <em>modifié </em>}
        {time}
      </span>
    </div>
  );
}

// ---------- Message vocal : enregistrement ----------

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  // audio/mp4 d'abord : lisible sur iPhone ET Android
  for (const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

const MAX_VOICE = 300; // 5 minutes

function Recorder({ onCancel, onDone }: { onCancel: () => void; onDone: (blob: Blob, seconds: number) => void }) {
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const rec = useRef<MediaRecorder | null>(null);
  const keep = useRef(false);
  const t0 = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const mime = pickMime();
        const r = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
        const parts: Blob[] = [];
        r.ondataavailable = (e) => e.data.size && parts.push(e.data);
        r.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const secs = Math.max(1, Math.round((Date.now() - t0.current) / 1000));
          if (keep.current && parts.length) done.current(new Blob(parts, { type: (r.mimeType || mime || 'audio/webm').split(';')[0] }), Math.min(MAX_VOICE, secs));
        };
        rec.current = r;
        r.start(500);
        t0.current = Date.now();
        timer = setInterval(() => {
          const s = (Date.now() - t0.current) / 1000;
          setSeconds(s);
          if (s >= MAX_VOICE) finish(true);
        }, 200);
      } catch {
        setError('Micro non autorisé. Autorisez le micro dans les réglages du navigateur.');
      }
    })();
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      if (rec.current?.state === 'recording') rec.current.stop();
    };
  }, []);

  function finish(send: boolean) {
    keep.current = send;
    if (rec.current?.state === 'recording') rec.current.stop();
    if (!send) onCancel();
  }

  return (
    <div className="composer wa-recorder" role="group" aria-label="Enregistrement d’un message vocal">
      <button type="button" className="rec-cancel" aria-label="Supprimer l’enregistrement" onClick={() => finish(false)}>
        <Icon name="trash" size={22} />
      </button>
      <div className="rec-bar">
        {error ? (
          <span className="small" style={{ color: 'var(--rouge)' }}>
            {error}
          </span>
        ) : (
          <>
            <span className="rec-dot" aria-hidden />
            <span className="rec-time">{clock(seconds)}</span>
            <span className="rec-wave" aria-hidden>
              {Array.from({ length: 18 }, (_, i) => (
                <i key={i} style={{ animationDelay: `${(i % 6) * 0.12}s` }} />
              ))}
            </span>
          </>
        )}
      </div>
      <button type="button" className="send" aria-label="Envoyer le message vocal" disabled={!!error || seconds < 0.8} onClick={() => finish(true)}>
        <Icon name="send" size={22} stroke={2} />
      </button>
    </div>
  );
}

// ---------- Message vocal : lecture ----------

/** Barres de l'onde, toujours les mêmes pour un même message */
function bars(id: string, n = 28) {
  let h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: n }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 25 + (h % 75);
  });
}

function VoiceNote({ src, seconds, mine, id }: { src: string; seconds: number; mine: boolean; id: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(1);
  const pct = Math.min(1, t / Math.max(1, seconds));
  const wave = bars(id);

  return (
    <span className={`wa-voice${mine ? ' mine' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
      <audio
        ref={ref}
        src={src}
        preload="none"
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setT(0);
        }}
      />
      <button
        type="button"
        className="pp"
        aria-label={playing ? 'Pause' : 'Écouter le message vocal'}
        onClick={() => {
          const a = ref.current!;
          if (a.paused) {
            document.querySelectorAll('audio').forEach((x) => x !== a && x.pause());
            a.playbackRate = speed;
            a.play().catch(() => setPlaying(false));
          } else a.pause();
        }}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden>
            <rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden>
            <path d="M3.5 1.5v11l9-5.5z" fill="currentColor" />
          </svg>
        )}
      </button>
      <span className="col">
        <span
          className="wave"
          onClick={(e) => {
            const a = ref.current;
            if (!a) return;
            const box = e.currentTarget.getBoundingClientRect();
            const target = ((e.clientX - box.left) / box.width) * (Number.isFinite(a.duration) && a.duration ? a.duration : seconds);
            a.currentTime = target;
            setT(target);
          }}
        >
          {wave.map((h, i) => (
            <i key={i} className={i / wave.length <= pct && (playing || t > 0) ? 'on' : ''} style={{ height: `${h}%` }} />
          ))}
        </span>
        <span className="meta">
          <span>{clock(playing || t ? t : seconds)}</span>
          {playing && (
            <button
              type="button"
              className="speed"
              onClick={() => {
                const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
                setSpeed(next);
                if (ref.current) ref.current.playbackRate = next;
              }}
            >
              {speed}×
            </button>
          )}
        </span>
      </span>
    </span>
  );
}

function MicIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden style={{ verticalAlign: '-2px' }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

// ---------- Fiche du groupe (chargée seulement quand on l'ouvre) ----------

function GroupInfo({ slug, groupId, me, onClose, onChange, onGone }: { slug: string; groupId: string; me: string; onClose: () => void; onChange: () => void; onGone: () => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await api<{ group: Info }>(`/api/groupes/${groupId}?infos=1`, 'GET');
    if (r.ok) {
      setInfo(r.data.group);
      setName(r.data.group.name);
    } else setError(r.error);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(b: Record<string, unknown>) {
    const r = await api(`/api/groupes/${groupId}`, 'PATCH', b);
    if (!r.ok) return setError(r.error);
    setError('');
    await load();
    onChange();
  }

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Informations du groupe" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {!info ? (
          <p className="muted small" style={{ textAlign: 'center', padding: 24 }}>
            {error || 'Chargement…'}
          </p>
        ) : adding ? (
          <>
            <div className="row between" style={{ marginBottom: 12 }}>
              <button className="text-btn" onClick={() => setAdding(false)}>
                Annuler
              </button>
              <b>Ajouter</b>
              <button
                className="text-btn"
                disabled={!toAdd.length}
                onClick={async () => {
                  await patch({ add: toAdd });
                  setToAdd([]);
                  setAdding(false);
                }}
              >
                Ajouter {toAdd.length || ''}
              </button>
            </div>
            <MemberPicker slug={slug} value={toAdd} onChange={setToAdd} exclude={info.members.map((m) => m.id)} />
          </>
        ) : (
          <div className="stack" style={{ ['--gap' as string]: '18px' }}>
            <div style={{ textAlign: 'center' }}>
              <span className="avatar" style={{ width: 84, height: 84, fontSize: 30, margin: '0 auto 12px', background: avatarColor(info.name) }}>
                {initials(info.name)}
              </span>
              {info.isAdmin ? (
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => name.trim() !== info.name && patch({ name })}
                  style={{ textAlign: 'center', fontWeight: 700, fontSize: 20 }}
                  aria-label="Nom du groupe"
                />
              ) : (
                <h3 style={{ margin: 0 }}>{info.name}</h3>
              )}
              {info.description && (
                <p className="muted small" style={{ marginTop: 8 }}>
                  {info.description}
                </p>
              )}
            </div>

            <div>
              <div className="row between" style={{ marginBottom: 4 }}>
                <b className="small muted">{info.members.length} membres</b>
                {info.isAdmin && (
                  <button className="text-btn" onClick={() => setAdding(true)}>
                    Ajouter des membres
                  </button>
                )}
              </div>
              <div className="rows">
                {info.members.map((m) => (
                  <div key={m.id} style={{ cursor: 'default' }}>
                    <span className="avatar sm" style={{ background: avatarColor(m.name) }}>
                      {initials(m.name)}
                    </span>
                    <span className="grow">
                      <span className="name" style={{ display: 'block', fontWeight: 600, fontSize: 16 }}>
                        {m.id === me ? 'Vous' : m.name}
                      </span>
                      {(m.owner || m.admin) && <span className="meta">{m.owner ? 'Organisateur' : 'Administrateur du groupe'}</span>}
                    </span>
                    {info.isAdmin && !m.owner && m.id !== me && (
                      <span className="row" style={{ gap: 2 }}>
                        <button className="text-btn" style={{ fontSize: 14 }} onClick={() => patch(m.admin ? { removeAdmin: [m.id] } : { makeAdmin: [m.id] })}>
                          {m.admin ? 'Retirer admin' : 'Admin'}
                        </button>
                        <button className="text-btn" style={{ fontSize: 14, color: 'var(--rouge)' }} onClick={() => confirm(`Retirer ${m.name} du groupe ?`) && patch({ remove: [m.id] })}>
                          Retirer
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="alert err small">{error}</p>}

            <div className="stack" style={{ ['--gap' as string]: '10px' }}>
              {!info.isOwner && (
                <button
                  className="btn danger block"
                  onClick={async () => {
                    if (!confirm('Quitter ce groupe ?')) return;
                    const r = await api(`/api/groupes/${info.id}`, 'PATCH', { leave: true });
                    if (r.ok) onGone();
                  }}
                >
                  Quitter le groupe
                </button>
              )}
              {(info.isOwner || info.isAdmin) && (
                <button
                  className="btn danger block"
                  onClick={async () => {
                    if (!confirm('Supprimer ce groupe et tous ses messages pour tout le monde ?')) return;
                    const r = await api(`/api/groupes/${info.id}`, 'DELETE');
                    if (r.ok) onGone();
                    else setError(r.error);
                  }}
                >
                  Supprimer le groupe
                </button>
              )}
              <button className="btn quiet block" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
