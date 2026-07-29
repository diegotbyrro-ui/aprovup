import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import Link from 'next/link';
import { requireCurrentUser } from '@/lib/auth';
import { isCommanderUser } from '@/lib/commanderAccess';
import { getDailyAccessPath } from '@/lib/dailyAccess';
import {
  Users,
  Palette,
  Video,
  UserCog,
  ShieldCheck,
} from 'lucide-react';

export async function AppSidebar() {
  const user = await requireCurrentUser();
  const hasPrivateAccess = isCommanderUser(user);
  const privatePath = hasPrivateAccess ? getDailyAccessPath(user.id) : '/clientes';

  const menus = [
    {
      name: 'Social Media',
      icon: Users,
      path: '/clientes',
      roles: ['DIRECTOR', 'SOCIAL_MEDIA'],
    },
    {
      name: 'Design',
      icon: Palette,
      path: '/design',
      roles: ['DIRECTOR', 'DESIGN'],
    },
    {
      name: 'Filmmaker',
      icon: Video,
      path: '/filmmaker',
      roles: ['DIRECTOR', 'FILMMAKER'],
    },
    {
      name: 'Usuários',
      icon: UserCog,
      path: '/usuarios',
      roles: ['DIRECTOR'],
    },
    {
      name: 'Central',
      icon: ShieldCheck,
      path: privatePath,
      roles: ['DIRECTOR'],
      privateOnly: true,
    },
  ];

  const visibleMenus = menus.filter((menu) => {
    if (!menu.roles.includes(user.role)) return false;
    if (menu.privateOnly && !hasPrivateAccess) return false;

    return true;
  });

  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 text-slate-300">
      <div className="flex h-28 items-center border-b border-slate-800 px-5">
        <Link
          href="/clientes"
          className="block w-full rounded-2xl bg-white px-3 py-3 shadow-xl shadow-black/30 transition hover:opacity-95"
          aria-label="AprovUp"
        >
          <AprovUpLogo size="sm" showTagline={false} />
        </Link>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {visibleMenus.map((menu) => {
          const Icon = menu.icon;

          return (
            <Link
              key={menu.name}
              href={menu.path}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-all hover:bg-slate-900 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-400 transition-colors group-hover:bg-slate-800 group-hover:text-white">
                <Icon size={18} />
              </span>

              <span className="leading-tight">
                {menu.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Operação
          </p>

          <p className="mt-1 text-sm font-semibold text-white">
            Fluxo enxuto
          </p>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Aprovação, produção e resultados.
          </p>
        </div>
      </div>
    </aside>
  );
}