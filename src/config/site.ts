// Tout ce qui concerne le nom et l'identité de la plateforme est ici.
// Pour renommer l'application, changez seulement ce fichier
// (et le nom dans public/manifest.webmanifest).

export const site = {
  name: 'Kanu',
  tagline: 'Invitations, entrées et souvenirs de vos fêtes',
  city: 'Bamako',
  country: 'Mali',
  supportPhone: '+223 79 45 91 49',
  supportWhatsapp: '22379459149',
  currency: 'FCFA',
};

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://kanumali-92lph52hc-mrdiallo1.vercel.app/').replace(/\/$/, '');
}
