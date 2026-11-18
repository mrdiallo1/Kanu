'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { Icon } from './Icon';
import { MemberPicker } from './MemberPicker';
import { avatarColor, initials } from './ChatList';

interface Msg {
  id: string;
  text: string;
  at: string;
  author: string;
  authorKey: string;
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

export function ChatRoom({ slug, groupId, initialName }: { slug: string; groupId: string; initialName: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [me, setMe] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const lastAt = useRef('');

  const loadAll = useCallback(async () => {
    const r = await api<{ me: string; group: Info; messages: Msg[] }>(`/api/groupes/${groupId}`, 'GET');
    if (!r.ok) {
      router.replace(`/e/${slug}/discussions`);
      return;
    }
    setMe(r.data.me);
    setInfo(r.data.group);
    setMsgs(r.data.messages);
    lastAt.current = r.data.messages.at(-1)?.at || '';
    setLoaded(true);
  }, [groupId, router, slug]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Nouveaux messages toutes les 3 secondes
  useEffect(() => {
    if (!loaded) return;
    const t = setInterval(async () => {
      if (document.hidden) return;
      const r = await api<{ messages: Msg[] }>(`/api/groupes/${groupId}?apres=${encodeURIComponent(lastAt.current)}`, 'GET');
      if (r.ok && r.data.messages.length) {
        setMsgs((cur) => {
          const ids = new Set(cur.map((m) => m.id));
          const fresh = r.data.messages.filter((m) => !ids.has(m.id));
          return fresh.length ? [...cur.filter((m) => !m.pending || !fresh.some((f) => f.text === m.text && f.authorKey === me)), ...fresh] : cur;
        });
        lastAt.current = r.data.messages.at(-1)!.at;
        if (r.data.messages.some((m) => m.authorKey === 'systeme')) loadAll();
      }
    }, 3000);
    return () => clearInterval(t);
  }, [loaded, groupId, me, loadAll]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  function onScroll() {
    const el = scroller.current!;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  async function send() {
    const t = text.trim();
    if (!t) return;
    const tmp: Msg = { id: 'tmp-' + Date.now(), text: t, at: new Date().toISOString(), author: 'Vous', authorKey: me, pending: true };
    setMsgs((m) => [...m, tmp]);
    setText('');
    stick.current = true;
    area.current?.focus();
    const r = await api<{ id: string; at: string }>(`/api/groupes/${groupId}/messages`, 'POST', { text: t });
    setMsgs((m) => m.map((x) => (x.id === tmp.id ? (r.ok ? { ...x, id: r.data.id, at: r.data.at, pending: false } : { ...x, pending: false, failed: true }) : x)));
    if (r.ok && r.data.at > lastAt.current) lastAt.current = r.data.at;
  }

  const name = info?.name || initialName;

  return (
    <div className="chat">
      <header className="appbar" style={{ paddingLeft: 4 }}>
        <Link href={`/e/${slug}/discussions`} className="icon-btn" aria-label="Retour aux discussions">
          <Icon name="back" />
        </Link>
        <button onClick={() => setShowInfo(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'none', flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer', padding: 0, color: 'inherit' }}>
          <span className="avatar sm" style={{ background: avatarColor(name) }}>
            {initials(name)}
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="title" style={{ display: 'block', fontSize: 17 }}>
              {name}
            </span>
            <span className="sub" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {info ? info.members.map((m) => (m.id === me ? 'Vous' : m.name.split(' ')[0])).join(', ') : 'Touchez pour les infos du groupe'}
            </span>
          </span>
        </button>
      </header>

      <div className="chat-scroll" ref={scroller} onScroll={onScroll}>
        {!loaded && <p className="muted small" style={{ textAlign: 'center', padding: 20 }}>Chargement…</p>}
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
                <div className={`bubble${m.pending ? ' pending' : ''}`}>
                  {first && !mine && <span className={`who name-colors-${colorIndex(m.authorKey)}`}>{m.author}</span>}
                  {m.text}
                  <span className="t">{m.failed ? 'Non envoyé' : m.pending ? 'Envoi…' : hhmm(m.at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
        <button className="send" disabled={!text.trim()} aria-label="Envoyer">
          <Icon name="send" size={22} stroke={2} />
        </button>
      </form>

      {showInfo && info && (
        <GroupInfo
          slug={slug}
          info={info}
          me={me}
          onClose={() => setShowInfo(false)}
          onChange={() => loadAll()}
          onGone={() => router.replace(`/e/${slug}/discussions`)}
        />
      )}
    </div>
  );
}

function GroupInfo({ slug, info, me, onClose, onChange, onGone }: { slug: string; info: Info; me: string; onClose: () => void; onChange: () => void; onGone: () => void }) {
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [name, setName] = useState(info.name);
  const [error, setError] = useState('');

  async function patch(b: Record<string, unknown>) {
    const r = await api(`/api/groupes/${info.id}`, 'PATCH', b);
    if (!r.ok) return setError(r.error);
    setError('');
    onChange();
  }

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Informations du groupe" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {adding ? (
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
              {info.description && <p className="muted small" style={{ marginTop: 8 }}>{info.description}</p>}
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
