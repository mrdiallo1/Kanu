import { currentUser } from '@/lib/auth';
import { body, fail, ok, str } from '@/lib/api';
import { createEvent } from '@/lib/events';
import { PLANS, type PlanId } from '@/config/plans';
import type { ProgramItem } from '@/lib/types';

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail('Connectez-vous pour créer un espace.', 401);
  const b = await body(req);

  const type = b.type === 'bapteme' ? 'bapteme' : 'mariage';
  const hostA = str(b.hostA, 60);
  const hostB = str(b.hostB, 60);
  const babyName = str(b.babyName, 60);
  const date = str(b.date, 10);
  const plan = (str(b.plan, 20) as PlanId) in PLANS ? (str(b.plan, 20) as PlanId) : 'classique';

  if (!hostA || !hostB) {
    return fail(type === 'bapteme' ? 'Indiquez le nom du père et de la mère.' : 'Indiquez le nom des deux mariés.');
  }
  if (type === 'bapteme' && !babyName) return fail('Indiquez le prénom de l’enfant.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Indiquez la date.');

  const program: ProgramItem[] = Array.isArray(b.program)
    ? (b.program as ProgramItem[])
        .map((p) => ({ time: str(p?.time, 5), label: str(p?.label, 120) }))
        .filter((p) => p.label)
        .slice(0, 20)
    : [];

  const event = await createEvent(user.id, {
    type,
    hostA,
    hostB,
    babyName: type === 'bapteme' ? babyName : undefined,
    date,
    time: str(b.time, 5) || '15:00',
    ceremonyPlace: str(b.ceremonyPlace, 160),
    receptionPlace: str(b.receptionPlace, 160),
    program,
    story: str(b.story, 2000),
    welcome: str(b.welcome, 600),
    plan,
  });
  return ok({ id: event.id, slug: event.slug }, 201);
}
