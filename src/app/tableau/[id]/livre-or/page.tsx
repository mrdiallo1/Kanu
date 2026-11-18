import { owned } from '@/lib/page';
import { viewerFor } from '@/lib/auth';
import { feature, isOpen } from '@/lib/access';
import { bookEntries } from '@/lib/views';
import { Guestbook } from '@/components/Guestbook';
import { hostsLine } from '@/lib/format';
import { PLANS } from '@/config/plans';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { event } = await owned(params);
  const viewer = await viewerFor(event);
  const entries = await bookEntries(event, viewer);
  const voices = entries.filter((e) => e.audioMediaId).length;
  return (
    <div className="stack" style={{ ['--gap' as string]: '28px' }}>
      <div className="row between">
        <div>
          <h2 style={{ fontSize: 36 }}>Livre d’or</h2>
          <p className="muted">
            {entries.length - voices} messages écrits, {voices} vocaux.
          </p>
        </div>
        {feature(event, 'livreOrPdf') && (
          <a className="btn ghost" href={`/api/espaces/${event.id}/livre-or-pdf`}>
            Télécharger en PDF
          </a>
        )}
      </div>
      <Guestbook
        slug={event.slug}
        entries={entries}
        canWrite={false}
        voice={feature(event, 'livreOrVocal') && isOpen(event)}
        maxVoiceSeconds={PLANS[event.plan].maxVoiceSeconds}
        defaultName=""
        hostsLabel={hostsLine(event)}
      />
    </div>
  );
}
