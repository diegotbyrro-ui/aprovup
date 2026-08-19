import type {
  ReactNode,
} from "react";

import {
  requireAnyPermission,
} from "@/lib/userAccess";


export default async function ContentPermissionLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  await requireAnyPermission([
    "social.view",
    "design.view",
    "filmmaker.view",
  ]);

  return children;
}