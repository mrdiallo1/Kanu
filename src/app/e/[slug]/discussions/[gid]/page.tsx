import { notFound } from 'next/navigation';
import * as db from '@/lib/db';
import { space } from '@/lib/space';
import { canSeeGroup } from '@/lib/chat';
import { ChatRoom } from '@/components/ChatRoom';

export const metadata = { title: 'Discussion' };

export default async function Page({ params }: { params: Promise<{ slug: string; gid: string }> }) {
  const { event, viewer } = await space(params);
  const { gid } = await params;
  const group = await db.groups.byId(gid);
  if (!group || group.eventId !== event.id || !canSeeGroup(group, viewer)) notFound();
  return <ChatRoom slug={event.slug} groupId={group.id} initialName={group.name} />;
}
