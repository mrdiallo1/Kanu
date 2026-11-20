'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { Icon } from './Icon';
import './chat.css';
import { MemberPicker } from './MemberPicker';

export interface GroupSummary {
  id: string;
  name: string;
  description: string;
  members: number;
  isAdmin: boolean;
  last: { kind: 'texte' | 'vocal' | 'supprime' | 'systeme'; text: string; author: string; mine: boolean; seconds?: number; at: string } | null;
  unread: number;
  updatedAt: string;
}

export const initials = (s: string) =>
  s
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '·';

const AV_COLORS = ['#FF5A00', '#21140D', '#C2410C', '#0F766E', '#7C3AED', '#BE123C'];
export const avatarColor = (s: string) => AV_COLORS[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % AV_COLORS.length];

export function shortTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const y = new Date();
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Hier';
  if (now.getTime() - d.getTime() < 6 * 86400000) return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Aperçu du dernier message, comme dans la liste de WhatsApp */
function Preview({ g }: { g: GroupSummary }) {
  const l = g.last;
  if (!l) return <span className="wa-prev muted-i">{g.members} membres</span>;
  const who = l.kind === 'systeme' ? '' : l.mine ? 'Vous : ' : `${l.author.split(' ')[0]} : `;
  if (l.kind === 'supprime')
    return (
      <span className="wa-prev muted-i">
        {who}
        <BlockIcon /> Message supprimé
      </span>
    );
  if (l.kind === 'vocal')
    return (
      <span className="wa-prev">
        {who}
        <MicIcon /> Message vocal{l.seconds ? ` (${clock(l.seconds)})` : ''}
      </span>
    );
  return (
    <span className="wa-prev">
      {who}
      {l.text}
    </span>
  );
}

export function ChatList({ slug, initial, canCreate, owner }: { slug: string; initial: GroupSummary[]; canCreate: boolean; owner: boolean }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'tous' | 'non-lus'>('tous');

  // Mise à jour toutes les 5 s quand l'écran est affiché (une seule lecture rapide côté serveur)
  useEffect(() => {
    const load = async () => {
      if (document.hidden) return;
      const r = await api<{ groups: GroupSummary[] }>(`/api/e/${slug}/groupes`, 'GET');
      if (r.ok) setGroups(r.data.groups);
    };
    const t = setInterval(load, 5000);
    document.addEventListener('visibilitychange', load);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', load);
    };
  }, [slug]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return groups.filter((g) => (!s || g.name.toLowerCase().includes(s)) && (filter === 'tous' || g.unread > 0));
  }, [groups, q, filter]);
  const unreadGroups = groups.filter((g) => g.unread > 0).length;

  return (
    <div className="wa-list">
      <header className="wa-head">
        <h1>Discussions</h1>
        {groups.length > 0 && (
          <>
            <label className="wa-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un groupe" aria-label="Rechercher un groupe" />
            </label>
            <div className="wa-chips" role="group" aria-label="Filtrer les groupes">
              <button aria-pressed={filter === 'tous'} onClick={() => setFilter('tous')}>
                Tous
              </button>
              <button aria-pressed={filter === 'non-lus'} onClick={() => setFilter('non-lus')}>
                Non lus{unreadGroups ? ` ${unreadGroups}` : ''}
              </button>
            </div>
          </>
        )}
      </header>

      {groups.length === 0 ? (
        <div style={{ padding: '56px 24px', textAlign: 'center' }} className="stack">
          <h3 style={{ fontSize: 26 }}>Pas encore de groupe</h3>
          <p className="muted">
            {canCreate
              ? 'Créez un groupe pour la famille, les amis ou l’organisation, et choisissez qui en fait partie.'
              : 'Quand les organisateurs vous ajouteront à un groupe, il apparaîtra ici.'}
          </p>
          {canCreate && (
            <div>
              <button className="btn" onClick={() => setCreating(true)}>
                Créer un groupe
              </button>
            </div>
          )}
        </div>
      ) : shown.length === 0 ? (
        <p className="muted small" style={{ padding: '28px 20px', textAlign: 'center' }}>
          {filter === 'non-lus' && !q ? 'Aucun message non lu.' : 'Aucun groupe ne correspond.'}
        </p>
      ) : (
        <ul className="wa-rows">
          {shown.map((g) => (
            <li key={g.id}>
              <Link href={`/e/${slug}/discussions/${g.id}`} className="wa-row" prefetch>
                <span className="wa-av" style={{ background: avatarColor(g.name) }}>
                  {initials(g.name)}
                </span>
                <span className="wa-body">
                  <span className="wa-line">
                    <span className="wa-name">{g.name}</span>
                    {g.last && <time className={g.unread ? 'new' : ''}>{shortTime(g.last.at)}</time>}
                  </span>
                  <span className="wa-line">
                    <Preview g={g} />
                    {g.unread > 0 && <span className="wa-badge">{g.unread > 99 ? '99+' : g.unread}</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {owner && groups.length > 0 && (
        <p className="tiny" style={{ padding: '18px 16px 90px' }}>
          Pour qu’un invité puisse créer ses propres groupes, autorisez-le depuis sa fiche dans Gérer, Invités.
        </p>
      )}

      {canCreate && groups.length > 0 && (
        <button className="wa-fab" onClick={() => setCreating(true)} aria-label="Nouveau groupe">
          <Icon name="plus" size={28} stroke={2.2} />
        </button>
      )}

      {creating && (
        <NewGroup
          slug={slug}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/e/${slug}/discussions/${id}`);
          }}
        />
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden style={{ verticalAlign: '-2px', color: 'var(--orange-fonce)' }}>
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

function NewGroup({ slug, onClose, onCreated }: { slug: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [step, setStep] = useState<'membres' | 'nom'>('membres');
  const [members, setMembers] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const r = await api<{ id: string }>(`/api/e/${slug}/groupes`, 'POST', { name, description, memberIds: members });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onCreated(r.data.id);
  }

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Nouveau groupe" onClick={(e) => e.stopPropagation()} style={{ minHeight: '70vh' }}>
        <div className="grab" />
        {step === 'membres' ? (
          <>
            <div className="row between" style={{ marginBottom: 12 }}>
              <button className="text-btn" onClick={onClose}>
                Annuler
              </button>
              <b>Ajouter des membres</b>
              <button className="text-btn" onClick={() => setStep('nom')}>
                Suivant
              </button>
            </div>
            <MemberPicker slug={slug} value={members} onChange={setMembers} />
          </>
        ) : (
          <div className="stack" style={{ ['--gap' as string]: '16px' }}>
            <div className="row between">
              <button className="text-btn" onClick={() => setStep('membres')}>
                Retour
              </button>
              <b>Nouveau groupe</b>
              <span style={{ width: 60 }} />
            </div>
            <label className="field">
              <span>Nom du groupe</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Famille de la mariée" autoFocus maxLength={60} />
            </label>
            <label className="field">
              <span>Description (facultatif)</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pour organiser le cortège" maxLength={300} />
            </label>
            <p className="small muted">
              {members.length} membre{members.length > 1 ? 's' : ''} sélectionné{members.length > 1 ? 's' : ''}. Les organisateurs voient tous les groupes.
            </p>
            {error && <p className="alert err small">{error}</p>}
            <button className="btn block" disabled={busy || name.trim().length < 2} onClick={create}>
              {busy ? 'Création…' : 'Créer le groupe'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
