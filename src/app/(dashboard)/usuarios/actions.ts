'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/userAccess';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const allowedRoles = ['DIRECTOR', 'SOCIAL_MEDIA', 'DESIGN', 'FILMMAKER'];
const allowedStatuses = ['PENDENTE', 'APROVADO', 'RECUSADO', 'INATIVO'];

async function requireDirectorUser() {
  return requirePermission(
    'users.manage'
  );
}

export async function approveUser(userId: string) {
  const currentUser = await requireDirectorUser();

  await prisma.user.update({
    where: {
      id: userId,
      agencyId:
        currentUser.agencyId,
    },
    data: {
      status: 'APROVADO',
      approvedAt: new Date(),
      approvedByName: currentUser.name || currentUser.email || 'Diretor',
    },
  });

  revalidatePath('/usuarios');
}

export async function rejectUser(userId: string) {
  const currentUser = await requireDirectorUser();

  await prisma.user.update({
    where: {
      id: userId,
      agencyId:
        currentUser.agencyId,
    },
    data: {
      status: 'RECUSADO',
      approvedAt: null,
      approvedByName: currentUser.name || currentUser.email || 'Diretor',
    },
  });

  revalidatePath('/usuarios');
}

export async function deactivateUser(userId: string) {
  const currentUser = await requireDirectorUser();

  if (currentUser.id === userId) {
    redirect('/usuarios?error=self');
  }

  await prisma.user.update({
    where: {
      id: userId,
      agencyId:
        currentUser.agencyId,
    },
    data: {
      status: 'INATIVO',
    },
  });

  revalidatePath('/usuarios');
}

export async function updateUserAccess(userId: string, formData: FormData) {
  const currentUser = await requireDirectorUser();

  const role = String(formData.get('role') || '').trim();
  const status = String(formData.get('status') || '').trim();

  if (!allowedRoles.includes(role) || !allowedStatuses.includes(status)) {
    redirect('/usuarios?error=invalid');
  }

  if (currentUser.id === userId && status !== 'APROVADO') {
    redirect('/usuarios?error=self');
  }

  await prisma.user.update({
    where: {
      id: userId,
      agencyId:
        currentUser.agencyId,
    },
    data: {
      role,
      status,
      approvedAt: status === 'APROVADO' ? new Date() : null,
      approvedByName:
        status === 'APROVADO'
          ? currentUser.name || currentUser.email || 'Diretor'
          : null,
    },
  });

  revalidatePath('/usuarios');
}


