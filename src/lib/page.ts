import { notFound } from 'next/navigation';
import { ownerOf } from '@/lib/auth';

/** Dans les pages du tableau de bord : l'espace de l'organisateur connecté, ou 404. */
export async function owned(params: Promise<{ id: string }>) {
  const { id } = await params;
  const own = await ownerOf(id);
  if (!own) notFound();
  return own;
}
