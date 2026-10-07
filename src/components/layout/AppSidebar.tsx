import Link from "next/link";

import {
  CalendarDays,
  CreditCard,
  FileText,
  Headphones,
  Settings,
  ShieldCheck,
} from "lucide-react";

import {
  AppSidebarNav,
  type AppSidebarNavItem,
} from "@/components/layout/AppSidebarNav";

import {
  requireCurrentUser,
} from "@/lib/auth";

import {
  isCommanderUser,
} from "@/lib/commanderAccess";

import {
  t,
} from "@/lib/i18n";

import {
  getLocale,
} from "@/lib/i18n-server";

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
    | "secretary"
    | "social"
    | "filmmaker"
    | "design"
    | "crm"
    | "finance"
    | "mindmap";
  activePrefixes: string[];
};


export async function AppSidebar() {
  const locale =
    await getLocale();

  const user =
    await requireCurrentUser();

  const access =
    await getCurrentUserSaasAccess();

  const isSaasAdmin =
    isCommanderUser(
      user
    );


  const definitions: MenuDefinition[] = [
    {
      name:
        t(locale, "nav.dashboard"),
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
        t(locale, "nav.secretary"),
      icon:
        "secretary",
      path:
        hasPermission(
          user,
          "settings.manage"
        )
          ? "/secretaria"
          : "/secretaria/reunioes",
      permission:
        "secretary.use",
      activePrefixes: [
        "/secretaria",
      ],
    },

    {
      name:
        t(locale, "nav.socialMedia"),
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
        t(locale, "nav.filmmaker"),
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
        t(locale, "nav.design"),
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
        t(locale, "nav.crm"),
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

    {
      name:
        t(locale, "nav.finance"),
      icon:
        "finance",
      path:
        "/financas",
      permission:
        "settings.manage",
      activePrefixes: [
        "/financas",
      ],
    },

    {
      name:
        t(locale, "nav.mindMap"),
      icon:
        "mindmap",
      path:
        "/mapa-mental",
      permission:
        "mindmap.view",
      activePrefixes: [
        "/mapa-mental",
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
    <aside
      className="ap-sidebar ap-sidebar-v2"
    >
      <div
        className="ap-sidebar-brand"
      >
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
          {t(locale, "nav.workspace")}
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
              <Settings size={16} />
              <span>
                {t(locale, "nav.teamAccess")}
              </span>
            </Link>

            <Link
              href="/configuracoes/integracoes"
              className="ap-sidebar-footer-link"
            >
              <CalendarDays size={16} />
              <span>
                {t(locale, "nav.integrations")}
              </span>
            </Link>

            <Link
              href="/configuracoes/relatorios"
              className="ap-sidebar-footer-link"
            >
              <FileText size={16} />
              <span>
                {t(locale, "nav.reportTemplates")}
              </span>
            </Link>

            <Link
              href="/configuracoes/calendario-editorial"
              className="ap-sidebar-footer-link"
            >
              <CalendarDays size={16} />
              <span>
                {t(locale, "nav.calendarTemplates")}
              </span>
            </Link>
          </>
        ) : null}


        <Link
          href="/minha-assinatura"
          className="ap-sidebar-footer-link"
        >
          <CreditCard size={16} />
          <span>
            {t(locale, "nav.subscription")}
          </span>
        </Link>


        <Link
          href="/ajuda"
          className="ap-sidebar-footer-link"
        >
          <Headphones size={16} />
          <span>
            {t(locale, "nav.help")}
          </span>
        </Link>


        {isSaasAdmin ? (
          <Link
            href="/central"
            className="ap-sidebar-footer-link"
          >
            <ShieldCheck size={16} />
            <span>
              {t(locale, "nav.admin")}
            </span>
          </Link>
        ) : null}


        <div className="ap-sidebar-product">
          <span>
            AprovUp
          </span>
          <span className="ap-sidebar-product-dot" />
          <span>
            {t(locale, "nav.operation")}
          </span>
        </div>
      </div>
    </aside>
  );
}