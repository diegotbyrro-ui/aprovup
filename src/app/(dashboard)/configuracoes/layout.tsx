import type {
  ReactNode,
} from "react";

import {
  requirePermission,
} from "@/lib/userAccess";


export default async function PermissionLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  await requirePermission(
    "settings.manage"
  );

  return children;
}