import {
  prisma,
} from "@/lib/prisma";

import {
  requireAgencyContext,
} from "@/lib/tenant";

import {
  AppHeaderClient,
} from "@/components/layout/AppHeaderClient";

import {
  getLocale,
} from "@/lib/i18n-server";


export async function AppHeader() {
  const locale =
    await getLocale();

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
      locale={
        locale
      }
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