'use client';

// Navigation du tableau de bord.
// Ordinateur : onglets en haut. Téléphone : barre du bas avec les 4 sections
// principales seulement (plus de bouton « Plus ») ; tout le reste est sur l'accueil.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

export interface DashTab {
  href: string;
  label: string;
  icon: string;
  main?: boolean; // affiché dans la barre du bas sur téléphone
}

export function DashTabs({ tabs }: { tabs: DashTab[] }) {
  const path = usePathname();
  const main = tabs.filter((t) => t.main);
  const isActive = (t: DashTab) => path === t.href;

  return (
    <>
      <nav className="tabs" aria-label="Sections de l’espace">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={isActive(t) ? 'page' : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      <nav className="bottom-nav only-m" style={{ ['--items' as string]: main.length }} aria-label="Navigation">
        {main.map((t) => (
          <Link key={t.href} href={t.href} aria-current={isActive(t) ? 'page' : undefined}>
            <Icon name={t.icon} size={25} stroke={isActive(t) ? 2.2 : 1.8} />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
