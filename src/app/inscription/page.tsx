import { SiteHeader } from '@/components/SiteHeader';
import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: 'Créer un compte' };

export default async function Page({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  const next = suite?.startsWith('/') ? suite : '/tableau';
  return (
    <>
      <SiteHeader />
      <main className="auth">
        <div className="auth-side">
          <p>Un compte pour les organisateurs. Les invités entrent avec un simple lien.</p>
        </div>
        <div className="auth-form">
          <AuthForm mode="inscription" next={next} />
        </div>
      </main>
    </>
  );
}
