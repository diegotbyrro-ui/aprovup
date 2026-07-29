"use server";

import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMonthlyApprovalLink(
    clientId: string,
    formData: FormData
) {
    const month = Number(formData.get("month"));
    const year = Number(formData.get("year"));

    if (!month || !year) {
        throw new Error("Informe mês e ano para gerar o link.");
    }

    const client = await prisma.client.findUnique({
        where: {
            id: clientId,
        },
    });

    if (!client) {
        throw new Error("Cliente não encontrado.");
    }

    const existingMonthlyApproval = await prisma.monthlyApproval.findFirst({
        where: {
            clientId,
            month,
            year,
        },
    });

    if (existingMonthlyApproval) {
        revalidatePath(`/clientes/${clientId}/aprovacao-mensal`);

        redirect(
            `/clientes/${clientId}/aprovacao-mensal?token=${existingMonthlyApproval.token}&month=${month}&year=${year}`
        );
    }

    const token = randomUUID();

    await prisma.monthlyApproval.create({
        data: {
            clientId,
            month,
            year,
            token,
            status: "PENDENTE",
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CLIENT",
            entityId: clientId,
            action: "MONTHLY_APPROVAL_LINK_CREATED",
            description: `Link mensal de aprovação criado para ${client.name} - ${month}/${year}.`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath(`/clientes/${clientId}`);
    revalidatePath(`/clientes/${clientId}/visao`);
    revalidatePath(`/clientes/${clientId}/aprovacao-mensal`);
    revalidatePath("/clientes");

    redirect(
        `/clientes/${clientId}/aprovacao-mensal?token=${token}&month=${month}&year=${year}`
    );
}

