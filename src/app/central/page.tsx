import { redirect } from 'next/navigation';
import { requireCommanderAccess } from '@/lib/commanderAccess';
import { getDailyAccessPath } from '@/lib/dailyAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function CentralRedirectPage() {
  const user = await requireCommanderAccess();

  redirect(getDailyAccessPath(user.id));
}