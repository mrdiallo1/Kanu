import { notFound } from 'next/navigation';
import { after } from 'next/server';
import * as db from '@/lib/db';
import { space } from '@/lib/space';
import { PAGE_SIZE, canSeeGroup, isGroupAdmin, memberKey, messageView } from '@/lib/chat';
import { ChatRoom } from '@/components/ChatRoom';

export const metadata = { title: 'Discussion' };

// Les messages sont préparés directement dans la page : la discussion
// s'affiche tout de suite, sans écran « Chargement… ».
export default async function Page({ params }: { params: Promise<{ slug: string; gid: string }> }) {
  const { event, viewer } = await space(params);
  const { gid } = await params;
  const group = await db.groups.byId(gid);
  if (!group || group.eventId !== event.id || !canSeeGroup(group, viewer)) notFound();

  const msgs = await db.messages.list(group.id, { limit: PAGE_SIZE });
  const key = memberKey(viewer);
  const count = group.msgCount ?? msgs.length;
  if ((group.readCounts?.[key] ?? -1) < count) after(() => db.groups.markReadCount(group.id, key, count));

  return (
    <ChatRoom
      slug={event.slug}
      groupId={group.id}
      initial={{
        me: key,
        rev: group.rev ?? 0,
        name: group.name,
        members: group.memberGuestIds.length + 1,
        isAdmin: isGroupAdmin(group, viewer),
        messages: msgs.map(messageView),
        hasMore: count > msgs.length,
      }}
    />
  );
}
