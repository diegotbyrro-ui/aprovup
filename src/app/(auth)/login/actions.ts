'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    redirect('/login?error=empty');
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user || !user.password) {
    redirect('/login?error=invalid');
  }

  if (user.status === 'PENDENTE') {
    redirect('/login?error=pending');
  }

  if (user.status === 'RECUSADO') {
    redirect('/login?error=rejected');
  }

  if (user.status === 'INATIVO') {
    redirect('/login?error=inactive');
  }

  if (user.status !== 'APROVADO') {
    redirect('/login?error=unauthorized');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    redirect('/login?error=invalid');
  }

  const cookieStore = await cookies();

  cookieStore.set('levelup_user_id', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect('/dashboard');
}

export async function logoutAction() {
  const cookieStore = await cookies();

  cookieStore.delete('levelup_user_id');

  redirect('/login');
}


