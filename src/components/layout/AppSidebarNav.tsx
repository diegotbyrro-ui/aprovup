"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BriefcaseBusiness,
  LayoutDashboard,
  Lock,
  PenTool,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";


export type AppSidebarNavItem = {
  name: string;
  path: string;
  href: string;
  blocked: boolean;
  icon:
    | "dashboard"
    | "social"
    | "filmmaker"
    | "design"
    | "crm";
  activePrefixes: string[];
};


const iconMap: Record<
  AppSidebarNavItem["icon"],
  LucideIcon
> = {
  dashboard: LayoutDashboard,
  social: Users,
  filmmaker: Video,
  design: PenTool,
  crm: BriefcaseBusiness,
};


function itemIsActive(
  pathname: string,
  item: AppSidebarNavItem
) {
  if (item.blocked) {
    return false;
  }

  return item.activePrefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(
        `${prefix}/`
      )
  );
}


export function AppSidebarNav({
  items,
}: {
  items: AppSidebarNavItem[];
}) {
  const pathname =
    usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon =
          iconMap[item.icon];

        const active =
          itemIsActive(
            pathname,
            item
          );

        return (
          <Link
            href={item.href}
            key={item.name}
            aria-current={
              active
                ? "page"
                : undefined
            }
            className={[
              "ap-sidebar-nav-link",
              active
                ? "ap-sidebar-nav-link-active"
                : "",
              item.blocked
                ? "ap-sidebar-nav-link-blocked"
                : "",
            ].join(" ")}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="ap-sidebar-nav-icon">
                <Icon size={17} />
              </span>

              <span className="truncate">
                {item.name}
              </span>
            </span>

            {item.blocked ? (
              <span
                className="ap-sidebar-lock"
                title="Recurso indisponível no plano atual"
              >
                <Lock size={12} />
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}