import crypto from 'node:crypto';

export const newId = () => crypto.randomUUID();

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I/L

function pick(alpha: string, n: number) {
  const bytes = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += alpha[bytes[i] % alpha.length];
  return s;
}

/** Code d'invitation lisible, ex. K7M-4QP */
export const inviteCode = () => `${pick(ALPHA, 3)}-${pick(ALPHA, 3)}`;

/** Jeton secret d'un invité (QR code, lien personnel) */
export const guestToken = () => crypto.randomBytes(12).toString('base64url');

/** Code PIN à 6 chiffres pour les agents de contrôle */
export const pin = () => pick('0123456789', 6);

export const shortRef = () => 'KN' + pick('0123456789', 8);

export function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export const slugSuffix = () => pick('abcdefghjkmnpqrstuvwxyz23456789', 4);
