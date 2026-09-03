"use server";

import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/userAccess";

export async function createMonthlyApprovalLink(
    clientId: string,
    formData: FormData
) {
    const currentUser =
        await requirePermission(
            "social.manage"
        );

    const month = Number(formData.get("month"));
    const year = Number(formData.get("year"));

    if (!month || !year) {
        throw new Error("Informe mês e ano para gerar o link.");
    }

    const client =
        await prisma.client.findFirst({
            where: {
                id:
                    clientId,

                agencyId:
                    currentUser.agencyId,
            },
        });

    if (!client) {
        throw new Error(
            "Cliente não encontrado."
        );
    }

    const safeClientId =
        client.id;

    const existingMonthlyApproval = await prisma.monthlyApproval.findFirst({
        where: {
            clientId:
                safeClientId,

            month,
            year,
        },
    });

    if (existingMonthlyApproval) {
        revalidatePath(`/clientes/${safeClientId}/aprovacao-mensal`);

        redirect(
            `/clientes/${safeClientId}/aprovacao-mensal?token=${existingMonthlyApproval.token}&month=${month}&year=${year}`
        );
    }

    const token = randomUUID();

    await prisma.monthlyApproval.create({
        data: {
            clientId:
                safeClientId,

            month,
            year,
            token,
            status: "PENDENTE",
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CLIENT",

            entityId:
                safeClientId,
            action: "MONTHLY_APPROVAL_LINK_CREATED",
            description: `Link mensal de aprovação criado para ${client.name} - ${month}/${year}.`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath(`/clientes/${safeClientId}`);
    revalidatePath(`/clientes/${safeClientId}/visao`);
    revalidatePath(`/clientes/${safeClientId}/aprovacao-mensal`);
    revalidatePath("/clientes");

    redirect(
        `/clientes/${safeClientId}/aprovacao-mensal?token=${token}&month=${month}&year=${year}`
    );
}

