"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

function normalizeContentArea(area: FormDataEntryValue | null) {
    const value = String(area || "GERAL").trim();

    const allowedAreas = ["GERAL", "SOCIAL_DESIGN", "AUDIOVISUAL"];

    if (!allowedAreas.includes(value)) {
        return "GERAL";
    }

    return value;
}

export async function createClient(formData: FormData) {
    const client = await prisma.client.create({
        data: {
            name: formData.get("name") as string,
            segment: formData.get("segment") as string,
            postingFrequency: formData.get("postingFrequency") as string,
            toneOfVoice: formData.get("toneOfVoice") as string,
            contractedServices: formData.get("contractedServices") as string,
            strategicNotes: formData.get("strategicNotes") as string,
            usefulLinks: formData.get("usefulLinks") as string,
        },
    });

    await logHistory(
        "CLIENT",
        client.id,
        "CREATED",
        `Cliente ${client.name} criado.`,
        "Equipe Level UP"
    );

    revalidatePath("/clientes");
    redirect("/clientes");
}

export async function updateClientStrategy(clientId: string, formData: FormData) {
    await prisma.client.update({
        where: { id: clientId },
        data: {
            toneOfVoice: formData.get("toneOfVoice") as string,
            postingFrequency: formData.get("postingFrequency") as string,
            contractedServices: formData.get("contractedServices") as string,
            usefulLinks: formData.get("usefulLinks") as string,
            strategicNotes: formData.get("strategicNotes") as string,
        },
    });

    await logHistory(
        "CLIENT",
        clientId,
        "STRATEGY_UPDATED",
        "Estratégia da marca atualizada.",
        "Equipe Level UP"
    );

    revalidatePath(`/clientes/${clientId}`);
}

export async function createOrUpdateClientPersona(
    clientId: string,
    formData: FormData
) {
    const name = String(formData.get("name") || "").trim();

    if (!clientId) {
        throw new Error("Cliente não informado.");
    }

    if (!name) {
        throw new Error("O nome da persona é obrigatório.");
    }

    const data = {
        name,
        ageRange: String(formData.get("ageRange") || "").trim(),
        location: String(formData.get("location") || "").trim(),
        profession: String(formData.get("profession") || "").trim(),
        painPoints: String(formData.get("painPoints") || "").trim(),
        desires: String(formData.get("desires") || "").trim(),
        objections: String(formData.get("objections") || "").trim(),
        realPhrases: String(formData.get("realPhrases") || "").trim(),
        contentPreferences: String(formData.get("contentPreferences") || "").trim(),
    };

    const existingPersona = await prisma.clientPersona.findFirst({
        where: { clientId },
    });

    if (existingPersona) {
        await prisma.clientPersona.update({
            where: { id: existingPersona.id },
            data,
        });
    } else {
        await prisma.clientPersona.create({
            data: {
                ...data,
                clientId,
            },
        });
    }

    await logHistory(
        "CLIENT",
        clientId,
        "PERSONA_UPDATED",
        "Persona do cliente criada ou atualizada.",
        "Equipe Level UP"
    );

    revalidatePath(`/clientes/${clientId}`);
}

export async function createOrUpdateClientProfileDiagnosis(
    clientId: string,
    formData: FormData
) {
    if (!clientId) {
        throw new Error("Cliente não informado.");
    }

    const data = {
        instagramUrl: String(formData.get("instagramUrl") || "").trim(),
        teamNotes: String(formData.get("teamNotes") || "").trim(),
        bioAnalysis: String(formData.get("bioAnalysis") || "").trim(),
        profilePhotoAnalysis: String(formData.get("profilePhotoAnalysis") || "").trim(),
        visualIdentityAnalysis: String(formData.get("visualIdentityAnalysis") || "").trim(),
        highlightsAnalysis: String(formData.get("highlightsAnalysis") || "").trim(),
        postingFrequencyAnalysis: String(formData.get("postingFrequencyAnalysis") || "").trim(),
        offerClarityAnalysis: String(formData.get("offerClarityAnalysis") || "").trim(),
        strengths: String(formData.get("strengths") || "").trim(),
        improvementPoints: String(formData.get("improvementPoints") || "").trim(),
        actionPlan: String(formData.get("actionPlan") || "").trim(),
    };

    const existingDiagnosis = await prisma.clientProfileDiagnosis.findFirst({
        where: { clientId },
    });

    if (existingDiagnosis) {
        await prisma.clientProfileDiagnosis.update({
            where: { id: existingDiagnosis.id },
            data,
        });
    } else {
        await prisma.clientProfileDiagnosis.create({
            data: {
                ...data,
                clientId,
            },
        });
    }

    await logHistory(
        "CLIENT",
        clientId,
        "DIAGNOSIS_UPDATED",
        "Diagnóstico de perfil criado ou atualizado.",
        "Equipe Level UP"
    );

    revalidatePath(`/clientes/${clientId}`);
}

export async function uploadDiagnosisPrint(
    clientId: string,
    printType: string,
    formData: FormData
) {
    if (!clientId) {
        throw new Error("Cliente não informado.");
    }

    const allowedPrintTypes = [
        "profilePrintUrl",
        "insightsPrintUrl",
        "highlightsPrintUrl",
    ];

    if (!allowedPrintTypes.includes(printType)) {
        throw new Error("Tipo de print inválido.");
    }

    const file = formData.get("diagnosisPrint") as File | null;

    if (!file || !file.size) {
        throw new Error("Nenhum arquivo enviado.");
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipo de arquivo não suportado. Use PNG, JPEG ou WEBP.");
    }

    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");

    const uploadsDir = join(process.cwd(), "public", "uploads", "diagnosis");

    await mkdir(uploadsDir, {
        recursive: true,
    });

    const ext =
        file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
                ? "webp"
                : "jpg";

    const filename = `diagnosis-${clientId}-${printType}-${Date.now()}.${ext}`;
    const filepath = join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filepath, buffer);

    const printUrl = `/uploads/diagnosis/${filename}`;

    const existingDiagnosis = await prisma.clientProfileDiagnosis.findFirst({
        where: { clientId },
    });

    if (existingDiagnosis) {
        await prisma.clientProfileDiagnosis.update({
            where: { id: existingDiagnosis.id },
            data: {
                [printType]: printUrl,
            },
        });
    } else {
        await prisma.clientProfileDiagnosis.create({
            data: {
                clientId,
                [printType]: printUrl,
            },
        });
    }

    await logHistory(
        "CLIENT",
        clientId,
        "DIAGNOSIS_PRINT_UPLOADED",
        "Print do diagnóstico de perfil anexado.",
        "Equipe Level UP"
    );

    revalidatePath(`/clientes/${clientId}`);
}

export async function createContent(formData: FormData) {
    const status = formData.get("status") as string;

    const token =
        status === "ENVIADO_CLIENTE"
            ? `token-${Math.random().toString(36).substr(2, 9)}`
            : undefined;

    const content = await prisma.content.create({
        data: {
            title: formData.get("title") as string,
            objective: formData.get("objective") as string,
            format: formData.get("format") as string,
            platform: formData.get("platform") as string,
            clientId: formData.get("clientId") as string,
            area: normalizeContentArea(formData.get("area")),
            status,
            plannedDate: formData.get("plannedDate")
                ? new Date(formData.get("plannedDate") as string)
                : undefined,
            responsible: formData.get("responsible") as string,
            briefing: formData.get("briefing") as string,
            script: formData.get("script") as string,
            artText: formData.get("artText") as string,
            caption: formData.get("caption") as string,
            coverImageUrl: (formData.get("coverImageUrl") as string) || undefined,
            fileLinks: formData.get("fileLinks") as string,
        },
    });

    await logHistory(
        "CONTENT",
        content.id,
        "CREATED",
        `Conteúdo "${content.title}" criado com status ${status}.`,
        "Equipe Level UP"
    );

    if (token) {
        await prisma.approval.create({
            data: {
                token,
                contentId: content.id,
                status: "PENDENTE",
            },
        });
    }

    revalidatePath("/conteudos");
    revalidatePath("/conteudos/kanban");
    revalidatePath("/conteudos/kanban/social-media");
    revalidatePath("/conteudos/kanban/audiovisual");

    redirect("/conteudos");
}

export async function updateContent(contentId: string, formData: FormData) {
    const oldContent = await prisma.content.findUnique({
        where: { id: contentId },
    });

    if (!oldContent) {
        throw new Error("Conteúdo não encontrado.");
    }

    const newStatus = formData.get("status") as string;

    const content = await prisma.content.update({
        where: { id: contentId },
        data: {
            title: formData.get("title") as string,
            objective: formData.get("objective") as string,
            format: formData.get("format") as string,
            platform: formData.get("platform") as string,
            area: normalizeContentArea(formData.get("area")),
            plannedDate: formData.get("plannedDate")
                ? new Date(formData.get("plannedDate") as string)
                : null,
            responsible: formData.get("responsible") as string,
            briefing: formData.get("briefing") as string,
            script: formData.get("script") as string,
            artText: formData.get("artText") as string,
            caption: formData.get("caption") as string,
            coverImageUrl: (formData.get("coverImageUrl") as string) || undefined,
            fileLinks: formData.get("fileLinks") as string,
            status: newStatus,
        },
    });

    if (oldContent.status !== newStatus) {
        await logHistory(
            "CONTENT",
            content.id,
            "STATUS_CHANGED",
            `Status alterado de ${oldContent.status} para ${newStatus}.`,
            "Equipe Level UP"
        );

        if (newStatus === "ENVIADO_CLIENTE") {
            const existingApproval = await prisma.approval.findFirst({
                where: {
                    contentId: content.id,
                    status: "PENDENTE",
                },
            });

            if (!existingApproval) {
                await prisma.approval.create({
                    data: {
                        token: `token-${Math.random().toString(36).substr(2, 9)}`,
                        contentId: content.id,
                        status: "PENDENTE",
                    },
                });
            }
        }
    } else {
        await logHistory(
            "CONTENT",
            content.id,
            "UPDATED",
            "Conteúdo atualizado.",
            "Equipe Level UP"
        );
    }

    revalidatePath(`/conteudos/${contentId}`);
    revalidatePath("/conteudos");
    revalidatePath("/conteudos/kanban");
    revalidatePath("/conteudos/kanban/social-media");
    revalidatePath("/conteudos/kanban/audiovisual");

    redirect(`/conteudos/${contentId}`);
}

export async function addComment(contentId: string, formData: FormData) {
    const message = String(formData.get("message") || "").trim();

    if (!message) {
        return;
    }

    await prisma.comment.create({
        data: {
            message,
            contentId,
            authorName: "Equipe Level UP",
            authorRole: "GESTOR",
        },
    });

    await logHistory(
        "CONTENT",
        contentId,
        "COMMENTED",
        "Adicionou um comentário.",
        "Equipe Level UP"
    );

    revalidatePath(`/conteudos/${contentId}`);
}

export async function addTask(contentId: string, formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    const priority = formData.get("priority") as string;
    const dueDateStr = formData.get("dueDate") as string;

    if (!title) {
        return;
    }

    await prisma.task.create({
        data: {
            title,
            priority,
            dueDate: dueDateStr ? new Date(dueDateStr) : undefined,
            contentId,
            status: "A_FAZER",
        },
    });

    await logHistory(
        "CONTENT",
        contentId,
        "TASK_ADDED",
        `Tarefa "${title}" adicionada.`,
        "Equipe Level UP"
    );

    revalidatePath(`/conteudos/${contentId}`);
}

export async function completeTask(taskId: string, contentId: string) {
    const task = await prisma.task.update({
        where: { id: taskId },
        data: {
            status: "FINALIZADO",
        },
    });

    await logHistory(
        "CONTENT",
        contentId,
        "TASK_COMPLETED",
        `Tarefa "${task.title}" concluída.`,
        "Equipe Level UP"
    );

    revalidatePath(`/conteudos/${contentId}`);
}

export async function approveContent(token: string) {
    const approval = await prisma.approval.findUnique({
        where: { token },
    });

    if (!approval) {
        throw new Error("Aprovação não encontrada.");
    }

    await prisma.approval.update({
        where: { token },
        data: {
            status: "APROVADO",
        },
    });

    await prisma.content.update({
        where: { id: approval.contentId },
        data: {
            status: "APROVADO",
        },
    });

    await logHistory(
        "CONTENT",
        approval.contentId,
        "APPROVED",
        "Conteúdo aprovado pelo cliente via link público.",
        "Cliente"
    );

    revalidatePath(`/aprovacao/${token}`);
    revalidatePath("/dashboard");
    revalidatePath(`/conteudos/${approval.contentId}`);
    revalidatePath("/conteudos");
    revalidatePath("/conteudos/kanban");
    revalidatePath("/conteudos/kanban/social-media");
    revalidatePath("/conteudos/kanban/audiovisual");
}

export async function requestChanges(token: string, comment: string) {
    const approval = await prisma.approval.findUnique({
        where: { token },
    });

    if (!approval) {
        throw new Error("Aprovação não encontrada.");
    }

    await prisma.approval.update({
        where: { token },
        data: {
            status: "ALTERACAO_SOLICITADA",
            clientComment: comment,
        },
    });

    await prisma.content.update({
        where: { id: approval.contentId },
        data: {
            status: "ALTERACAO_SOLICITADA",
        },
    });

    await logHistory(
        "CONTENT",
        approval.contentId,
        "REJECTED",
        `Cliente solicitou alteração: "${comment}"`,
        "Cliente"
    );

    revalidatePath(`/aprovacao/${token}`);
    revalidatePath("/dashboard");
    revalidatePath(`/conteudos/${approval.contentId}`);
    revalidatePath("/conteudos");
    revalidatePath("/conteudos/kanban");
    revalidatePath("/conteudos/kanban/social-media");
    revalidatePath("/conteudos/kanban/audiovisual");
}

export async function createPrompt(formData: FormData) {
    const prompt = await prisma.promptTemplate.create({
        data: {
            title: formData.get("title") as string,
            category: formData.get("category") as string,
            segment: formData.get("segment") as string,
            prompt: formData.get("prompt") as string,
        },
    });

    await logHistory(
        "PROMPT",
        prompt.id,
        "CREATED",
        `Prompt "${prompt.title}" criado.`,
        "Equipe Level UP"
    );

    revalidatePath("/prompts");
    redirect("/prompts");
}

export async function generateDraftLog(contentId: string, promptId: string) {
    const prompt = await prisma.promptTemplate.findUnique({
        where: { id: promptId },
    });

    if (prompt) {
        await logHistory(
            "CONTENT",
            contentId,
            "DRAFT_GENERATED",
            `Rascunho gerado usando o prompt: "${prompt.title}".`,
            "Assistente (Mock)"
        );
    }
}

export async function applyDraftToContent(
    contentId: string,
    field: string,
    draftText: string
) {
    const allowedFields = ["caption", "script", "briefing", "artText"];

    if (!allowedFields.includes(field)) {
        throw new Error("Campo inválido para aplicação de rascunho.");
    }

    const data: Record<string, string> = {};
    data[field] = draftText;

    await prisma.content.update({
        where: { id: contentId },
        data,
    });

    const fieldNames: Record<string, string> = {
        caption: "legenda",
        script: "roteiro",
        briefing: "briefing",
        artText: "texto da arte",
    };

    await logHistory(
        "CONTENT",
        contentId,
        "DRAFT_APPLIED",
        `Rascunho aplicado no campo ${fieldNames[field]}.`,
        "Assistente (Mock)"
    );

    revalidatePath(`/conteudos/${contentId}`);
}

export async function uploadContentCoverImage(contentId: string, formData: FormData) {
    const file = formData.get("coverImage") as File | null;

    if (!file || !file.size) {
        throw new Error("Nenhum arquivo enviado.");
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipo de arquivo não suportado. Use PNG, JPEG ou WEBP.");
    }

    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");

    const uploadsDir = join(process.cwd(), "public", "uploads");

    await mkdir(uploadsDir, {
        recursive: true,
    });

    const ext =
        file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
                ? "webp"
                : "jpg";

    const filename = `cover-${contentId}-${Date.now()}.${ext}`;
    const filepath = join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filepath, buffer);

    const coverImageUrl = `/uploads/${filename}`;

    await prisma.content.update({
        where: { id: contentId },
        data: {
            coverImageUrl,
        },
    });

    await logHistory(
        "CONTENT",
        contentId,
        "IMAGE_UPLOADED",
        "Imagem de capa do conteúdo atualizada.",
        "Equipe Level UP"
    );

    revalidatePath(`/conteudos/${contentId}`);
}