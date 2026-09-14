import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/auth';
import { isCommanderUser } from '@/lib/commanderAccess';
import { prisma } from '@/lib/prisma';

export type SaasFeature = 'ai' | 'crm' | 'socialPosting' | 'reports';

export type SaasAccessResult = {
  hasActiveSubscription: boolean;
  isCommander: boolean;
  subscription: {
    id: string;
    status: string;
    agencyName: string | null;
    ownerUserId: string;
    ownerEmail: string | null;
    priceCents: number;
    monthlyAiLimitCents: number;
    canUseAi: boolean;
    canUseCrm: boolean;
    canUseSocialPosting: boolean;
    canUseReports: boolean;
    currentPeriodEnd: Date | null;
    plan: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
  permissions: {
    canUseAi: boolean;
    canUseCrm: boolean;
    canUseSocialPosting: boolean;
    canUseReports: boolean;
  };
};

const activeStatuses = ['TRIAL', 'ACTIVE'] as const;

export async function getCurrentUserSaasAccess(): Promise<SaasAccessResult> {
  const user = await requireCurrentUser();
  const isCommander = isCommanderUser(user);

  if (isCommander) {
    return {
      hasActiveSubscription: true,
      isCommander: true,
      subscription: null,
      permissions: {
        canUseAi: true,
        canUseCrm: true,
        canUseSocialPosting: true,
        canUseReports: true,
      },
    };
  }

  const subscriptionOwnerIds = [
    user.id,
  ];


  let agencyHasCommander =
    false;


  if (user.agencyId) {
    const directors =
      await prisma.user.findMany({
        where: {
          agencyId:
            user.agencyId,

          role:
            'DIRECTOR',

          status:
            'APROVADO',
        },

        select: {
          id:
            true,

          role:
            true,

          status:
            true,
        },
      });


    agencyHasCommander =
      directors.some(
        (
          director
        ) =>
          isCommanderUser(
            director
          )
      );


    for (
      const director
      of directors
    ) {
      if (
        !subscriptionOwnerIds.includes(
          director.id
        )
      ) {
        subscriptionOwnerIds.push(
          director.id
        );
      }
    }
  }


  /*
   * Equipe interna da agencia Commander:
   * Social Media pode operar publicacoes mesmo
   * quando nao existe uma assinatura SaaS separada
   * para cada colaborador.
   */
  if (
    user.role ===
      'SOCIAL_MEDIA' &&
    agencyHasCommander
  ) {
    return {
      hasActiveSubscription:
        true,

      isCommander:
        false,

      subscription:
        null,

      permissions: {
        canUseAi:
          false,

        canUseCrm:
          false,

        canUseSocialPosting:
          true,

        canUseReports:
          false,
      },
    };
  }


  const subscription = await prisma.saasSubscription.findFirst({
    where: {
      ownerUserId: {
        in:
          subscriptionOwnerIds,
      },

      status: {
        in: [...activeStatuses],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      isCommander: false,
      subscription: null,
      permissions: {
        canUseAi: false,
        canUseCrm: false,
        canUseSocialPosting: false,
        canUseReports: false,
      },
    };
  }

  return {
    hasActiveSubscription: true,
    isCommander: false,
    subscription,
    permissions: {
      canUseAi: subscription.canUseAi,
      canUseCrm: subscription.canUseCrm,
      canUseSocialPosting: subscription.canUseSocialPosting,
      canUseReports: subscription.canUseReports,
    },
  };
}

export async function requireActiveSaasSubscription() {
  const access = await getCurrentUserSaasAccess();

  if (!access.hasActiveSubscription) {
    redirect('/acesso-bloqueado');
  }

  return access;
}

export async function requireSaasFeature(feature: SaasFeature) {
  const access = await requireActiveSaasSubscription();

  const featureMap = {
    ai: access.permissions.canUseAi,
    crm: access.permissions.canUseCrm,
    socialPosting: access.permissions.canUseSocialPosting,
    reports: access.permissions.canUseReports,
  };

  if (!featureMap[feature]) {
    redirect('/acesso-bloqueado');
  }

  return access;
}

export function canUseFeature(access: SaasAccessResult, feature: SaasFeature) {
  const featureMap = {
    ai: access.permissions.canUseAi,
    crm: access.permissions.canUseCrm,
    socialPosting: access.permissions.canUseSocialPosting,
    reports: access.permissions.canUseReports,
  };

  return featureMap[feature];
}