'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/userAccess';
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

function text(formData: FormData, name: string) {
    return String(formData.get(name) || '').trim();
}

export async function createClientAction(formData: FormData) {
    const currentUser = await requirePermission('social.manage');

    const name = text(formData, 'name');

    if (!name) {
        redirect('/clientes/novo?error=name');
    }

    const monthlyContentGoalValue = Number(
        formData.get('monthlyContentGoal') || 0
    );

    const client = await prisma.client.create({
        data: {
            name,

            // Dados basicos
            legalName: text(formData, 'legalName'),
            cnpj: text(formData, 'cnpj'),
            segment: text(formData, 'segment'),
            mainContact: text(formData, 'mainContact'),
            contactPhone: text(formData, 'contactPhone'),
            contactEmail: text(formData, 'contactEmail'),
            companyAddress: text(formData, 'companyAddress'),

            // Contrato e operacao
            internalResponsible: text(
                formData,
                'internalResponsible'
            ),
            monthlyContentGoal: Number.isNaN(
                monthlyContentGoalValue
            )
                ? 0
                : monthlyContentGoalValue,
            postingFrequency: text(
                formData,
                'postingFrequency'
            ),
            toneOfVoice: text(
                formData,
                'toneOfVoice'
            ),
            contractedServices: text(
                formData,
                'contractedServices'
            ),

            // Materiais e links
            databaseLink: text(
                formData,
                'databaseLink'
            ),
            driveLink: text(
                formData,
                'driveLink'
            ),
            logoLink: text(
                formData,
                'logoLink'
            ),
            usefulLinks: text(
                formData,
                'usefulLinks'
            ),

            // Briefing estrategico
            businessDescription: text(
                formData,
                'businessDescription'
            ),
            targetAudience: text(
                formData,
                'targetAudience'
            ),
            brandDifferentials: text(
                formData,
                'brandDifferentials'
            ),
            marketingGoals: text(
                formData,
                'marketingGoals'
            ),
            competitors: text(
                formData,
                'competitors'
            ),
            benchmarkNotes: text(
                formData,
                'benchmarkNotes'
            ),
            contentPillars: text(
                formData,
                'contentPillars'
            ),
            contentRestrictions: text(
                formData,
                'contentRestrictions'
            ),
            clientBriefing: text(
                formData,
                'clientBriefing'
            ),

            // Campos adicionais existentes
            strategicNotes: text(
                formData,
                'strategicNotes'
            ),
            personaNotes: text(
                formData,
                'personaNotes'
            ),
        },
    });

    await logHistory(
        'CLIENT',
        client.id,
        'CREATED',
        `Cliente ${client.name} criado.`,
        currentUser.name ||
            currentUser.email ||
            'Equipe Level UP'
    );

    revalidatePath('/clientes');

    redirect('/clientes');
}