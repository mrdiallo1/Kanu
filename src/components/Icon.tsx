// Icônes au trait, dessinées pour la barre de navigation mobile.
const PATHS: Record<string, string> = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z',
  photos: 'M4 5h16v14H4z M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 17.5 M15.5 9.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0',
  chat: 'M4 5.5h16v10H9l-5 4z',
  book: 'M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h10',
  ticket: 'M3.5 7.5h17v3a1.5 1.5 0 0 0 0 3v3h-17v-3a1.5 1.5 0 0 0 0-3z M14.5 7.5v9',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14.8c2 .7 3.2 2.5 3.5 5.2',
  scan: 'M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M7 12h10',
  bag: 'M5 8h14l-1 12H6z M9 8V6.5a3 3 0 0 1 6 0V8',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  back: 'M15 5l-7 7 7 7',
  plus: 'M12 5v14 M5 12h14',
  send: 'M4 12 20 4l-4 16-4-7z M12 13l8-9',
  download: 'M12 4v11 M7 10.5l5 5 5-5 M5 20h14',
  trash: 'M5 7h14 M10 7V5h4v2 M7 7l1 13h8l1-13',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 7.5h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12 M18 6 6 18',
  flag: 'M6 21V4 M6 4h11l-2 4 2 4H6',
  cart: 'M3 4h2.5l2.2 11h10.3l2-8H7 M10 20h.01 M17 20h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4z',
  box: 'M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z M4 7.5l8 3.5 8-3.5 M12 11v9',
  select: 'M5 12.5l4.5 4.5L19 7.5',
};

export function Icon({ name, size = 24, stroke = 1.8 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3.2 : stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name] || ''} />
    </svg>
  );
}
