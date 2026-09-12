import "../aprovup-theme.css";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export const fetchCache =
  "force-no-store";


import {
  AppSidebar,
} from "@/components/layout/AppSidebar";

import {
  AppHeader,
} from "@/components/layout/AppHeader";


import {
  DirectorIntegrationAlert,
} from "@/components/layout/DirectorIntegrationAlert";

import {
  RouteScrollReset,
} from "@/components/layout/RouteScrollReset";


export default function DashboardLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="aprovup-app-shell fixed inset-0 flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden">
      <AppSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <DirectorIntegrationAlert />

        <RouteScrollReset>
          {children}
        </RouteScrollReset>
      </div>
    </div>
  );
}
