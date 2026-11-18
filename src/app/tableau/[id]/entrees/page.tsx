import { notFound } from 'next/navigation';
import * as db from '@/lib/db';
import { owned } from '@/lib/page';
import { feature } from '@/lib/access';
import { clock } from '@/lib/format';
import { siteUrl } from '@/config/site';
import { AgentManager } from '@/components/AgentManager';
import { ZoneEditor } from '@/components/ZoneEditor';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { event } = await owned(params);
  if (!feature(event, 'qrCodes')) notFound();
  const [guests, checkins, agents] = await Promise.all([
    db.guests.list(event.id),
    db.checkins.list(event.id),
    db.agents.list(event.id),
  ]);
  const byId = new Map(guests.map((g) => [g.id, g]));
  const agentName = new Map(agents.map((a) => [a.id, a.name]));

  return (
    <div className="stack" style={{ ['--gap' as string]: '40px' }}>
      <div>
        <h2 style={{ fontSize: 36, marginBottom: 20 }}>Le jour J</h2>
        <div className="figures" style={{ gridTemplateColumns: `repeat(${Math.min(4, event.zones.length * 2)}, 1fr)` }}>
          {event.zones.map((z) => {
            const allowed = guests.filter((g) => g.access.includes(z.id) && !g.blocked);
            const allowedSeats = allowed.reduce((n, g) => n + g.seats, 0);
            const inside = checkins.filter((c) => c.zoneId === z.id);
            const insideSeats = inside.reduce((n, c) => n + (byId.get(c.guestId)?.seats || 1), 0);
            return [
              <div key={z.id + 'a'}>
                <b>
                  {insideSeats}
                  <span className="muted" style={{ fontSize: 20 }}>/{allowedSeats}</span>
                </b>
                entrés, {z.name.toLowerCase()}
              </div>,
              <div key={z.id + 'b'}>
                <b>{Math.max(0, allowedSeats - insideSeats)}</b>encore attendus, {z.name.toLowerCase()}
              </div>,
            ];
          })}
        </div>
      </div>

      <div className="cols" style={{ ['--n' as string]: 2 }}>
        <AgentManager eventId={event.id} agents={agents} scanUrl={`${siteUrl()}/controle/${event.slug}`} />
        <ZoneEditor eventId={event.id} zones={event.zones} multi={feature(event, 'plusieursEspaces')} />
      </div>

      <div>
        <h3 style={{ marginBottom: 14 }}>Dernières entrées</h3>
        {checkins.length === 0 ? (
          <p className="muted">Les entrées apparaîtront ici dès que les agents commenceront à scanner.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Heure</th>
                  <th>Invité</th>
                  <th>Personnes</th>
                  <th>Accès</th>
                  <th>Contrôlé par</th>
                </tr>
              </thead>
              <tbody>
                {checkins.slice(0, 200).map((c) => (
                  <tr key={c.id}>
                    <td>{clock(c.at)}</td>
                    <td>{byId.get(c.guestId)?.name || 'Invité retiré'}</td>
                    <td>{byId.get(c.guestId)?.seats || 1}</td>
                    <td>{event.zones.find((z) => z.id === c.zoneId)?.name}</td>
                    <td className="muted">{agentName.get(c.agentId) || 'Agent retiré'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
