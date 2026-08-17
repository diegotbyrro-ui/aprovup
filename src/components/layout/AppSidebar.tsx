import Link from "next/link";

import {
  CircleHelp,
  CreditCard,
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
  canUseFeature,
  getCurrentUserSaasAccess,
  type SaasFeature,
} from "@/lib/saasAccess";


type MenuDefinition = {
  name: string;
  path: string;
  roles: string[];
  requiredFeature?: SaasFeature;
  icon:
    | "dashboard"
    | "social"
    | "filmmaker"
    | "design"
    | "crm";
  activePrefixes: string[];
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


  const definitions: MenuDefinition[] = [
    {
      name: "Dashboard",
      icon: "dashboard",
      path: "/operacao",
      roles: baseRoles,
      activePrefixes: [
        "/operacao",
      ],
    },
    {
      name: "Social Media",
      icon: "social",
      path: "/clientes",
      roles: [
        "DIRECTOR",
        "SOCIAL_MEDIA",
      ],
      activePrefixes: [
        "/clientes",
        "/social-media",
        "/calendario-editorial",
      ],
    },
    {
      name: "Filmmaker",
      icon: "filmmaker",
      path: "/filmmaker",
      roles: [
        "DIRECTOR",
        "FILMMAKER",
      ],
      activePrefixes: [
        "/filmmaker",
        "/captacoes",
      ],
    },
    {
      name: "Design",
      icon: "design",
      path: "/design",
      roles: [
        "DIRECTOR",
        "DESIGN",
      ],
      activePrefixes: [
        "/design",
      ],
    },
    {
      name: "CRM",
      icon: "crm",
      path: "/crm",
      roles: [
        "DIRECTOR",
        "SOCIAL_MEDIA",
      ],
      requiredFeature: "crm",
      activePrefixes: [
        "/crm",
      ],
    },
  ];


  const items: AppSidebarNavItem[] =
    definitions
      .filter(
        (item) =>
          item.roles.includes(
            user.role
          )
      )
      .map((item) => {
        const blocked =
          item.requiredFeature
            ? !canUseFeature(
                access,
                item.requiredFeature
              )
            : false;

        return {
          name: item.name,
          path: item.path,
          href: blocked
            ? "/acesso-bloqueado"
            : item.path,
          blocked,
          icon: item.icon,
          activePrefixes:
            item.activePrefixes,
        };
      });


  return (
    <aside className="ap-sidebar ap-sidebar-v2">
      <div className="ap-sidebar-brand">
        <AprovUpLogo
          size="sm"
          className="w-[158px]"
        />
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
        <Link
          href="/minha-assinatura"
          className="ap-sidebar-footer-link"
        >
          <CreditCard size={16} />

          <span>
            Minha assinatura
          </span>
        </Link>

        <Link
          href="/central"
          className="ap-sidebar-footer-link"
        >
          <CircleHelp size={16} />

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