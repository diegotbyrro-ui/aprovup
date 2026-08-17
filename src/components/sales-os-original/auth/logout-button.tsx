"use client";

import { createClient } from "@/lib/sales-os-original/supabase/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleLogout() {
    setIsLeaving(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      className="logout-button"
      disabled={isLeaving}
      onClick={handleLogout}
      type="button"
    >
      <LogOut size={16} />
      {isLeaving ? "Saindo..." : "Sair"}
    </button>
  );
}