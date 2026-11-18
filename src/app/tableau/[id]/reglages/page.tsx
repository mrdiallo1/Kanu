import { owned } from '@/lib/page';
import { SettingsForm } from '@/components/SettingsForm';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { event } = await owned(params);
  return <SettingsForm event={event} />;
}
