// Aperçu du lien quand on l'envoie sur WhatsApp, Facebook, SMS…
// (balises Open Graph : titre, description et image).

import type { Metadata } from 'next';
import { siteUrl } from '@/config/site';
import { eventTitle, longDate } from '@/lib/format';
import type { EventSpace } from '@/lib/types';

export function invitationPreview(event: EventSpace): Metadata {
  const title = eventTitle(event);
  const place = event.receptionPlace || event.ceremonyPlace;
  const description = `${longDate(event.date)}${place ? `, ${place}` : ''}. Programme, lieux, photos et livre d’or des invités.`;
  // ?v= change quand la photo change : WhatsApp recharge alors la nouvelle image.
  const image = `${siteUrl()}/api/apercu/${event.slug}?v=${event.coverMediaId || 'sans-photo'}`;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: 'Kanu',
      locale: 'fr_FR',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
