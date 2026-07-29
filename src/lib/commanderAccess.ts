import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/auth';

type UserLike = {
  id?: string | null;
  role?: string | null;
  status?: string | null;
};

export function getCommanderUserIds() {
  return (process.env.APROVUP_COMMANDER_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isCommanderUser(user: UserLike | null | undefined) {
  if (!user?.id) return false;

  const commanderIds = getCommanderUserIds();

  if (commanderIds.length === 0) {
    return false;
  }

  return (
    user.role === 'DIRECTOR' &&
    user.status === 'APROVADO' &&
    commanderIds.includes(user.id)
  );
}

export async function requireCommanderAccess() {
  const user = await requireCurrentUser();

  if (!isCommanderUser(user)) {
    redirect('/clientes');
  }

  return user;
}