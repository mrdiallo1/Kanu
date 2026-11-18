import { space } from '@/lib/space';
import { canPost, isOpen, storage } from '@/lib/access';
import { galleryItems } from '@/lib/views';
import { hostsLine } from '@/lib/format';
import { PhotoLibrary } from '@/components/PhotoLibrary';

export const metadata = { title: 'Photos' };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { event, viewer } = await space(params);
  const [items, st] = await Promise.all([galleryItems(event, viewer), storage(event)]);
  return (
    <>
      <header className="appbar">
        <h1>
          Photos
          <span className="sub">{hostsLine(event)}</span>
        </h1>
      </header>
      {!canPost(event, viewer) && isOpen(event) && (
        <p className="alert info small" style={{ margin: '12px 16px 0' }}>
          Les organisateurs n’ont pas ouvert les publications pour vous. Vous pouvez regarder et télécharger.
        </p>
      )}
      <PhotoLibrary items={items} slug={event.slug} canUpload={canPost(event, viewer)} freeBytes={st.free} moderation={viewer.kind === 'owner'} />
    </>
  );
}
