import { SiteHeader } from '@/components/SiteHeader';
import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: 'Se connecter' };

export default async function Page({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  const next = suite?.startsWith('/') ? suite : '/tableau';
  return (
    <>
      <SiteHeader />
      <main className="auth">
        <div className="auth-side">
          <p>Retrouvez vos invités, vos photos et votre livre d’or.</p>
        </div>
        <div className="auth-form">
          <AuthForm mode="connexion" next={next} />
        </div>
      </main>
    </>
  );
}
