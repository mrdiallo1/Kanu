import * as db from '@/lib/db';
import { agentFor } from '@/lib/auth';
import { eventTitle } from '@/lib/format';
import { AgentLogin } from '@/components/AgentLogin';
import { ScannerApp } from '@/components/ScannerApp';
import { Logo } from '@/components/Logo';

export const metadata = { title: 'Contrôle des entrées', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await db.events.bySlug(slug);
  if (!event || event.status === 'suspendu') {
    return (
      <main className="narrow" style={{ padding: '64px 0' }}>
        <Logo />
        <h1 style={{ fontSize: 40, marginTop: 32 }}>Espace introuvable</h1>
      </main>
    );
  }
  const agent = await agentFor(event);
  if (!agent) {
    return (
      <main className="scan-app" style={{ justifyContent: 'center', padding: 24 }}>
        <AgentLogin slug={slug} title={eventTitle(event)} />
      </main>
    );
  }
  return <ScannerApp slug={slug} title={eventTitle(event)} agentName={agent.name} />;
}
