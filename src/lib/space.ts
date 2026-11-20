import { cache } from 'react';
import { notFound } from 'next/navigation';
import * as db from '@/lib/db';
import { viewerFor } from '@/lib/auth';
import type { EventSpace } from '@/lib/types';

// cache() : pendant l'affichage d'une page, la fête et la personne connectée
// ne sont lues qu'une seule fois, même si le layout et la page les demandent.
export const eventBySlug = cache((slug: string) => db.events.bySlug(slug));
const viewerById = cache((_eventId: string, event: EventSpace) => viewerFor(event));
export const viewerOf = (event: EventSpace) => viewerById(event.id, event);

/** Dans les pages de l'espace invité : l'espace et la personne connectée (le layout gère le cas « pas connecté »). */
export async function space(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const event = await eventBySlug(slug);
  if (!event || event.status === 'suspendu' || event.status === 'brouillon') notFound();
  const viewer = await viewerOf(event);
  if (!viewer) notFound();
  return { event, viewer };
}
