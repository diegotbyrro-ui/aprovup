import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  isCommanderUser,
} from "@/lib/commanderAccess";

import {
  getDirectorIntegrationAlerts,
} from "@/lib/integrationHealth";


export async function DirectorIntegrationAlert() {
  const user =
    await getCurrentUser();

  if (
    !user ||
    user.role !==
      "DIRECTOR" ||
    !user.agencyId
  ) {
    return null;
  }

  let alerts:
    string[] =
      [];

  try {
    alerts =
      await getDirectorIntegrationAlerts(
        user.agencyId,
        isCommanderUser(
          user
        )
      );
  }
  catch {
    return null;
  }

  if (
    alerts.length ===
    0
  ) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 sm:px-4 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-amber-900">
          <AlertTriangle
            size={15}
            className="shrink-0 text-amber-600"
          />

          <span className="truncate">
            {"Aten\u00e7\u00e3o nas integra\u00e7\u00f5es: "}
            {alerts.join(
              " \u2022 "
            )}
          </span>
        </div>

        <Link
          href="/configuracoes/integracoes#saude-integracoes"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950"
        >
          Ver detalhes

          <ArrowRight
            size={13}
          />
        </Link>
      </div>
    </div>
  );
}