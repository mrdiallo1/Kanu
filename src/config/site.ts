// Tout ce qui concerne le nom et l'identité de la plateforme est ici.
// Pour renommer l'application, changez seulement ce fichier
// (et le nom dans public/manifest.webmanifest).

export const site = {
  name: 'Kanu',
  tagline: 'Invitations, entrées et souvenirs de vos fêtes',
  city: 'Bamako',
  country: 'Mali',
  supportPhone: '+223 70 00 00 00',
  supportWhatsapp: '22370000000',
  currency: 'FCFA',
};

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}
