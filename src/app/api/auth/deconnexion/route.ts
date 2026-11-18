import { ok } from '@/lib/api';
import { updateSession } from '@/lib/session';

export async function POST() {
  await updateSession((s) => ({ ...s, u: undefined }));
  return ok();
}
