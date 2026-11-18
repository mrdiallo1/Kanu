import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { CreateWizard } from '@/components/CreateWizard';
import { currentUser } from '@/lib/auth';
import { PLANS, type PlanId } from '@/config/plans';

export const metadata = { title: 'Créer un espace' };

export default async function Page({ searchParams }: { searchParams: Promise<{ offre?: string }> }) {
  const { offre } = await searchParams;
  const user = await currentUser();
  if (!user) {
    redirect(`/inscription?suite=${encodeURIComponent('/creer' + (offre ? `?offre=${offre}` : ''))}`);
  }
  const plan: PlanId = offre && offre in PLANS ? (offre as PlanId) : 'classique';
  return (
    <>
      <SiteHeader />
      <main className="wizard">
        <div className="narrow">
          <CreateWizard initialPlan={plan} />
        </div>
      </main>
    </>
  );
}
