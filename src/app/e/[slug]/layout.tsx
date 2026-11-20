import { Suspense } from 'react';
import type { Metadata } from 'next';
import { invitationPreview } from '@/lib/preview';
import * as db from '@/lib/db';
import { after } from 'next/server';
import { eventBySlug, viewerOf } from '@/lib/space';
import { feature } from '@/lib/access';
import { unreadTotal } from '@/lib/chat';
import { eventTitle, longDate, typeLabel } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { JoinForm } from '@/components/JoinForm';
import { GuestNav } from '@/components/GuestNav';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await eventBySlug(slug);
  return event ? invitationPreview(event) : { title: 'Espace introuvable', robots: { index: false } };
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await eventBySlug(slug);

  if (!event || event.status === 'suspendu' || event.status === 'brouillon') {
    return (
      <main className="narrow" style={{ padding: '56px 0' }}>
        <Logo />
        <h1 style={{ fontSize: 40, marginTop: 36 }}>Cet espace n’est pas accessible</h1>
        <p className="muted" style={{ marginTop: 14 }}>
          Le lien est peut-être incomplet, ou l’espace n’est pas encore ouvert. Demandez un nouveau lien aux organisateurs.
        </p>
      </main>
    );
  }

  const viewer = await viewerOf(event);
  if (!viewer) {
    const names = event.type === 'bapteme' ? [event.babyName || 'Bébé'] : [event.hostA, `& ${event.hostB}`];
    return (
      <main className="join">
        <div className="join-top">
          <Logo onOrange />
          <div style={{ fontWeight: 600, marginTop: 36, marginBottom: 10 }}>{typeLabel(event.type)}</div>
          <div className="ticket-names">
            {names.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <p style={{ fontSize: 18, fontWeight: 550, marginTop: 18 }}>{longDate(event.date)}</p>
        </div>
        <div className="join-form">
          <Suspense>
            <JoinForm slug={event.slug} title={eventTitle(event)} date={longDate(event.date)} />
          </Suspense>
        </div>
      </main>
    );
  }

  if (viewer.kind === 'guest') {
    const last = viewer.guest.lastSeenAt ? Date.parse(viewer.guest.lastSeenAt) : 0;
    // Enregistré après l'envoi de la page : ne ralentit pas l'affichage
    const gid = viewer.guest.id;
    if (Date.now() - last > 10 * 60 * 1000) after(() => db.guests.update(gid, { lastSeenAt: new Date().toISOString() }));
  }

  return (
    <div className="with-nav">
      {children}
      <GuestNav
        slug={event.slug}
        owner={viewer.kind === 'owner'}
        dashboard={viewer.kind === 'owner' ? `/tableau/${event.id}` : undefined}
        ticket={viewer.kind === 'guest' && feature(event, 'qrCodes')}
        unread={await unreadTotal(event, viewer)}
      />
    </div>
  );
}
