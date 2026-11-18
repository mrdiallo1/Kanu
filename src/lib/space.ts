import { notFound } from 'next/navigation';
import * as db from '@/lib/db';
import { viewerFor } from '@/lib/auth';

/** Dans les pages de l'espace invité : l'espace et la personne connectée (le layout gère le cas « pas connecté »). */
export async function space(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const event = await db.events.bySlug(slug);
  if (!event || event.status === 'suspendu' || event.status === 'brouillon') notFound();
  const viewer = await viewerFor(event);
  if (!viewer) notFound();
  return { event, viewer };
}
