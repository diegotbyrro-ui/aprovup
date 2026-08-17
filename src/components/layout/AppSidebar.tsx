import Link from "next/link";

import type {
  LucideIcon,
} from "lucide-react";

import {
  BriefcaseBusiness,
  LayoutDashboard,
  Lock,
  PenTool,
  Users,
  Video,
} from "lucide-react";

import {
  AprovUpLogo,
} from "@/components/brand/AprovUpLogo";

import {
  AprovUpThemeToggle,
} from "@/components/theme/AprovUpThemeToggle";

import {
  requireCurrentUser,
} from "@/lib/auth";

import {
  canUseFeature,
  getCurrentUserSaasAccess,
  type SaasFeature,
} from "@/lib/saasAccess";


type MenuItem = {
  name: string;
  icon: LucideIcon;
  path: string;
  roles: string[];
  requiredFeature?: SaasFeature;
};


const baseRoles = [
  "DIRECTOR",
  "SOCIAL_MEDIA",
  "DESIGN",
  "FILMMAKER",
];


export async function AppSidebar() {

  const user =
    await requireCurrentUser();

  const access =
    await getCurrentUserSaasAccess();


  const menuItems: MenuItem[] = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/operacao",
      roles: baseRoles,
    },
    {
      name: "Social Mídia",
      icon: Users,
      path: "/clientes",
      roles: [
        "DIRECTOR",
        "SOCIAL_MEDIA",
      ],
    },
    {
      name: "Filmmaker",
      icon: Video,
      path: "/filmmaker",
      roles: [
        "DIRECTOR",
        "FILMMAKER",
      ],
    },
    {
      name: "Design",
      icon: PenTool,
      path: "/design",
      roles: [
        "DIRECTOR",
        "DESIGN",
      ],
    },
    {
      name: "CRM",
      icon: BriefcaseBusiness,
      path: "/crm",
      roles: [
        "DIRECTOR",
        "SOCIAL_MEDIA",
      ],
      requiredFeature: "crm",
    },
  ];


  const visibleItems =
    menuItems.filter(
      (item) =>
        item.roles.includes(
          user.role
        )
    );


  return (
    <aside
      className="
        ap-sidebar
        relative
        flex
        min-h-screen
        w-72
        flex-shrink-0
        flex-col
        overflow-hidden
        border-r
        px-5
        py-6
      "
    >

      <div
        className="
          ap-sidebar-logo
          mb-8
        "
      >
        <AprovUpLogo size="sm" />
      </div>


      <nav
        className="
          flex
          flex-1
          flex-col
          gap-2
        "
      >

        {visibleItems.map((item) => {

          const Icon = item.icon;

          const isBlocked =
            item.requiredFeature
              ? !canUseFeature(
                  access,
                  item.requiredFeature
                )
              : false;

          const href =
            isBlocked
              ? "/acesso-bloqueado"
              : item.path;


          return (
            <Link
              className={[
                `
                  ap-sidebar-link
                  group
                  flex
                  min-h-[46px]
                  items-center
                  justify-between
                  gap-3
                  rounded-xl
                  px-4
                  text-sm
                  font-semibold
                `,
                isBlocked
                  ? `
                    border
                    border-amber-500/20
                    bg-amber-500/10
                  `
                  : "",
              ].join(" ")}
              href={href}
              key={item.name}
            >

              <span
                className="
                  flex
                  items-center
                  gap-3
                "
              >

                <Icon
                  className="
                    h-[19px]
                    w-[19px]
                  "
                />

                {item.name}

              </span>


              {isBlocked ? (
                <span
                  className="
                    flex
                    items-center
                    gap-1
                    rounded-full
                    bg-amber-500/10
                    px-2
                    py-1
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-amber-500
                  "
                >

                  <Lock
                    className="
                      h-3
                      w-3
                    "
                  />

                  Bloqueado

                </span>
              ) : null}

            </Link>
          );
        })}

      </nav>


      <div
        className="
          mt-6
          space-y-3
        "
      >

        <AprovUpThemeToggle />


        <div
          className="
            ap-sidebar-user
            rounded-2xl
            p-4
          "
        >

          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.14em]
              text-slate-500
            "
          >
            Usuário
          </p>

          <p
            className="
              mt-2
              truncate
              text-sm
              font-bold
            "
          >
            {user.name ||
              user.email}
          </p>

          <p
            className="
              mt-1
              text-xs
              text-slate-500
            "
          >
            {access.isCommander
              ? "Acesso total"
              : access.subscription
                    ?.plan?.name ||
                "Sem plano ativo"}
          </p>

        </div>

      </div>

    </aside>
  );
}