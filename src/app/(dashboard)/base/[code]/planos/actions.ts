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

function parseInteger(value: string, fallback = 0) {
  const clean = value.replace(/[^\d-]/g, '');
  const parsed = Number.parseInt(clean, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function parseBrlToCents(value: string) {
  const clean = value
    .replace(/\s/g, '')
    .replace(/R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(clean);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100);
}

function normalizeStatus(status: string) {
  const allowed = ['ACTIVE', 'PAUSED', 'ARCHIVED'];

  if (!allowed.includes(status)) {
    return 'ACTIVE';
  }

  return status as 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}

async function requireValidCentralForm(formData: FormData) {
  const user = await requireCommanderAccess();
  const code = getRequired(formData, 'code');

  if (!isValidDailyAccessCode(user.id, code)) {
    redirect('/clientes');
  }

  return { user, code };
}

export async function updateSaasPlanAction(formData: FormData) {
  const { code } = await requireValidCentralForm(formData);

  const planId = getRequired(formData, 'planId');
  const name = getRequired(formData, 'name');
  const slug = getRequired(formData, 'slug');

  const description = formData.get('description')?.toString().trim() || null;
  const status = normalizeStatus(getRequired(formData, 'status'));

  const priceCents = parseBrlToCents(getRequired(formData, 'priceBrl'));
  const setupFeeCents = parseBrlToCents(formData.get('setupFeeBrl')?.toString() || '0');

  const maxClients = parseInteger(getRequired(formData, 'maxClients'), 10);
  const maxUsers = parseInteger(getRequired(formData, 'maxUsers'), 3);
  const monthlyAiLimitCents = parseBrlToCents(formData.get('monthlyAiLimitBrl')?.toString() || '0');

  await prisma.saasPlan.update({
    where: {
      id: planId,
    },
    data: {
      name,
      slug,
      description,
      status,
      priceCents,
      setupFeeCents,
      maxClients,
      maxUsers,
      monthlyAiLimitCents,
      canUseAi: formData.get('canUseAi') === 'on',
      canUseCrm: formData.get('canUseCrm') === 'on',
      canUseSocialPosting: formData.get('canUseSocialPosting') === 'on',
      canUseReports: formData.get('canUseReports') === 'on',
      isPublic: formData.get('isPublic') === 'on',
    },
  });

  revalidatePath(`/base/${code}/planos`);
  redirect(`/base/${code}/planos`);
}

export async function toggleSaasPlanStatusAction(formData: FormData) {
  const { code } = await requireValidCentralForm(formData);

  const planId = getRequired(formData, 'planId');
  const currentStatus = getRequired(formData, 'currentStatus');

  const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

  await prisma.saasPlan.update({
    where: {
      id: planId,
    },
    data: {
      status: nextStatus,
    },
  });

  revalidatePath(`/base/${code}/planos`);
  redirect(`/base/${code}/planos`);
}