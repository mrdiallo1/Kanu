import * as db from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { eventTitle } from '@/lib/format';
import { guestBuyers } from '@/lib/shop';
import { ShopBar } from '@/components/shop/ShopBar';
import { Cart } from '@/components/shop/Cart';

export const metadata = { title: 'Panier' };

export default async function Page() {
  const user = await currentUser();
  const owned = user ? (await db.events.byOwner(user.id)).filter((e) => e.status !== 'brouillon') : [];
  // Les invités peuvent aussi commander pour la fête où ils sont entrés
  const guests = await guestBuyers();
  const events = [
    ...owned.map((e) => ({ id: e.id, title: eventTitle(e), date: e.date, place: e.receptionPlace || e.ceremonyPlace })),
    ...guests.filter((g) => !owned.some((e) => e.id === g.event.id)).map((g) => g.event),
  ];
  const buyer = user ? { name: user.name, phone: user.phone } : guests[0] ? { name: guests[0].name, phone: guests[0].phone } : null;
  return (
    <>
      <ShopBar title="Panier" back="/boutique" />
      <Cart user={buyer} events={events} guestOnly={!user && guests.length > 0} />
    </>
  );
}
