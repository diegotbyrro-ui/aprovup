'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCommanderAccess } from '@/lib/commanderAccess';
import { isValidDailyAccessCode } from '@/lib/dailyAccess';
import { prisma } from '@/lib/prisma';

function getRequired(formData: FormData, name: string) {
  const value = formData.get(name)?.toString().trim();

  if (!value) {
    throw new Error('Campo obrigatório ausente: ' + name);
  }

  return value;
}

async function requireValidCentralForm(formData: FormData) {
  const user = await requireCommanderAccess();
  const centralCode = getRequired(formData, 'centralCode');

  if (!isValidDailyAccessCode(user.id, centralCode)) {
    redirect('/clientes');
  }

  return { centralCode };
}

function parseInteger(value: string | null | undefined, fallback = 0) {
  if (!value) return fallback;

  const clean = value.replace(/[^\d-]/g, '');
  const parsed = Number.parseInt(clean, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function parseBrlToCents(value: string | null | undefined) {
  if (!value) return null;

  const clean = value
    .replace(/\s/g, '')
    .replace(/R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(clean);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

function parseDateInput(value: string | null | undefined) {
  if (!value) return null;

  return new Date(value + 'T12:00:00');
}

function normalizeCouponStatus(status: string) {
  const allowed = ['ACTIVE', 'PAUSED', 'EXPIRED'];

  if (!allowed.includes(status)) {
    return 'ACTIVE';
  }

  return status as 'ACTIVE' | 'PAUSED' | 'EXPIRED';
}

function normalizeDiscountType(discountType: string) {
  const allowed = ['PERCENTAGE', 'FIXED_AMOUNT'];

  if (!allowed.includes(discountType)) {
    return 'PERCENTAGE';
  }

  return discountType as 'PERCENTAGE' | 'FIXED_AMOUNT';
}

export async function createCouponAction(formData: FormData) {
  const { centralCode } = await requireValidCentralForm(formData);

  const rawCode = getRequired(formData, 'couponCode');
  const couponCode = rawCode.toUpperCase().replace(/\s/g, '-');

  const description = formData.get('description')?.toString().trim() || null;
  const status = normalizeCouponStatus(getRequired(formData, 'status'));
  const discountType = normalizeDiscountType(getRequired(formData, 'discountType'));

  const discountPercent = discountType === 'PERCENTAGE'
    ? parseInteger(formData.get('discountPercent')?.toString(), 0)
    : null;

  const discountCents = discountType === 'FIXED_AMOUNT'
    ? parseBrlToCents(formData.get('discountBrl')?.toString())
    : null;

  const appliesToPlanSlug = formData.get('appliesToPlanSlug')?.toString().trim() || null;
  const maxUsesValue = formData.get('maxUses')?.toString().trim();
  const maxUses = maxUsesValue ? parseInteger(maxUsesValue, 0) : null;

  const validFrom = parseDateInput(formData.get('validFrom')?.toString());
  const validUntil = parseDateInput(formData.get('validUntil')?.toString());

  await prisma.saasCoupon.upsert({
    where: {
      code: couponCode,
    },
    update: {
      description,
      status,
      discountType,
      discountPercent,
      discountCents,
      appliesToPlanSlug,
      maxUses,
      validFrom,
      validUntil,
    },
    create: {
      code: couponCode,
      description,
      status,
      discountType,
      discountPercent,
      discountCents,
      appliesToPlanSlug,
      maxUses,
      validFrom,
      validUntil,
    },
  });

  revalidatePath('/base/' + centralCode + '/cupons');
  revalidatePath('/base/' + centralCode);
  redirect('/base/' + centralCode + '/cupons');
}

export async function updateCouponStatusAction(formData: FormData) {
  const { centralCode } = await requireValidCentralForm(formData);

  const couponId = getRequired(formData, 'couponId');
  const status = normalizeCouponStatus(getRequired(formData, 'status'));

  await prisma.saasCoupon.update({
    where: {
      id: couponId,
    },
    data: {
      status,
    },
  });

  revalidatePath('/base/' + centralCode + '/cupons');
  revalidatePath('/base/' + centralCode);
  redirect('/base/' + centralCode + '/cupons');
}

export async function resetCouponUsageAction(formData: FormData) {
  const { centralCode } = await requireValidCentralForm(formData);

  const couponId = getRequired(formData, 'couponId');

  await prisma.saasCoupon.update({
    where: {
      id: couponId,
    },
    data: {
      usedCount: 0,
    },
  });

  revalidatePath('/base/' + centralCode + '/cupons');
  redirect('/base/' + centralCode + '/cupons');
}