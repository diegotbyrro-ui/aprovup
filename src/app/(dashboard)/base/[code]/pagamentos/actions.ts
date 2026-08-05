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
  const code = getRequired(formData, 'code');

  if (!isValidDailyAccessCode(user.id, code)) {
    redirect('/clientes');
  }

  return { code };
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

function parseDateInput(value: string | null | undefined) {
  if (!value) return null;

  return new Date(value + 'T12:00:00');
}

function normalizePaymentStatus(status: string) {
  const allowed = ['PENDING', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED'];

  if (!allowed.includes(status)) {
    return 'PENDING';
  }

  return status as 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED' | 'REFUNDED';
}

export async function createPaymentAction(formData: FormData) {
  const { code } = await requireValidCentralForm(formData);

  const subscriptionId = getRequired(formData, 'subscriptionId');
  const amountCents = parseBrlToCents(getRequired(formData, 'amountBrl'));
  const status = normalizePaymentStatus(getRequired(formData, 'status'));

  const dueDate = parseDateInput(formData.get('dueDate')?.toString());
  const method = formData.get('method')?.toString().trim() || null;
  const externalReference = formData.get('externalReference')?.toString().trim() || null;
  const notes = formData.get('notes')?.toString().trim() || null;

  const subscription = await prisma.saasSubscription.findUnique({
    where: {
      id: subscriptionId,
    },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    throw new Error('Assinatura não encontrada.');
  }

  await prisma.saasPayment.create({
    data: {
      subscriptionId: subscription.id,
      ownerUserId: subscription.ownerUserId,
      ownerEmail: subscription.ownerEmail,
      agencyName: subscription.agencyName,
      amountCents,
      currency: 'BRL',
      status,
      dueDate,
      paidAt: status === 'PAID' ? new Date() : null,
      canceledAt: status === 'CANCELED' ? new Date() : null,
      method,
      externalReference,
      notes,
    },
  });

  revalidatePath('/base/' + code + '/pagamentos');
  revalidatePath('/base/' + code);
  redirect('/base/' + code + '/pagamentos');
}

export async function updatePaymentStatusAction(formData: FormData) {
  const { code } = await requireValidCentralForm(formData);

  const paymentId = getRequired(formData, 'paymentId');
  const status = normalizePaymentStatus(getRequired(formData, 'status'));

  await prisma.saasPayment.update({
    where: {
      id: paymentId,
    },
    data: {
      status,
      paidAt: status === 'PAID' ? new Date() : null,
      canceledAt: status === 'CANCELED' ? new Date() : null,
    },
  });

  revalidatePath('/base/' + code + '/pagamentos');
  revalidatePath('/base/' + code);
  redirect('/base/' + code + '/pagamentos');
}