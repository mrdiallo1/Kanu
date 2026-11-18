import * as db from '@/lib/db';
import { owned } from '@/lib/page';
import { feature } from '@/lib/access';
import { GuestManager } from '@/components/GuestManager';
import { PLANS } from '@/config/plans';
import { siteUrl } from '@/config/site';
import { longDate, eventTitle } from '@/lib/format';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { event } = await owned(params);
  const [guests, checkins] = await Promise.all([db.guests.list(event.id), db.checkins.list(event.id)]);
  return (
    <GuestManager
      eventId={event.id}
      zones={event.zones}
      guests={guests}
      checkins={checkins.map((c) => ({ guestId: c.guestId, zoneId: c.zoneId, at: c.at }))}
      maxSeats={PLANS[event.plan].maxGuests}
      base={siteUrl()}
      qr={feature(event, 'qrCodes')}
      photographer={feature(event, 'photographe')}
      inviteText={`${eventTitle(event)}, ${longDate(event.date).toLowerCase()}.`}
    />
  );
}
