'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export function GuestNav(props: { slug: string; owner: boolean; dashboard?: string; ticket: boolean; unread: number }) {
  const path = usePathname();
  const [unread, setUnread] = useState(props.unread);
  const base = `/e/${props.slug}`;

  useEffect(() => setUnread(props.unread), [props.unread]);
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/e/${props.slug}/groupes`, { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          setUnread(j.groups.reduce((n: number, g: { unread: number }) => n + g.unread, 0));
        }
      } catch {
        /* hors ligne */
      }
    }, 20_000);
    return () => clearInterval(t);
  }, [props.slug]);

  // Dans une conversation, la barre disparaît pour laisser la place au clavier (comme WhatsApp)
  if (/\/discussions\/[^/]+$/.test(path)) return null;

  const items = [
    { href: base, icon: 'home', label: 'Accueil' },
    { href: `${base}/photos`, icon: 'photos', label: 'Photos' },
    { href: `${base}/discussions`, icon: 'chat', label: 'Discussions', badge: unread },
    { href: `${base}/livre-or`, icon: 'book', label: 'Livre d’or' },
    ...(props.ticket ? [{ href: `${base}/invitation`, icon: 'ticket', label: 'Invitation' }] : []),
    ...(props.dashboard ? [{ href: props.dashboard, icon: 'grid', label: 'Gérer' }] : []),
  ];

  return (
    <nav className="bottom-nav" style={{ ['--items' as string]: items.length }} aria-label="Navigation">
      {items.map((it) => {
        const active = it.href === base ? path === base : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? 'page' : undefined}>
            <Icon name={it.icon} size={25} stroke={active ? 2.2 : 1.8} />
            <span>{it.label}</span>
            {!!it.badge && <span className="badge">{it.badge > 99 ? '99+' : it.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
