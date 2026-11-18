'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { api, copy } from '@/lib/client';
import type { Guest, Zone } from '@/lib/types';
import { QrImage } from './QrImage';

type Checkin = { guestId: string; zoneId: string; at: string };

export function GuestManager(props: {
  eventId: string;
  zones: Zone[];
  guests: Guest[];
  checkins: Checkin[];
  maxSeats: number;
  base: string;
  qr: boolean;
  photographer: boolean;
  inviteText: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'tous' | 'liste' | 'code' | 'bloques'>('tous');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const seats = props.guests.reduce((n, g) => n + g.seats, 0);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return props.guests.filter((g) => {
      if (filter === 'liste' && g.source !== 'liste') return false;
      if (filter === 'code' && g.source !== 'code') return false;
      if (filter === 'bloques' && !g.blocked) return false;
      return !s || g.name.toLowerCase().includes(s) || (g.phone || '').includes(s);
    });
  }, [props.guests, q, filter]);
  const open = props.guests.find((g) => g.id === openId) || null;
  const zoneName = (id: string) => props.zones.find((z) => z.id === id)?.name || '';

  return (
    <div className="stack" style={{ ['--gap' as string]: '24px' }}>
      <div className="row between">
        <div>
          <h2 style={{ fontSize: 36 }}>Invités</h2>
          <p className="muted">
            {props.guests.length} invitations, {seats} personnes sur {props.maxSeats} prévues par votre offre.
          </p>
        </div>
        <button className="btn" onClick={() => setAdding(true)}>
          Ajouter un invité
        </button>
      </div>

      <div className="row">
        <input
          className="input"
          style={{ maxWidth: 340, flex: '1 1 220px' }}
          placeholder="Rechercher un nom ou un numéro"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher un invité"
        />
        <div className="filters" style={{ overflowX: 'auto', flexWrap: 'nowrap', maxWidth: '100%' }}>
          {(
            [
              ['tous', 'Tous'],
              ['liste', 'Ajoutés par vous'],
              ['code', 'Venus avec le code'],
              ['bloques', 'Bloqués'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {props.guests.length === 0 ? (
        <div className="empty stack">
          <h3>Votre liste est vide</h3>
          <p>
            Ajoutez les familles une par une pour leur envoyer une invitation personnelle avec QR code, ou partagez
            simplement le lien général depuis l’aperçu.
          </p>
        </div>
      ) : (
        <div>
          {shown.map((g) => {
            const ins = props.checkins.filter((c) => c.guestId === g.id);
            return (
              <button key={g.id} className="guest-row" onClick={() => setOpenId(g.id)}>
                <span className="avatar sm" style={{ background: g.blocked ? 'var(--encre-3)' : 'var(--orange)' }}>
                  {g.seats > 1 ? g.seats : g.name.trim()[0]?.toUpperCase()}
                </span>
                <span className="grow">
                  <span className="name" style={{ display: 'block' }}>{g.name}</span>
                  <span className="meta" style={{ display: 'block' }}>
                    {g.seats} pers., {g.access.map(zoneName).filter(Boolean).join(', ').toLowerCase() || 'aucun accès'}
                    {g.role === 'photographe' ? ', photographe' : ''}
                    {g.source === 'code' ? ', venu avec le code' : ''}
                  </span>
                </span>
                <span className="pills">
                  {g.blocked ? (
                    <span className="pill no">Bloqué</span>
                  ) : g.rsvp === 'oui' ? (
                    <span className="pill ok">Présent</span>
                  ) : g.rsvp === 'non' ? (
                    <span className="pill">Absent</span>
                  ) : (
                    <span className="pill">{g.joinedAt ? 'A ouvert' : 'Pas encore'}</span>
                  )}
                  {props.qr && ins.length > 0 && <span className="pill warn">Entré</span>}
                </span>
              </button>
            );
          })}
          {shown.length === 0 && <p className="muted" style={{ padding: 20 }}>Aucun invité ne correspond.</p>}
        </div>
      )}

      {adding && (
        <AddGuest
          {...props}
          onClose={() => setAdding(false)}
          onDone={(id) => {
            setAdding(false);
            router.refresh();
            setOpenId(id);
          }}
        />
      )}
      {open && (
        <GuestDrawer
          key={open.id}
          guest={open}
          {...props}
          onClose={() => setOpenId(null)}
          onChange={() => router.refresh()}
        />
      )}
    </div>
  );
}

function AccessPicker({ zones, value, onChange }: { zones: Zone[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
      <legend style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Accès autorisés</legend>
      {zones.map((z) => (
        <label key={z.id} className="check">
          <input
            type="checkbox"
            checked={value.includes(z.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, z.id] : value.filter((x) => x !== z.id))}
          />
          <span>
            {z.name}
            {z.singleEntry && <span className="tiny"> (une seule entrée)</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function AddGuest(props: {
  eventId: string;
  zones: Zone[];
  photographer: boolean;
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [seats, setSeats] = useState(1);
  const [role, setRole] = useState<'invite' | 'photographe'>('invite');
  const [access, setAccess] = useState(props.zones.map((z) => z.id));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await api<{ id: string }>(`/api/espaces/${props.eventId}/invites`, 'POST', { name, phone, seats, access, role });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    props.onDone(r.data.id);
  }

  return (
    <Drawer onClose={props.onClose} title="Ajouter un invité">
      <form onSubmit={save} className="stack" style={{ ['--gap' as string]: '18px' }}>
        <label className="field">
          <span>Nom affiché</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Famille Coulibaly" required autoFocus />
        </label>
        <label className="field">
          <span>Téléphone WhatsApp</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="76 12 34 56" />
          <small>Pour lui envoyer son invitation en un clic.</small>
        </label>
        <label className="field">
          <span>Nombre de personnes sur cette invitation</span>
          <input type="number" min={1} max={20} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
        </label>
        <AccessPicker zones={props.zones} value={access} onChange={setAccess} />
        {props.photographer && (
          <label className="check">
            <input type="checkbox" checked={role === 'photographe'} onChange={(e) => setRole(e.target.checked ? 'photographe' : 'invite')} />
            <span>C’est le photographe ou le vidéaste (ses publications sont marquées comme officielles)</span>
          </label>
        )}
        {error && <p className="alert err">{error}</p>}
        <button className="btn block" disabled={busy}>
          {busy ? 'Ajout…' : 'Ajouter l’invité'}
        </button>
      </form>
    </Drawer>
  );
}

function GuestDrawer(props: {
  guest: Guest;
  eventId: string;
  zones: Zone[];
  checkins: Checkin[];
  base: string;
  qr: boolean;
  inviteText: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const g = props.guest;
  const [seats, setSeats] = useState(g.seats);
  const [access, setAccess] = useState(g.access);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const link = `${props.base}/invitation/${g.token}`;
  const waText = `Bonjour ${g.name}, voici votre invitation personnelle. ${props.inviteText} Gardez ce lien, il contient votre QR code pour l’entrée : ${link}`;
  const waNum = g.phone ? (g.phone.length === 8 ? '223' + g.phone : g.phone) : '';
  const ins = props.checkins.filter((c) => c.guestId === g.id);

  async function patch(body: Record<string, unknown>, done: string) {
    setError('');
    const r = await api(`/api/espaces/${props.eventId}/invites/${g.id}`, 'PATCH', body);
    if (!r.ok) return setError(r.error);
    setMsg(done);
    props.onChange();
  }

  return (
    <Drawer onClose={props.onClose} title={g.name}>
      <div className="stack" style={{ ['--gap' as string]: '24px' }}>
        {props.qr && (
          <div className="row" style={{ alignItems: 'flex-start', gap: 18 }}>
            <div style={{ width: 150, padding: 10, background: '#fff', border: '1.5px solid var(--trait)', borderRadius: 14 }}>
              <QrImage text={link} />
            </div>
            <div className="stack small" style={{ ['--gap' as string]: '8px', flex: 1 }}>
              <p className="muted">Ce QR code est présenté à l’entrée. Il est aussi dans l’invitation personnelle.</p>
              <QrImage text={link} download={`qr-${g.name}.png`} />
            </div>
          </div>
        )}
        <div className="stack" style={{ ['--gap' as string]: '10px' }}>
          <b>Invitation personnelle</b>
          <div className="row">
            <a className="btn sm" target="_blank" rel="noreferrer" href={`https://wa.me/${waNum}?text=${encodeURIComponent(waText)}`}>
              Envoyer sur WhatsApp
            </a>
            <button className="btn quiet sm" onClick={async () => (await copy(link)) && setMsg('Lien copié.')}>
              Copier le lien
            </button>
          </div>
        </div>

        <label className="field">
          <span>Nombre de personnes</span>
          <input type="number" min={1} max={20} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
        </label>
        <AccessPicker zones={props.zones} value={access} onChange={setAccess} />
        <div>
          <button className="btn sm" onClick={() => patch({ seats, access }, 'Modifications enregistrées.')}>
            Enregistrer
          </button>
        </div>

        {ins.length > 0 && (
          <div className="small">
            <b>Entrées</b>
            {ins.map((c) => (
              <p key={c.zoneId} className="muted">
                {props.zones.find((z) => z.id === c.zoneId)?.name} à{' '}
                {new Date(c.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            ))}
          </div>
        )}

        <div className="stack" style={{ ['--gap' as string]: '10px', borderTop: '1px solid var(--trait)', paddingTop: 20 }}>
          <label className="check">
            <input type="checkbox" checked={g.canPost} onChange={(e) => patch({ canPost: e.target.checked }, 'Autorisation mise à jour.')} />
            <span>Peut publier des photos et vidéos</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={!!g.canCreateGroups}
              onChange={(e) => patch({ canCreateGroups: e.target.checked }, e.target.checked ? 'Il peut maintenant créer des groupes de discussion.' : 'Autorisation retirée.')}
            />
            <span>Peut créer des groupes de discussion</span>
          </label>
          <div className="row">
            <button className="btn quiet sm" onClick={() => patch({ newToken: true }, 'Nouveau lien créé. L’ancien QR code ne fonctionne plus.')}>
              Remplacer le QR code
            </button>
            <button className="btn danger sm" onClick={() => patch({ blocked: !g.blocked }, g.blocked ? 'Invité débloqué.' : 'Invité bloqué.')}>
              {g.blocked ? 'Débloquer' : 'Bloquer'}
            </button>
            <button
              className="btn danger sm"
              onClick={async () => {
                if (!confirm(`Retirer ${g.name} de la liste ? Ses publications restent dans la galerie.`)) return;
                const r = await api(`/api/espaces/${props.eventId}/invites/${g.id}`, 'DELETE');
                if (!r.ok) return setError(r.error);
                props.onClose();
                props.onChange();
              }}
            >
              Retirer
            </button>
          </div>
        </div>
        {msg && <p className="alert ok small">{msg}</p>}
        {error && <p className="alert err small">{error}</p>}
      </div>
    </Drawer>
  );
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="drawer-bg" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 30 }}>{title}</h3>
          <button className="btn quiet sm" onClick={onClose}>
            Fermer
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
