import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <main className="narrow" style={{ padding: '64px 0' }}>
      <Logo />
      <h1 style={{ fontSize: 48, marginTop: 40 }}>Page introuvable</h1>
      <p className="muted" style={{ marginTop: 14 }}>Le lien est peut-être incomplet. Vérifiez le message reçu, ou revenez à l’accueil.</p>
      <div style={{ marginTop: 28 }}>
        <Link href="/" className="btn">Revenir à l’accueil</Link>
      </div>
    </main>
  );
}
