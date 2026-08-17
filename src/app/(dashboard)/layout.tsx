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


export default function DashboardLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="aprovup-app-shell flex h-screen w-full overflow-hidden">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />

        <main className="ap-app-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1680px] px-6 py-6 2xl:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}