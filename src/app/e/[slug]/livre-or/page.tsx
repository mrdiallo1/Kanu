import { space } from '@/lib/space';
import { feature, isOpen } from '@/lib/access';
import { bookEntries } from '@/lib/views';
import { hostsLine } from '@/lib/format';
import { PLANS } from '@/config/plans';
import { Guestbook } from '@/components/Guestbook';

export const metadata = { title: 'Livre d’or' };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { event, viewer } = await space(params);
  const bapteme = event.type === 'bapteme';
  return (
    <>
      <header className="appbar">
        <h1>
          Livre d’or
          <span className="sub">{hostsLine(event)}</span>
        </h1>
      </header>
      <main className="wrap" style={{ maxWidth: 760, paddingTop: 18 }}>
        <Guestbook
          slug={event.slug}
          entries={await bookEntries(event, viewer)}
          canWrite={isOpen(event)}
          voice={feature(event, 'livreOrVocal')}
          maxVoiceSeconds={PLANS[event.plan].maxVoiceSeconds}
          defaultName={viewer.name}
          hostsLabel={bapteme ? `${event.babyName} et ses parents` : hostsLine(event).replace('&', 'et')}
        />
      </main>
    </>
  );
}
