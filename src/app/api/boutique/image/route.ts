import { Readable } from 'node:stream';
import * as storage from '@/lib/storage';
import { fail } from '@/lib/api';

// Photos des produits : publiques (la boutique est visible par tous).
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('k') || '';
  if (!/^boutique\/produits\/[\w-]+\/[\w-]+\.jpg$/.test(key)) return fail('Image introuvable.', 404);
  try {
    const size = await storage.size(key);
    return new Response(Readable.toWeb(storage.createReadStream(key)) as ReadableStream, {
      headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(size), 'Cache-Control': 'public, max-age=604800, immutable' },
    });
  } catch {
    return fail('Image introuvable.', 404);
  }
}
