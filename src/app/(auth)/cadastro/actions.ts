'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const allowedRoles = ['DIRECTOR', 'SOCIAL_MEDIA', 'DESIGN', 'FILMMAKER'];

export async function registerAction(formData: FormData) {
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '').trim();
    const role = String(formData.get('role') || '').trim();

    if (!name || !email || !password || !role) {
        redirect('/cadastro?error=empty');
    }

    if (!allowedRoles.includes(role)) {
        redirect('/cadastro?error=role');
    }

    if (password.length < 6) {
        redirect('/cadastro?error=password');
    }

    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
    });

    if (existingUser) {
        redirect('/cadastro?error=exists');
    }

    const approvedDirectorsCount = await prisma.user.count({
        where: {
            role: 'DIRECTOR',
            status: 'APROVADO',
        },
    });

    const shouldAutoApproveFirstDirector =
        role === 'DIRECTOR' && approvedDirectorsCount === 0;

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role,
            status: shouldAutoApproveFirstDirector ? 'APROVADO' : 'PENDENTE',
            approvedAt: shouldAutoApproveFirstDirector ? new Date() : null,
            approvedByName: shouldAutoApproveFirstDirector
                ? 'Sistema - primeiro diretor'
                : null,
        },
    });

    if (shouldAutoApproveFirstDirector) {
        redirect('/login?registered=true');
    }

    redirect('/login?registered=true');
}

