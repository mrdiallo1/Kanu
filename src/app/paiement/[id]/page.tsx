import { notFound, redirect } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { PayForm } from '@/components/PayForm';
import { ownerOf } from '@/lib/auth';
import { eventTitle, fcfa, longDate } from '@/lib/format';
import { PLANS } from '@/config/plans';

export const metadata = { title: 'Paiement' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownerOf(id);
  if (!own) notFound();
  const { event } = own;
  if (event.status !== 'brouillon') redirect(`/tableau/${event.id}`);
  const plan = PLANS[event.plan];
  return (
    <>
      <SiteHeader />
      <main className="wizard">
        <div className="narrow stack" style={{ ['--gap' as string]: '28px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(38px, 6vw, 60px)' }}>Paiement</h1>
            <p className="muted" style={{ marginTop: 10 }}>
              {eventTitle(event)}, {longDate(event.date).toLowerCase()}.
            </p>
          </div>
          <div className="panel sand row between">
            <div>
              <b>Offre {plan.name}</b>
              <p className="small muted">
                {plan.maxGuests} invités, {plan.storageGb} Go, {plan.retentionDays} jours après la fête
              </p>
            </div>
            <b style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: '-0.03em' }}>{fcfa(plan.price)}</b>
          </div>
          <PayForm eventId={event.id} amount={fcfa(plan.price)} simulation={process.env.PAYMENT_MODE === 'simulation'} />
        </div>
      </main>
    </>
  );
}
