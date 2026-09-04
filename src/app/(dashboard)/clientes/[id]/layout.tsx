import type {
  ReactNode,
} from "react";

import {
  requireCurrentUser,
} from "@/lib/auth";

import {
  requireClientAccess,
} from "@/lib/clientAccess";


export default async function ClientAccessLayout({
  children,
  params,
}: {
  children:
    ReactNode;

  params:
    Promise<{
      id: string;
    }>;
}) {

  const currentUser =
    await requireCurrentUser();


  const {
    id,
  } =
    await params;


  await requireClientAccess(
    currentUser,
    id
  );


  return children;
}