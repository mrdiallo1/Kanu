'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Icon } from './Icon';
import { MemberPicker } from './MemberPicker';

export interface GroupSummary {
  id: string;
  name: string;
  description: string;
  members: number;
  isAdmin: boolean;
  last: { text: string; author: string; mine: boolean; at: string } | null;
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

export function ChatList({ slug, initial, canCreate, owner }: { slug: string; initial: GroupSummary[]; canCreate: boolean; owner: boolean }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initial);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setInterval(async () => {
      const r = await api<{ groups: GroupSummary[] }>(`/api/e/${slug}/groupes`, 'GET');
      if (r.ok) setGroups(r.data.groups);
    }, 8000);
    return () => clearInterval(t);
  }, [slug]);

  return (
    <>
      <header className="appbar">
        <h1 style={{ fontSize: 26 }}>Discussions</h1>
        {canCreate && (
          <button className="icon-btn orange" onClick={() => setCreating(true)} aria-label="Nouveau groupe">
            <Icon name="plus" size={26} stroke={2.2} />
          </button>
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
      ) : (
        <div style={{ paddingTop: 6 }}>
          {groups.map((g) => (
            <Link key={g.id} href={`/e/${slug}/discussions/${g.id}`} className="chat-row">
              <span className="avatar" style={{ background: avatarColor(g.name) }}>
                {initials(g.name)}
              </span>
              <span className="body">
                <span className="top">
                  <span className="name">{g.name}</span>
                  {g.last && <time className={g.unread ? 'new' : ''}>{shortTime(g.last.at)}</time>}
                </span>
                <span className="bottom">
                  <span className="last">
                    {g.last ? (g.last.author === 'Kanu' ? g.last.text : `${g.last.mine ? 'Vous' : g.last.author.split(' ')[0]} : ${g.last.text}`) : `${g.members} membres`}
                  </span>
                  {g.unread > 0 && <span className="badge">{g.unread}</span>}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {owner && groups.length > 0 && (
        <p className="tiny" style={{ padding: '18px 16px' }}>
          Pour qu’un invité puisse créer ses propres groupes, autorisez-le depuis sa fiche dans Gérer, Invités.
        </p>
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
    </>
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
