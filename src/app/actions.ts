'use server';

import { prisma } from '@/lib/prisma';
import { requireAnyPermission, requirePermission } from '@/lib/userAccess';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


export async function createClient(formData: FormData) {
  const currentUser = await requirePermission('social.manage');

  function text(name: string) {
    return String(formData.get(name) || '').trim();
  }

  const name = text('name');

  if (!name) {
    redirect('/clientes/novo');
  }

  const monthlyContentGoal = Number(formData.get('monthlyContentGoal') || 12);

  const client = await prisma.client.create({
    data: {
      name,
      agencyId: currentUser.agencyId,
      legalName: text('legalName'),
      cnpj: text('cnpj'),
      segment: text('segment'),
      mainContact: text('mainContact'),
      contactPhone: text('contactPhone'),
      contactEmail: text('contactEmail'),
      companyAddress: text('companyAddress'),

      internalResponsible: text('internalResponsible'),
      postingFrequency: text('postingFrequency'),
      monthlyContentGoal: Number.isFinite(monthlyContentGoal) ? monthlyContentGoal : 12,
      toneOfVoice: text('toneOfVoice'),
      contractedServices: text('contractedServices'),

      databaseLink: text('databaseLink'),
      driveLink: text('driveLink'),
      logoLink: text('logoLink'),
      usefulLinks: text('usefulLinks'),

      businessDescription: text('businessDescription'),
      targetAudience: text('targetAudience'),
      brandDifferentials: text('brandDifferentials'),
      marketingGoals: text('marketingGoals'),
      competitors: text('competitors'),
      benchmarkNotes: text('benchmarkNotes'),
      contentPillars: text('contentPillars'),
      contentRestrictions: text('contentRestrictions'),
      clientBriefing: text('clientBriefing'),

      strategicNotes: [
        text('businessDescription'),
        text('targetAudience'),
        text('brandDifferentials'),
        text('marketingGoals'),
        text('benchmarkNotes'),
        text('contentPillars'),
        text('clientBriefing')
      ].filter(Boolean).join('\n\n'),

      brandColor: '#2563eb',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CLIENT',
      entityId: client.id,
      action: 'CREATED',
      description: `Cliente criado com briefing estratégico: ${client.name}.`,
      authorName: currentUser.name || currentUser.email || 'Diretoria',
    },
  });

  revalidatePath('/clientes');
  revalidatePath('/design');
  revalidatePath('/clientes');

  redirect(`/clientes/${client.id}`);
}


export async function createOrUpdateClientPersona(clientId: string, formData: FormData) {
  const currentUser =
    await requirePermission(
      'social.manage'
    );

  const client =
    await prisma.client.findFirst({
      where: {
        id:
          clientId,

        agencyId:
          currentUser.agencyId,
      },

      select: {
        id:
          true,
      },
    });

  if (!client) {
    redirect('/clientes');
  }

  const existingPersona = await prisma.clientPersona.findFirst({
    where: {
      clientId,
    },
  });

  const data = {
    name: String(formData.get("personaName") || formData.get("name") || "").trim(),
    ageRange: String(formData.get("ageRange") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    profession: String(formData.get("profession") || "").trim(),
    painPoints: String(formData.get("painPoints") || "").trim(),
    desires: String(formData.get("desires") || "").trim(),
    objections: String(formData.get("objections") || "").trim(),
    realPhrases: String(formData.get("realPhrases") || "").trim(),
    contentPreferences: String(formData.get("contentPreferences") || "").trim(),
  };

  if (existingPersona) {
    await prisma.clientPersona.update({
      where: {
        id: existingPersona.id,
      },
      data,
    });
  } else {
    await prisma.clientPersona.create({
      data: {
        ...data,
        name: data.name || "Persona principal",
        clientId,
      },
    });
  }

  await logHistory(
    "CLIENT",
    clientId,
    "PERSONA_UPDATED",
    "Persona do cliente atualizada.",
    "Equipe Level UP"
  );

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath(`/clientes/${clientId}/visao`);
}

export async function createOrUpdateClientProfileDiagnosis(
  clientId: string,
  formData: FormData
) {
  const currentUser =
    await requirePermission(
      'social.manage'
    );

  const client =
    await prisma.client.findFirst({
      where: {
        id:
          clientId,

        agencyId:
          currentUser.agencyId,
      },

      select: {
        id:
          true,
      },
    });

  if (!client) {
    redirect('/clientes');
  }

  const existingDiagnosis = await prisma.clientProfileDiagnosis.findFirst({
    where: {
      clientId,
    },
  });

  const data = {
    instagramUrl: String(formData.get("instagramUrl") || "").trim(),
    teamNotes: String(formData.get("teamNotes") || "").trim(),
    profilePrintUrl: String(formData.get("profilePrintUrl") || "").trim(),
    insightsPrintUrl: String(formData.get("insightsPrintUrl") || "").trim(),
    highlightsPrintUrl: String(formData.get("highlightsPrintUrl") || "").trim(),
    bioAnalysis: String(formData.get("bioAnalysis") || "").trim(),
    profilePhotoAnalysis: String(formData.get("profilePhotoAnalysis") || "").trim(),
    visualIdentityAnalysis: String(formData.get("visualIdentityAnalysis") || "").trim(),
    highlightsAnalysis: String(formData.get("highlightsAnalysis") || "").trim(),
    postingFrequencyAnalysis: String(
      formData.get("postingFrequencyAnalysis") || ""
    ).trim(),
    offerClarityAnalysis: String(formData.get("offerClarityAnalysis") || "").trim(),
    strengths: String(formData.get("strengths") || "").trim(),
    improvementPoints: String(formData.get("improvementPoints") || "").trim(),
    actionPlan: String(formData.get("actionPlan") || "").trim(),
  };

  if (existingDiagnosis) {
    await prisma.clientProfileDiagnosis.update({
      where: {
        id: existingDiagnosis.id,
      },
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
    "PROFILE_DIAGNOSIS_UPDATED",
    "Diagnóstico do perfil atualizado.",
    "Equipe Level UP"
  );

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath(`/clientes/${clientId}/visao`);
}

export async function updateClientStrategy(clientId: string, formData: FormData) {
  const currentUser =
    await requirePermission(
      'social.manage'
    );

  const client =
    await prisma.client.findFirst({
      where: {
        id:
          clientId,

        agencyId:
          currentUser.agencyId,
      },

      select: {
        id:
          true,
      },
    });

  if (!client) {
    redirect('/clientes');
  }

  const monthlyContentGoalValue = Number(formData.get("monthlyContentGoal") || 0);

  await prisma.client.update({
    where: {
      id:
        client.id,
    },
    data: {
      internalResponsible: String(formData.get("internalResponsible") || "").trim(),
      toneOfVoice: String(formData.get("toneOfVoice") || "").trim(),
      postingFrequency: String(formData.get("postingFrequency") || "").trim(),
      monthlyContentGoal: Number.isNaN(monthlyContentGoalValue)
        ? 0
        : monthlyContentGoalValue,
      contractedServices: String(formData.get("contractedServices") || "").trim(),
      usefulLinks: String(formData.get("usefulLinks") || "").trim(),
      strategicNotes: String(formData.get("strategicNotes") || "").trim(),
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
  revalidatePath(`/clientes/${clientId}/visao`);
  revalidatePath("/clientes");
  revalidatePath("/clientes");
}

export async function createContent(formData: FormData) {
  const currentUser =
    await requirePermission(
      'social.manage'
    );

  const clientId = String(formData.get("clientId") || "").trim();
  const title = String(formData.get("title") || "").trim();

  if (!clientId || !title) {
    redirect("/conteudos/novo?error=required");
  }

  const client =
    await prisma.client.findFirst({
      where: {
        id:
          clientId,

        agencyId:
          currentUser.agencyId,
      },

      select: {
        id:
          true,
      },
    });

  if (!client) {
    redirect('/clientes');
  }

  const plannedDateValue = String(formData.get("plannedDate") || "").trim();

  const content = await prisma.content.create({
    data: {
      clientId:
        client.id,
      title,
      objective: String(formData.get("objective") || "").trim(),
      format: String(formData.get("format") || "").trim(),
      platform: String(formData.get("platform") || "").trim(),
      plannedDate: plannedDateValue ? new Date(plannedDateValue) : null,
      responsible: String(formData.get("responsible") || "").trim(),
      area: String(formData.get("area") || "GERAL").trim(),
      priority: String(formData.get("priority") || "MEDIA").trim(),
      caption: String(formData.get("caption") || "").trim(),
      artText: String(formData.get("artText") || "").trim(),
      script: String(formData.get("script") || "").trim(),
      briefing: String(formData.get("briefing") || "").trim(),
      fileLinks: String(formData.get("fileLinks") || "").trim(),
      coverImageUrl: String(formData.get("coverImageUrl") || "").trim(),
      status: String(formData.get("status") || "IDEIA").trim(),
    },
  });

  await logHistory(
    "CONTENT",
    content.id,
    "CREATED",
    `Conteúdo ${content.title} criado.`,
    "Equipe Level UP"
  );

  revalidatePath("/clientes");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath(`/clientes/${clientId}/visao`);
  revalidatePath("/conteudos/kanban");
  revalidatePath("/tarefas");

  redirect(`/conteudos/${content.id}`);
}


export async function updateContent(contentId: string, formData: FormData) {
  const currentUser = await requireAnyPermission([
    'social.manage',
    'design.manage',
    'filmmaker.manage',
  ]);

  const currentContent =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },
    });

  if (!currentContent) {
    redirect('/clientes');
  }

  function text(name: string, fallback = '') {
    return String(formData.get(name) || fallback).trim();
  }

  function normalizeArea(value: string) {
    const area = String(value || '').trim().toUpperCase();

    const map: Record<string, string> = {
      GERAL: 'GERAL',
      SOCIAL_MEDIA: 'SOCIAL_MEDIA',
      SOCIAL: 'SOCIAL_MEDIA',
      DESIGN: 'DESIGN',
      FILMMAKER: 'FILMMAKER',
      AUDIOVISUAL: 'FILMMAKER',
    };

    return map[area] || area || 'GERAL';
  }

  function normalizePriority(value: string) {
    const priority = String(value || '').trim().toUpperCase();

    if (priority === 'BAIXA') return 'BAIXA';
    if (priority === 'ALTA') return 'ALTA';
    if (priority === 'URGENTE') return 'URGENTE';

    return 'MEDIA';
  }

  const plannedDateValue = text('plannedDate');

  const updatedContent =
    await prisma.content.update({
      where: {
        id:
          currentContent.id,
      },
    data: {
      status: text('status', currentContent.status),
      area: normalizeArea(text('area', currentContent.area)),
      priority: normalizePriority(text('priority', currentContent.priority)),
      responsible: text('responsible', currentContent.responsible || ''),
      title: text('title', currentContent.title),
      objective: text('objective', currentContent.objective || ''),
      format: text('format', currentContent.format || ''),
      platform: text('platform', currentContent.platform || ''),
      plannedDate: plannedDateValue ? new Date(`${plannedDateValue}T12:00:00`) : currentContent.plannedDate,
      briefing: text('briefing', currentContent.briefing || ''),
      artText: text('artText', currentContent.artText || ''),
      caption: text('caption', currentContent.caption || ''),
      script: text('script', currentContent.script || ''),
      fileLinks: text('fileLinks', currentContent.fileLinks || ''),
      coverImageUrl: text('coverImageUrl', currentContent.coverImageUrl || ''),
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'UPDATED',
      description: `Conteúdo atualizado. Área: ${updatedContent.area}. Status: ${updatedContent.status}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${updatedContent.clientId}`);
  revalidatePath('/clientes');
  revalidatePath('/design');
  revalidatePath('/social-media');
  revalidatePath('/clientes');

  redirect(`/conteudos/${contentId}`);
}


export async function addComment(contentId: string, formData: FormData) {
  const currentUser =
    await requireAnyPermission([
    'social.manage',
    'design.manage',
    'filmmaker.manage',
  ]);

  const message = String(formData.get("message") || "").trim();

  if (!message) {
    redirect(`/conteudos/${contentId}`);
  }

  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },
    });

  if (!content) {
    redirect("/conteudos/kanban");
  }

  await prisma.comment.create({
    data: {
      contentId:
        content.id,
      message,
      authorName: String(formData.get("authorName") || "Equipe Level UP").trim(),
      authorRole: String(formData.get("authorRole") || "Interno").trim(),
    },
  });

  await logHistory(
    "CONTENT",
    contentId,
    "COMMENT_ADDED",
    "Comentário adicionado ao conteúdo.",
    "Equipe Level UP"
  );

  revalidatePath(`/conteudos/${contentId}`);
}

export async function addTask(contentId: string, formData: FormData) {
  const currentUser =
    await requireAnyPermission([
    'social.manage',
    'design.manage',
    'filmmaker.manage',
  ]);

  const title = String(formData.get("title") || "").trim();

  if (!title) {
    redirect(`/conteudos/${contentId}`);
  }

  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },
    });

  if (!content) {
    redirect("/conteudos/kanban");
  }

  const dueDateValue = String(formData.get("dueDate") || "").trim();

  await prisma.task.create({
    data: {
      contentId:
        content.id,
      title,
      description: String(formData.get("description") || "").trim(),
      status: String(formData.get("status") || "A_FAZER").trim(),
      priority: String(formData.get("priority") || "MEDIA").trim(),
      responsible: String(formData.get("responsible") || "").trim(),
      dueDate: dueDateValue ? new Date(dueDateValue) : null,
    },
  });

  await logHistory(
    "CONTENT",
    contentId,
    "TASK_ADDED",
    `Tarefa ${title} adicionada.`,
    "Equipe Level UP"
  );

  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath("/tarefas");
  revalidatePath("/clientes");
}

export async function completeTask(taskId: string) {
  const currentUser =
    await requireAnyPermission([
    'social.manage',
    'design.manage',
    'filmmaker.manage',
  ]);

  const ownedTask =
    await prisma.task.findFirst({
      where: {
        id:
          taskId,

        content: {
          client: {
            agencyId:
              currentUser.agencyId,
          },
        },
      },

      select: {
        id:
          true,
      },
    });

  if (!ownedTask) {
    redirect('/tarefas');
  }

  const task =
    await prisma.task.update({
      where: {
        id:
          ownedTask.id,
      },
    data: {
      status: "FINALIZADA",
    },
    include: {
      content: true,
    },
  });

  await logHistory(
    "TASK",
    taskId,
    "COMPLETED",
    `Tarefa ${task.title} finalizada.`,
    "Equipe Level UP"
  );

  revalidatePath(`/conteudos/${task.contentId}`);
  revalidatePath("/tarefas");
  revalidatePath("/clientes");
}

export async function generateDraftLog(...args: any[]) {
  const currentUser =
    await requirePermission(
      'social.manage'
    );

  const contentId = String(args[0] || "").trim();
  const promptTitle = String(args[1] || "Assistente de Conteúdo").trim();

  if (!contentId) {
    return {
      success: false,
      message: "Conteúdo não informado.",
    };
  }

  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },

      select: {
        id:
          true,
      },
    });

  if (!content) {
    return {
      success: false,
      message: "Conteúdo não encontrado.",
    };
  }

  await logHistory(
    "CONTENT",
    content.id,
    "AI_DRAFT_GENERATED",
    `Rascunho gerado pelo assistente: ${promptTitle}.`,
    "Equipe Level UP"
  );

  revalidatePath(`/conteudos/${contentId}`);

  return {
    success: true,
    message: "Rascunho registrado com sucesso.",
  };
}

export async function applyDraftToContent(...args: any[]) {
  const currentUser =
    await requirePermission(
      'social.manage'
    );

  const contentId = String(args[0] || "").trim();

  if (!contentId) {
    return {
      success: false,
      message: "Conteúdo não informado.",
    };
  }

  const existingContent =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },
    });

  if (!existingContent) {
    return {
      success: false,
      message: "Conteúdo não encontrado.",
    };
  }

  let field = "";
  let value = "";

  const secondArg = args[1];
  const thirdArg = args[2];

  if (typeof secondArg === "string" && typeof thirdArg === "string") {
    field = secondArg;
    value = thirdArg;
  }

  if (secondArg && typeof secondArg === "object" && !(secondArg instanceof FormData)) {
    field = String(secondArg.field || secondArg.targetField || secondArg.type || "").trim();
    value = String(secondArg.value || secondArg.text || secondArg.content || "").trim();
  }

  if (secondArg instanceof FormData) {
    field = String(secondArg.get("field") || secondArg.get("targetField") || "").trim();
    value = String(secondArg.get("value") || secondArg.get("text") || secondArg.get("content") || "").trim();
  }

  const allowedFields = [
    "title",
    "objective",
    "caption",
    "artText",
    "script",
    "briefing",
    "fileLinks",
    "coverImageUrl",
  ];

  if (!allowedFields.includes(field)) {
    return {
      success: false,
      message: "Campo inválido para aplicar rascunho.",
    };
  }

  await prisma.content.update({
    where: {
      id:
        existingContent.id,
    },
    data: {
      [field]: value,
    },
  });

  await logHistory(
    "CONTENT",
    contentId,
    "AI_DRAFT_APPLIED",
    `Rascunho aplicado no campo ${field}.`,
    "Equipe Level UP"
  );

  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${existingContent.clientId}`);
  revalidatePath(`/clientes/${existingContent.clientId}/visao`);
  revalidatePath("/clientes");

  return {
    success: true,
    message: "Rascunho aplicado com sucesso.",
  };
}



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

export async function createPrompt(formData: FormData) {
  await requirePermission('settings.manage');
  const { prisma } = await import('@/lib/prisma');
  const { redirect } = await import('next/navigation');
  const { revalidatePath } = await import('next/cache');

  const title = String(
    formData.get('title') ||
    formData.get('name') ||
    formData.get('titulo') ||
    'Prompt sem título'
  ).trim();

  const content = String(
    formData.get('content') ||
    formData.get('prompt') ||
    formData.get('description') ||
    formData.get('descricao') ||
    ''
  ).trim();

  const type = String(
    formData.get('type') ||
    formData.get('category') ||
    formData.get('categoria') ||
    'GERAL'
  ).trim();

  const runtimeModel = (prisma as any)._runtimeDataModel?.models?.Prompt;
  const fieldNames = new Set(
    (runtimeModel?.fields || []).map((field: any) => field.name)
  );

  const data: any = {};

  function setField(name: string, value: string) {
    if (fieldNames.has(name) && value !== '') {
      data[name] = value;
    }
  }

  setField('title', title);
  setField('name', title);
  setField('content', content);
  setField('prompt', content);
  setField('text', content);
  setField('description', content);
  setField('type', type);
  setField('category', type);
  setField('status', 'ATIVO');

  if (Object.keys(data).length === 0) {
    data.title = title;
    data.content = content;
    data.type = type;
  }

  await (prisma as any).prompt.create({
    data,
  });

  revalidatePath('/prompts');
  redirect('/prompts');
}

