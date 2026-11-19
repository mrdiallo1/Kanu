import Link from 'next/link';
import { site } from '@/config/site';

// Logo « kanu » : couleurs et police écrites directement ici,
// pour qu'il s'affiche toujours, même si la police ou globals.css pose problème.
export function Logo({ onOrange = false, href = '/' }: { onOrange?: boolean; href?: string }) {
  const text = onOrange ? '#ffffff' : '#21140d';
  const square = onOrange ? '#ffffff' : '#ff5a00';
  return (
    <Link
      href={href}
      aria-label={`${site.name}, accueil`}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 2,
        fontFamily: "'Bricolage Grotesque Variable', 'Bricolage Grotesque', 'Segoe UI', Arial, sans-serif",
        fontWeight: 800,
        fontSize: 30,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        color: text,
        textDecoration: 'none',
      }}
    >
      <span style={{ color: text }}>{site.name.toLowerCase()}</span>
      <span
        aria-hidden
        style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: square, transform: 'translateY(-1px)' }}
      />
    </Link>
  );
}