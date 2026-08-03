'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCommanderAccess } from '@/lib/commanderAccess';
import { isValidDailyAccessCode } from '@/lib/dailyAccess';
import { prisma } from '@/lib/prisma';

function getRequired(formData: FormData, name: string) {
  const value = formData.get(name)?.toString().trim();

  if (!value) {
    throw new Error(`Campo obrigatório ausente: ${name}`);
  }

  return value;
}

async function requireValidCentralForm(formData: FormData) {
  const user = await requireCommanderAccess();
  const code = getRequired(formData, 'code');

  if (!isValidDailyAccessCode(user.id, code)) {
    redirect('/clientes');
  }

  return { code };
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function normalizeSubscriptionStatus(status: string) {
  const allowed = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED'];

  if (!allowed.includes(status)) {
    return 'ACTIVE';
  }

  return status as 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'PAUSED' | 'CANCELED' | 'EXPIRED';
}

export async function saveAgencySubscriptionAction(formData: FormData) {
  const { code } = await requireValidCentralForm(formData);

  const ownerUserId = getRequired(formData, 'ownerUserId');
  const planId = getRequired(formData, 'planId');
  const agencyName = getRequired(formData, 'agencyName');
  const status = normalizeSubscriptionStatus(getRequired(formData, 'status'));
  const notes = formData.get('notes')?.toString().trim() || null;

  const [owner, plan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ownerUserId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    prisma.saasPlan.findUnique({
      where: { id: planId },
    }),
  ]);

  if (!owner) {
    throw new Error('Usuário dono da agência não encontrado.');
  }

  if (!plan) {
    throw new Error('Plano não encontrado.');
  }

  const now = new Date();
  const currentPeriodEnd = addDays(now, 30);

  const existingSubscription = await prisma.saasSubscription.findFirst({
    where: {
      ownerUserId,
      status: {
        in: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const data = {
    planId: plan.id,
    ownerEmail: owner.email,
    agencyName,
    status,
    priceCents: plan.priceCents,
    monthlyAiLimitCents: plan.monthlyAiLimitCents,
    canUseAi: plan.canUseAi,
    canUseCrm: plan.canUseCrm,
    canUseSocialPosting: plan.canUseSocialPosting,
    canUseReports: plan.canUseReports,
    currentPeriodEnd,
    canceledAt: status === 'CANCELED' ? now : null,
    notes,
  };

  if (existingSubscription) {
    await prisma.saasSubscription.update({
      where: {
        id: existingSubscription.id,
      },
      data: {
        ...data,
        currentPeriodStart: existingSubscription.currentPeriodStart || now,
      },
    });
  } else {
    await prisma.saasSubscription.create({
      data: {
        ownerUserId: owner.id,
        currentPeriodStart: now,
        ...data,
      },
    });
  }

  revalidatePath(`/base/${code}/assinaturas`);
  revalidatePath(`/base/${code}`);
  redirect(`/base/${code}/assinaturas`);
}

export async function updateSubscriptionStatusAction(formData: FormData) {
  const { code } = await requireValidCentralForm(formData);

  const subscriptionId = getRequired(formData, 'subscriptionId');
  const status = normalizeSubscriptionStatus(getRequired(formData, 'status'));

  await prisma.saasSubscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      status,
      canceledAt: status === 'CANCELED' ? new Date() : null,
    },
  });

  revalidatePath(`/base/${code}/assinaturas`);
  revalidatePath(`/base/${code}`);
  redirect(`/base/${code}/assinaturas`);
}