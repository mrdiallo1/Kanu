import * as db from '@/lib/db';
import { ownerOf } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { newId, pin } from '@/lib/ids';
import { hasFeature } from '@/config/plans';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const own = await ownerOf(id);
  if (!own) return fail('Accès refusé.', 403);
  if (!hasFeature(own.event.plan, 'qrCodes')) return fail('Le contrôle des entrées demande l’offre Classique ou Prestige.');
  const b = await body(req);
  const name = str(b.name, 60);
  if (name.length < 2) return fail('Indiquez le nom de l’agent.');
  let code = pin();
  while (await db.agents.byPin(own.event.id, code)) code = pin();
  const agent = await db.agents.create({
    id: newId(),
    eventId: own.event.id,
    name,
    pin: code,
    createdAt: new Date().toISOString(),
  });
  return ok({ id: agent.id, pin: agent.pin }, 201);
}
