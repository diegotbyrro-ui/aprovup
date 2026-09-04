import type {
  ReactNode,
} from "react";

import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  requireCurrentUser,
} from "@/lib/auth";

import {
  canAccessClient,
} from "@/lib/clientAccess";


export default async function ContentAccessLayout({
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


  const content =
    await prisma.content.findFirst({
      where: {
        id,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },

      select: {
        client: {
          select: {
            agencyId:
              true,

            internalResponsible:
              true,
          },
        },
      },
    });


  if (
    !content ||
    !canAccessClient(
      currentUser,
      content.client
    )
  ) {
    redirect(
      "/clientes"
    );
  }


  return children;
}