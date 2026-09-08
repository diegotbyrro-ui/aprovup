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
  Search,
} from "lucide-react";

import {
  AprovUpLogo,
} from "@/components/brand/AprovUpLogo";

import {
  AprovUpThemeToggle,
} from "@/components/theme/AprovUpThemeToggle";


const items = [
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
          mb-4
        "
      >
        <AprovUpLogo size="sm" />
      </div>


      <Link
        className="
          ap-sidebar-link
          mb-6
          flex
          min-h-[44px]
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

        Voltar para o AprovUp

      </Link>


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
            pathname ===
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
        "
      >

        <AprovUpThemeToggle />

      </div>

    </aside>
  );
}