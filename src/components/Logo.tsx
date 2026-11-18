import Link from 'next/link';
import { site } from '@/config/site';

export function Logo({ onOrange = false, href = '/' }: { onOrange?: boolean; href?: string }) {
  return (
    <Link href={href} className={`logo${onOrange ? ' on-orange' : ''}`} aria-label={`${site.name}, accueil`}>
      {site.name.toLowerCase()}
      <i aria-hidden />
    </Link>
  );
}
