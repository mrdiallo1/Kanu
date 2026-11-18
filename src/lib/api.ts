import { NextResponse } from 'next/server';

export const ok = (data: unknown = { ok: true }, status = 200) => NextResponse.json(data, { status });

export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Limitation simple des abus (par adresse IP, en mémoire).
const hits = new Map<string, { n: number; t: number }>();
export function rateLimit(req: Request, key: string, max: number, windowMs = 60_000) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const k = `${key}:${ip}`;
  const now = Date.now();
  const h = hits.get(k);
  if (!h || now - h.t > windowMs) {
    hits.set(k, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > max;
}
