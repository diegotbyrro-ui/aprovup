import "../../aprovup-theme.css";
import "./crm-original.css";


import { redirect } from "next/navigation";

import { SalesOsSidebar } from "@/components/sales-os/SalesOsSidebar";
import { createClient } from "@/lib/crm-supabase/server";

import { requireCrmViewAccess } from "@/lib/crmAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";


export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCrmViewAccess();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crm/auth");
  }

  return (
    <div
      className="aprovup-app-shell aprovup-sales-shell"
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <SalesOsSidebar />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: "100vh",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <div className="crm-legacy-shell">
          {children}
        </div>
      </main>
    </div>
  );
}