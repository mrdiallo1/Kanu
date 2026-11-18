// Session signée stockée dans un cookie HTTP-only.
// Un même navigateur peut être à la fois organisateur, invité de plusieurs
// fêtes et agent de contrôle.

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'kanu_session';
const MAX_AGE = 60 * 60 * 24 * 180; // 180 jours

export interface Session {
  u?: string; // identifiant organisateur
  g?: Record<string, string>; // eventId -> guestId
  a?: Record<string, string>; // eventId -> agentId
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET manquant ou trop court');
    }
    return 'secret-de-developpement-a-ne-pas-utiliser-en-production';
  }
  return s;
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function encode(s: Session) {
  const payload = Buffer.from(JSON.stringify(s)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string | undefined): Session {
  if (!raw) return {};
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return {};
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return {};
  }
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return {};
  }
}

export async function getSession(): Promise<Session> {
  const jar = await cookies();
  return decode(jar.get(COOKIE)?.value);
}

/** Utilisable uniquement dans les routes API et les actions serveur. */
export async function updateSession(fn: (s: Session) => Session) {
  const jar = await cookies();
  const next = fn(decode(jar.get(COOKIE)?.value));
  jar.set(COOKIE, encode(next), {
    httpOnly: true,
    sameSite: 'lax',
    // Cookie « secure » dès que le site est servi en HTTPS (toujours le cas en production)
    secure: (process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('https://'),
    path: '/',
    maxAge: MAX_AGE,
  });
}
