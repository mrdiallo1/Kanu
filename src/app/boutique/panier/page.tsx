import * as db from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { eventTitle } from '@/lib/format';
import { ShopBar } from '@/components/shop/ShopBar';
import { Cart } from '@/components/shop/Cart';

export const metadata = { title: 'Panier' };

export default async function Page() {
  const user = await currentUser();
  const events = user ? (await db.events.byOwner(user.id)).filter((e) => e.status !== 'brouillon') : [];
  return (
    <>
      <ShopBar title="Panier" back="/boutique" />
      <Cart
        user={user ? { name: user.name, phone: user.phone } : null}
        events={events.map((e) => ({ id: e.id, title: eventTitle(e), date: e.date, place: e.receptionPlace || e.ceremonyPlace }))}
      />
    </>
  );
}
