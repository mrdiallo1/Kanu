import type { EventSpace } from '@/lib/types';

export function fcfa(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n).replace(/ | /g, ' ') + ' FCFA';
}

export function bytes(n: number) {
  if (n < 1024) return `${n} o`;
  const units = ['Ko', 'Mo', 'Go', 'To'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0).replace('.', ',')} ${units[i]}`;
}

export function longDate(iso: string) {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  const s = d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function clock(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function hostsLine(e: Pick<EventSpace, 'type' | 'hostA' | 'hostB' | 'babyName'>) {
  if (e.type === 'bapteme') return e.babyName || `${e.hostA} et ${e.hostB}`;
  return `${e.hostA} & ${e.hostB}`;
}

export function eventTitle(e: Pick<EventSpace, 'type' | 'hostA' | 'hostB' | 'babyName'>) {
  return e.type === 'bapteme'
    ? `Baptême de ${e.babyName || 'notre enfant'}`
    : `Mariage de ${e.hostA} & ${e.hostB}`;
}

export function typeLabel(t: EventSpace['type']) {
  return t === 'bapteme' ? 'Baptême' : 'Mariage';
}

export const productImage = (key: string) => `/api/boutique/image?k=${encodeURIComponent(key)}`;
