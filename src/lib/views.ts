import * as db from '@/lib/db';
import type { Viewer } from '@/lib/auth';
import type { EventSpace } from '@/lib/types';
import type { GalleryItem } from '@/components/PhotoLibrary';
import type { BookEntry } from '@/components/Guestbook';

export async function galleryItems(event: EventSpace, viewer: Viewer | null): Promise<GalleryItem[]> {
  const list = await db.media.list(event.id, ['photo', 'video']);
  return list.map((m) => ({
    id: m.id,
    kind: m.kind as 'photo' | 'video',
    authorName: m.authorName,
    caption: m.caption,
    createdAt: m.createdAt,
    hasThumb: !!m.thumbKey,
    official: m.official,
    mime: m.mime,
    reported: viewer?.kind === 'owner' ? m.reported : undefined,
    deletable:
      viewer?.kind === 'owner' ||
      (viewer?.kind === 'guest' && viewer.guest.id === m.guestId && event.settings.guestsCanDeleteOwn),
  }));
}

export async function bookEntries(event: EventSpace, viewer: Viewer | null): Promise<BookEntry[]> {
  const list = await db.guestbook.list(event.id);
  return list.map((e) => ({
    id: e.id,
    authorName: e.authorName,
    text: e.text,
    audioMediaId: e.audioMediaId,
    createdAt: e.createdAt,
    deletable:
      viewer?.kind === 'owner' ||
      (viewer?.kind === 'guest' && viewer.guest.id === e.guestId && event.settings.guestsCanDeleteOwn),
  }));
}
