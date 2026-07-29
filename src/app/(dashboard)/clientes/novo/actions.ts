'use server';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function logHistory(
    entityType: string,
    entityId: string,
    action: string,
    description: string,
    authorName: string
) {
    await prisma.historyLog.create({
        data: {
            entityType,
            entityId,
            action,
            description,
            authorName,
        },
    });
}

export async function createClientAction(formData: FormData) {
    const currentUser = await requireCurrentUser();

    if (!isDirector(currentUser.role)) {
        redirect('/dashboard');
    }

    const name = String(formData.get('name') || '').trim();

    if (!name) {
        redirect('/clientes/novo?error=name');
    }

    const monthlyContentGoalValue = Number(
        formData.get('monthlyContentGoal') || 0
    );

    const client = await prisma.client.create({
        data: {
            name,
            segment: String(formData.get('segment') || '').trim(),
            internalResponsible: String(
                formData.get('internalResponsible') || ''
            ).trim(),
            postingFrequency: String(formData.get('postingFrequency') || '').trim(),
            monthlyContentGoal: Number.isNaN(monthlyContentGoalValue)
                ? 0
                : monthlyContentGoalValue,
            toneOfVoice: String(formData.get('toneOfVoice') || '').trim(),
            contractedServices: String(
                formData.get('contractedServices') || ''
            ).trim(),
            strategicNotes: String(formData.get('strategicNotes') || '').trim(),
            usefulLinks: String(formData.get('usefulLinks') || '').trim(),
        },
    });

    await logHistory(
        'CLIENT',
        client.id,
        'CREATED',
        `Cliente ${client.name} criado.`,
        currentUser.name || currentUser.email || 'Diretor'
    );

    revalidatePath('/clientes');
    revalidatePath('/dashboard');

    redirect('/clientes');
}

