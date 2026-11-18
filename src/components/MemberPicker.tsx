'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { Icon } from './Icon';
import { avatarColor, initials } from './ChatList';

export function MemberPicker({ slug, value, onChange, exclude = [] }: { slug: string; value: string[]; onChange: (v: string[]) => void; exclude?: string[] }) {
  const [all, setAll] = useState<{ id: string; name: string }[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    api<{ guests: { id: string; name: string }[] }>(`/api/e/${slug}/membres`, 'GET').then((r) => setAll(r.ok ? r.data.guests : []));
  }, [slug]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (all || []).filter((g) => !exclude.includes(g.id) && (!s || g.name.toLowerCase().includes(s)));
  }, [all, q, exclude]);

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div>
      <input className="input" placeholder="Rechercher un invité" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
      {all === null ? (
        <p className="muted small" style={{ padding: 12 }}>
          Chargement…
        </p>
      ) : list.length === 0 ? (
        <p className="muted small" style={{ padding: 12 }}>
          {all.length === 0 ? 'Aucun invité pour l’instant. Ils apparaîtront ici dès qu’ils auront rejoint l’espace.' : 'Personne ne correspond.'}
        </p>
      ) : (
        <div className="rows" style={{ borderTop: 0 }}>
          {list.map((g) => {
            const on = value.includes(g.id);
            return (
              <button key={g.id} onClick={() => toggle(g.id)} aria-pressed={on}>
                <span className="avatar sm" style={{ background: avatarColor(g.name) }}>
                  {initials(g.name)}
                </span>
                <span className="grow name" style={{ fontWeight: 550 }}>
                  {g.name}
                </span>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    border: on ? 0 : '2px solid var(--trait)',
                    background: on ? 'var(--orange-fonce)' : 'transparent',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {on && <Icon name="check" size={15} stroke={3} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
