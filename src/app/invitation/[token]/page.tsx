import Link from 'next/link';
import type { Metadata } from 'next';
import { invitationPreview } from '@/lib/preview';
import * as db from '@/lib/db';
import { Logo } from '@/components/Logo';
import { Ticket } from '@/components/Ticket';
import { EnterButton } from '@/components/EnterButton';
import { Rsvp } from '@/components/Rsvp';
import { QrImage } from '@/components/QrImage';
import { qrSvg } from '@/lib/qr';
import { personalLink } from '@/lib/events';
import { eventTitle, longDate, typeLabel } from '@/lib/format';
import { feature } from '@/lib/access';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const guest = await db.guests.byToken(token);
  const event = guest ? await db.events.byId(guest.eventId) : null;
  return event ? invitationPreview(event) : { title: 'Invitation', robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await db.guests.byToken(token);
  const event = guest ? await db.events.byId(guest.eventId) : null;

  if (!guest || !event || guest.blocked || event.status === 'suspendu' || event.status === 'brouillon') {
    return (
      <main className="narrow" style={{ padding: '64px 0' }}>
        <Logo />
        <h1 style={{ fontSize: 44, marginTop: 40 }}>
          {token === 'exemple' ? 'Ceci est un exemple d’invitation' : 'Cette invitation n’est plus valable'}
        </h1>
        <p className="muted" style={{ marginTop: 14 }}>
          {token === 'exemple'
            ? 'Quand vous créez votre espace, chaque invité reçoit un lien comme celui-ci, avec son QR code personnel.'
            : 'Le lien a peut-être été remplacé par les organisateurs. Demandez-leur de vous le renvoyer.'}
        </p>
        <div style={{ marginTop: 28 }}>
          <Link href="/" className="btn">
            Découvrir
          </Link>
        </div>
      </main>
    );
  }

  const link = personalLink(guest);
  const svg = await qrSvg(link);
  const zones = event.zones.filter((z) => guest.access.includes(z.id)).map((z) => z.name.toLowerCase());
  const withQr = feature(event, 'qrCodes');

  return (
    <main className="wrap" style={{ padding: '28px 0 80px', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <Logo />
      </div>
      <div className="stack" style={{ ['--gap' as string]: '28px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 52px)' }}>{guest.name}, vous êtes invités</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            {eventTitle(event)}, {longDate(event.date).toLowerCase()}.
          </p>
        </div>
        <Ticket
          kind={typeLabel(event.type)}
          names={event.type === 'bapteme' ? [event.babyName || 'Bébé'] : [event.hostA, `& ${event.hostB}`]}
          date={`${longDate(event.date)}, ${event.time.replace(':', ' h ')}`}
          place={event.receptionPlace || event.ceremonyPlace}
          qr={withQr ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <div style={{ color: 'var(--encre)', fontSize: 14, padding: 6 }}>Programme, photos et livre d’or dans l’espace</div>}
          guestName={guest.name}
          guestLine={`${guest.seats} personne${guest.seats > 1 ? 's' : ''}${zones.length ? `, ${zones.join(' et ')}` : ''}`}
        />
        {withQr && (
          <p className="muted" style={{ maxWidth: '60ch' }}>
            Gardez ce lien : le QR code sera scanné à l’entrée. Vous pouvez aussi enregistrer l’image et la montrer hors
            connexion.
          </p>
        )}
        <div className="row">
          <EnterButton token={token} />
          {withQr && <QrImage text={link} download={`invitation-${guest.name}.png`} />}
        </div>
        <Rsvp token={token} current={guest.rsvp} />
      </div>
    </main>
  );
}
