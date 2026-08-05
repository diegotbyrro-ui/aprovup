import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  CheckSquare,
  CreditCard,
  FileText,
  LayoutDashboard,
  Lock,
  PenTool,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react';
import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { requireCurrentUser } from '@/lib/auth';
import { isCommanderUser } from '@/lib/commanderAccess';
import { getDailyAccessPath } from '@/lib/dailyAccess';
import { canUseFeature, getCurrentUserSaasAccess, type SaasFeature } from '@/lib/saasAccess';

type MenuItem = {
  name: string;
  icon: LucideIcon;
  path: string;
  roles: string[];
  privateOnly?: boolean;
  requiredFeature?: SaasFeature;
};

const baseRoles = ['DIRECTOR', 'SOCIAL_MEDIA', 'DESIGN', 'FILMMAKER'];

export async function AppSidebar() {
  const user = await requireCurrentUser();
  const access = await getCurrentUserSaasAccess();

  const hasPrivateAccess = isCommanderUser(user);
  const privatePath = hasPrivateAccess ? getDailyAccessPath(user.id) : '/clientes';

  const menuItems: MenuItem[] = [
    {
      name: 'Operacao',
      icon: LayoutDashboard,
      path: '/operacao',
      roles: baseRoles,
    },
    {
      name: 'Clientes',
      icon: Users,
      path: '/clientes',
      roles: ['DIRECTOR', 'SOCIAL_MEDIA'],
    },
    {
      name: 'Calendario',
      icon: Calendar,
      path: '/calendario-editorial',
      roles: ['DIRECTOR', 'SOCIAL_MEDIA'],
    },
    {
      name: 'Conteudos',
      icon: FileText,
      path: '/conteudos',
      roles: ['DIRECTOR', 'SOCIAL_MEDIA', 'DESIGN', 'FILMMAKER'],
    },
    {
      name: 'Social Media',
      icon: CheckSquare,
      path: '/social-media',
      roles: ['DIRECTOR', 'SOCIAL_MEDIA'],
    },
    {
      name: 'Design',
      icon: PenTool,
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
      name: 'Pronto para postar',
      icon: CheckSquare,
      path: '/pronto-para-postar',
      roles: ['DIRECTOR', 'SOCIAL_MEDIA'],
      requiredFeature: 'socialPosting',
    },
    {
      name: 'Prompts IA',
      icon: FileText,
      path: '/prompts',
      roles: ['DIRECTOR', 'SOCIAL_MEDIA'],
      requiredFeature: 'ai',
    },
    {
      name: 'CRM',
      icon: BriefcaseBusiness,
      path: '/crm',
      roles: ['DIRECTOR', 'SOCIAL_MEDIA'],
      requiredFeature: 'crm',
    },
    {
      name: 'Relatorios',
      icon: BarChart3,
      path: '/relatorios',
      roles: ['DIRECTOR', 'SOCIAL_MEDIA'],
      requiredFeature: 'reports',
    },
    {
      name: 'Equipe',
      icon: Users,
      path: '/usuarios',
      roles: ['DIRECTOR'],
    },
    {
      name: 'Minha assinatura',
      icon: CreditCard,
      path: '/minha-assinatura',
      roles: baseRoles,
    },
    {
      name: 'Central',
      icon: ShieldCheck,
      path: privatePath,
      roles: ['DIRECTOR'],
      privateOnly: true,
    },
  ];

  const visibleItems = menuItems.filter((item) => {
    if (item.privateOnly && !hasPrivateAccess) {
      return false;
    }

    return item.roles.includes(user.role);
  });

  return (
    <aside className="flex min-h-screen w-72 flex-col border-r border-slate-200 bg-white px-5 py-6">
      <div className="mb-8">
        <AprovUpLogo size="sm" />
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isBlocked = item.requiredFeature ? !canUseFeature(access, item.requiredFeature) : false;
          const href = isBlocked ? '/acesso-bloqueado' : item.path;

          return (
            <Link
              key={item.name}
              href={href}
              className={[
                'group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition',
                isBlocked
                  ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
              ].join(' ')}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {item.name}
              </span>

              {isBlocked ? (
                <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  <Lock className="h-3 w-3" />
                  Bloqueado
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-3xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Usuario
        </p>

        <p className="mt-1 truncate text-sm font-bold text-slate-950">
          {user.name || user.email}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {access.isCommander ? 'Acesso total' : access.subscription?.plan?.name || 'Sem plano ativo'}
        </p>
      </div>
    </aside>
  );
}