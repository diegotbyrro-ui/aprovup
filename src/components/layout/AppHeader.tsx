import { requireCurrentUser } from '@/lib/auth';
import { logoutAction } from '@/app/(auth)/login/actions';

const roleLabels: Record<string, string> = {
  DIRECTOR: 'Diretor',
  SOCIAL_MEDIA: 'Social Media',
  DESIGN: 'Design',
  FILMMAKER: 'Filmmaker',
};

function getInitials(name?: string | null, email?: string | null) {
  const value = name || email || 'Usuário';

  const parts = value
    .trim()
    .split(' ')
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

export async function AppHeader() {
  const user = await requireCurrentUser();

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-8">
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Espaço reservado para breadcrumb ou título da página */}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {getInitials(user.name, user.email)}
            </div>

            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-800">
                {user.name || 'Usuário'}
              </p>

              <p className="text-xs font-medium text-slate-500">
                {roleLabels[user.role] || user.role}
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

