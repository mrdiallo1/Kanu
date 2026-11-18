import { owned } from '@/lib/page';
import { viewerFor } from '@/lib/auth';
import { isOpen, storage } from '@/lib/access';
import { galleryItems } from '@/lib/views';
import { PhotoLibrary } from '@/components/PhotoLibrary';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { event } = await owned(params);
  const viewer = await viewerFor(event);
  const [items, st] = await Promise.all([galleryItems(event, viewer), storage(event)]);
  const reported = items.filter((i) => i.reported).length;
  return (
    <div className="bleed-m">
      <p className="muted small" style={{ padding: '0 16px' }}>
        {items.length} publications. Vous pouvez supprimer n’importe quelle photo ou vidéo : ouvrez-la, ou touchez Sélectionner.
        {reported > 0 && ` ${reported} signalée${reported > 1 ? 's' : ''} par des invités.`}
      </p>
      <PhotoLibrary items={items} slug={event.slug} canUpload={isOpen(event)} freeBytes={st.free} moderation />
    </div>
  );
}
