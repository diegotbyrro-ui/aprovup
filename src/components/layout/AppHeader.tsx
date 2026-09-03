import {
  prisma,
} from "@/lib/prisma";

import {
  requireAgencyContext,
} from "@/lib/tenant";

import {
  AppHeaderClient,
} from "@/components/layout/AppHeaderClient";


export async function AppHeader() {
  const {
    user,
    agencyId,
  } =
    await requireAgencyContext();


  const notificationCount =
    await prisma.comment.count({
      where: {
        content: {
          client: {
            agencyId,
          },
        },

        OR: [
          {
            message: {
              contains:
                "DÚVIDA",
            },
          },
          {
            message: {
              contains:
                "DUVIDA",
            },
          },
          {
            message: {
              contains:
                "ALTERAÇÃO",
            },
          },
          {
            message: {
              contains:
                "ALTERACAO",
            },
          },
          {
            message: {
              contains:
                "REAGENDAMENTO",
            },
          },
          {
            message: {
              contains:
                "AJUSTE",
            },
          },
        ],
      },
    });


  return (
    <AppHeaderClient
      userName={
        user.name
      }
      userEmail={
        user.email
      }
      role={
        user.role
      }
      notificationCount={
        notificationCount
      }
    />
  );
}