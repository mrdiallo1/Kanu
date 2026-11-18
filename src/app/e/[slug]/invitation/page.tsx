import { notFound } from 'next/navigation';
import * as db from '@/lib/db';
import { space } from '@/lib/space';
import { feature } from '@/lib/access';
import { personalLink } from '@/lib/events';
import { qrSvg } from '@/lib/qr';
import { longDate, typeLabel } from '@/lib/format';
import { Ticket } from '@/components/Ticket';
import { QrImage } from '@/components/QrImage';

export const metadata = { title: 'Mon invitation' };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { event, viewer } = await space(params);
  if (viewer.kind !== 'guest' || !feature(event, 'qrCodes')) notFound();
  const guest = (await db.guests.byId(viewer.guest.id))!;
  const link = personalLink(guest);
  const svg = await qrSvg(link);
  const zones = event.zones.filter((z) => guest.access.includes(z.id)).map((z) => z.name.toLowerCase());
  return (
    <>
      <header className="appbar">
        <h1>Mon invitation</h1>
      </header>
      <main className="wrap stack" style={{ ['--gap' as string]: '20px', maxWidth: 860, paddingTop: 18 }}>
        <Ticket
          kind={typeLabel(event.type)}
          names={event.type === 'bapteme' ? [event.babyName || 'Bébé'] : [event.hostA, `& ${event.hostB}`]}
          date={`${longDate(event.date)}, ${event.time.replace(':', ' h ')}`}
          place={event.receptionPlace || event.ceremonyPlace}
          qr={<div dangerouslySetInnerHTML={{ __html: svg }} />}
          guestName={guest.name}
          guestLine={`${guest.seats} personne${guest.seats > 1 ? 's' : ''}${zones.length ? `, ${zones.join(' et ')}` : ''}`}
        />
        <p className="muted">
          Présentez ce QR code à l’entrée. Il est personnel : une fois scanné, il ne permet pas une deuxième entrée au même endroit.
          Enregistrez l’image pour la montrer même sans réseau.
        </p>
        <div>
          <QrImage text={link} download={`invitation-${guest.name}.png`} />
        </div>
      </main>
    </>
  );
}
