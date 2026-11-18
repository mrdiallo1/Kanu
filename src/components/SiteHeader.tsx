import Link from 'next/link';
import { currentUser, isAdmin } from '@/lib/auth';
import { Logo } from './Logo';
import { LogoutButton } from './LogoutButton';

export async function SiteHeader() {
  const user = await currentUser();
  return (
    <header className="top">
      <div className="wrap">
        <Logo />
        <nav aria-label="Navigation principale">
          {user ? (
            <>
              {isAdmin(user) && (
                <Link href="/admin" className="hide-m">
                  Administration
                </Link>
              )}
              <Link href="/boutique">Boutique</Link>
              <Link href="/tableau">Mes espaces</Link>
              <span className="hide-m">
                <LogoutButton />
              </span>
            </>
          ) : (
            <>
              <Link href="/boutique" className="hide-m">
                Boutique
              </Link>
              <Link href="/rejoindre" className="hide-m">
                J’ai un code
              </Link>
              <Link href="/connexion">Se connecter</Link>
              <Link href="/creer" className="btn sm">
                Créer mon espace
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
