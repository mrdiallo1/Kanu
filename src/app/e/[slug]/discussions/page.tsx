import { space } from '@/lib/space';
import { canCreateGroups, groupSummaries } from '@/lib/chat';
import { ChatList } from '@/components/ChatList';

export const metadata = { title: 'Discussions' };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { event, viewer } = await space(params);
  return <ChatList slug={event.slug} initial={await groupSummaries(event, viewer)} canCreate={canCreateGroups(viewer)} owner={viewer.kind === 'owner'} />;
}
