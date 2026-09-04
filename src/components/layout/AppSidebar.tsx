import Link from "next/link";

import {
  CalendarDays,
  CircleHelp,
  CreditCard,
  Settings,
} from "lucide-react";

import {
  AprovUpLogo,
} from "@/components/brand/AprovUpLogo";

import {
  AppSidebarNav,
  type AppSidebarNavItem,
} from "@/components/layout/AppSidebarNav";

import {
  requireCurrentUser,
} from "@/lib/auth";

import {
  hasPermission,
  type PermissionKey,
} from "@/lib/userAccess";

import {
  canUseFeature,
  getCurrentUserSaasAccess,
  type SaasFeature,
} from "@/lib/saasAccess";


type MenuDefinition = {
  name: string;
  path: string;
  permission: PermissionKey;
  requiredFeature?: SaasFeature;
  icon:
    | "dashboard"
    | "social"
    | "filmmaker"
    | "design"
    | "crm";
  activePrefixes: string[];
};


export async function AppSidebar() {

  const user =
    await requireCurrentUser();


  const access =
    await getCurrentUserSaasAccess();


  const definitions: MenuDefinition[] = [
    {
      name:
        "Dashboard",

      icon:
        "dashboard",

      path:
        "/operacao",

      permission:
        "dashboard.view",

      activePrefixes: [
        "/operacao",
      ],
    },

    {
      name:
        "Social Media",

      icon:
        "social",

      path:
        "/clientes",

      permission:
        "social.view",

      activePrefixes: [
        "/clientes",
        "/social-media",
        "/calendario-editorial",
      ],
    },

    {
      name:
        "Filmaker",

      icon:
        "filmmaker",

      path:
        "/filmmaker",

      permission:
        "filmmaker.view",

      activePrefixes: [
        "/filmmaker",
        "/captacoes",
      ],
    },

    {
      name:
        "Design",

      icon:
        "design",

      path:
        "/design",

      permission:
        "design.view",

      activePrefixes: [
        "/design",
      ],
    },

    {
      name:
        "CRM",

      icon:
        "crm",

      path:
        "/crm",

      permission:
        "crm.view",

      requiredFeature:
        "crm",

      activePrefixes: [
        "/crm",
      ],
    },
  ];


  const items: AppSidebarNavItem[] =
    definitions
      .filter(
        (item) =>
          hasPermission(
            user,
            item.permission
          )
      )
      .map(
        (item) => {

          const blocked =
            item.requiredFeature
              ? !canUseFeature(
                  access,
                  item.requiredFeature
                )
              : false;


          return {
            name:
              item.name,

            path:
              item.path,

            href:
              blocked
                ? "/acesso-bloqueado"
                : item.path,

            blocked,

            icon:
              item.icon,

            activePrefixes:
              item.activePrefixes,
          };
        }
      );


  const canManageSettings =
    hasPermission(
      user,
      "settings.manage"
    );


  return (

    <aside className="ap-sidebar ap-sidebar-v2">

      <div className="ap-sidebar-brand">

        <div className="mx-auto flex w-[178px] items-center justify-center px-2 py-3">

          <img
            src="/brand/aprovup-logo-sidebar.png"
            alt="AprovUp"
            className="block h-auto w-full object-contain"
          />

        </div>

      </div>


      <div className="ap-sidebar-body">

        <p className="ap-sidebar-section-label">
          Workspace
        </p>


        <AppSidebarNav
          items={items}
        />

      </div>


      <div className="ap-sidebar-footer">

        {canManageSettings ? (

          <>
            <Link
              href="/configuracoes/equipe"
              className="ap-sidebar-footer-link"
            >
              <Settings
                size={16}
              />

              <span>
                Equipe e acessos
              </span>
            </Link>


            <Link
              href="/configuracoes/integracoes"
              className="ap-sidebar-footer-link"
            >
              <CalendarDays
                size={16}
              />

              <span>
                Integrações
              </span>
            </Link>
          </>

        ) : null}


        <Link
          href="/minha-assinatura"
          className="ap-sidebar-footer-link"
        >
          <CreditCard
            size={16}
          />

          <span>
            Minha assinatura
          </span>
        </Link>


        <Link
          href="/central"
          className="ap-sidebar-footer-link"
        >
          <CircleHelp
            size={16}
          />

          <span>
            Central de ajuda
          </span>
        </Link>


        <div className="ap-sidebar-product">

          <span>
            AprovUp
          </span>

          <span className="ap-sidebar-product-dot" />

          <span>
            Operação
          </span>

        </div>

      </div>

    </aside>
  );
}