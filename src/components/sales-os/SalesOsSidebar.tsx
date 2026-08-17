"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";

import {
  AprovUpLogo,
} from "@/components/brand/AprovUpLogo";

import {
  AprovUpThemeToggle,
} from "@/components/theme/AprovUpThemeToggle";


const items = [
  {
    name: "Dashboard",
    href: "/crm",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "CRM",
    href: "/crm/pipeline",
    icon: BriefcaseBusiness,
  },
  {
    name: "Agenda",
    href: "/crm/agenda",
    icon: CalendarDays,
  },
  {
    name: "Prospector IA",
    href: "/crm/prospector",
    icon: Search,
  },
  {
    name: "Relatórios",
    href: "/crm/relatorios",
    icon: ChartNoAxesCombined,
  },
  {
    name: "Configurações",
    href: "/crm/configuracoes",
    icon: Settings,
  },
];


export function SalesOsSidebar() {

  const pathname =
    usePathname();


  return (
    <aside
      className="
        ap-sidebar
        flex
        min-h-screen
        w-60
        min-w-60
        flex-col
        border-r
        p-4
      "
    >

      <div
        className="
          ap-sidebar-logo
          mb-6
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

        {items.map((item) => {

          const Icon =
            item.icon;

          const active =
            item.exact
              ? pathname ===
                item.href
              : pathname ===
                  item.href ||
                pathname.startsWith(
                  `${item.href}/`
                );


          return (
            <Link
              className={[
                `
                  ap-sidebar-link
                  flex
                  min-h-[44px]
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  text-xs
                  font-bold
                `,
                active
                  ? "ap-sidebar-link-active"
                  : "",
              ].join(" ")}
              href={item.href}
              key={item.href}
            >

              <Icon size={17} />

              {item.name}

            </Link>
          );
        })}

      </nav>


      <div
        className="
          mt-5
          space-y-3
        "
      >

        <AprovUpThemeToggle />


        <Link
          className="
            ap-sidebar-link
            flex
            min-h-[42px]
            items-center
            gap-2
            rounded-xl
            border
            border-[var(--ap-border)]
            px-3
            text-xs
            font-bold
          "
          href="/operacao"
        >

          <ArrowLeft size={16} />

          Voltar ao AprovUp

        </Link>

      </div>

    </aside>
  );
}