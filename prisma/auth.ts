import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('levelup_user_id')?.value;

    if (!userId) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user || user.status !== 'APROVADO') {
        return null;
    }

    return user;
}

export async function requireCurrentUser() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/login');
    }

    return user;
}

export function isDirector(role: string) {
    return role === 'DIRECTOR';
}

export function isSocialMedia(role: string) {
    return role === 'SOCIAL_MEDIA';
}

export function isDesign(role: string) {
    return role === 'DESIGN';
}

export function isFilmmaker(role: string) {
    return role === 'FILMMAKER';
}