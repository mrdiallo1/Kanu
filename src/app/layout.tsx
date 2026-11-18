import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/instrument-sans';
import './globals.css';
import { site } from '@/config/site';
import { RegisterSW } from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: { default: `${site.name} – ${site.tagline}`, template: `%s – ${site.name}` },
  description:
    'Créez l’espace de votre mariage ou de votre baptême : invitations par WhatsApp, QR code à l’entrée, photos, vidéos et livre d’or de vos invités.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#FF5A00',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
