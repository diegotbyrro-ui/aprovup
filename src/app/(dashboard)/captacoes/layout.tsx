import type {
  ReactNode,
} from "react";

import {
  requireAnyPermission,
} from "@/lib/userAccess";


export default async function CapturePermissionLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  await requireAnyPermission([
    "social.view",
    "filmmaker.view",
  ]);

  return children;
}