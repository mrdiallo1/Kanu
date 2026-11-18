import { notFound, redirect } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { DashTabs } from '@/components/DashTabs';
import { StatusPill } from '@/components/StatusPill';
import { currentUser, ownerOf } from '@/lib/auth';
import { eventTitle, longDate } from '@/lib/format';
import { feature } from '@/lib/access';

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await currentUser())) redirect(`/connexion?suite=/tableau/${id}`);
  const own = await ownerOf(id);
  if (!own) notFound();
  const { event } = own;
  const base = `/tableau/${event.id}`;
  // « main: true » = affiché dans la barre du bas sur téléphone (4 maximum).
  // Toutes les autres sections sont accessibles depuis l'accueil du tableau de bord.
  const tabs = [
    { href: base, label: 'Accueil', icon: 'home', main: true },
    { href: `${base}/invites`, label: 'Invités', icon: 'users', main: true },
    ...(feature(event, 'qrCodes') ? [{ href: `${base}/entrees`, label: 'Entrées', icon: 'scan' }] : []),
    { href: `${base}/galerie`, label: 'Photos', icon: 'photos', main: true },
    { href: `/e/${event.slug}/discussions`, label: 'Discussions', icon: 'chat', main: true },
    { href: `${base}/livre-or`, label: 'Livre d’or', icon: 'book' },
    { href: `${base}/souvenirs`, label: 'Souvenirs', icon: 'download' },
    { href: `${base}/reglages`, label: 'Réglages', icon: 'settings' },
  ];
  return (
    <>
      <SiteHeader />
      <div className="wrap dash-head">
        <div className="row" style={{ gap: 14 }}>
          <StatusPill event={event} />
          <span className="muted small">{longDate(event.date)}</span>
        </div>
        <h1 style={{ marginTop: 12 }}>{eventTitle(event)}</h1>
        <DashTabs tabs={tabs} />
      </div>
      <main className="wrap dash-body">{children}</main>
    </>
  );
}
