import * as db from '@/lib/db';
import { ownerOf } from '@/lib/auth';
import { fail } from '@/lib/api';
import { feature } from '@/lib/access';
import { guestbookPdf } from '@/lib/export';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const own = await ownerOf(id);
  if (!own) return fail('Accès refusé.', 403);
  if (!feature(own.event, 'livreOrPdf')) return fail('Le livre d’or en PDF fait partie de l’offre Prestige.', 403);
  const pdf = await guestbookPdf(own.event, await db.guestbook.list(own.event.id));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="livre-or.pdf"',
    },
  });
}
