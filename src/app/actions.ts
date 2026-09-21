'use server';

import { prisma } from '@/lib/prisma';
import { hasPermission, requireAnyPermission, requirePermission } from '@/lib/userAccess';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  deleteAprovUpReferenceFile,
  renameAprovUpReferenceFile,
  uploadAprovUpReferenceFile,
} from '@/lib/aprovupStorage';


/*
 * Fotos de referência não possuem mais limites
 * artificiais de quantidade ou tamanho no AprovUp.
 *
 * O limite técnico da requisição é controlado pelo
 * bodySizeLimit do Next.js.
 */


function referenceImageFiles(
  formData:
    FormData
) {
  return formData
    .getAll(
      'referenceImages'
    )
    .filter(
      (
        value
      ): value is File =>
        value instanceof
          File &&
        value.size >
          0
    );
}


function validateReferenceImages(
  files:
    File[]
) {
  /*
   * Mantemos somente a validação de tipo.
   * Quantidade e tamanho deixam de ser limitados
   * artificialmente pelo AprovUp.
   */
  for (
    const file
    of files
  ) {
    if (
      !String(
        file.type ||
        ''
      ).startsWith(
        'image/'
      )
    ) {
      throw new Error(
        `O arquivo "${file.name}" não é uma imagem.`
      );
    }
  }
}


async function uploadContentReferenceImages(
  contentId:
    string,
  formData:
    FormData
) {
  const files =
    referenceImageFiles(
      formData
    );


  if (
    files.length ===
    0
  ) {
    return [];
  }


  validateReferenceImages(
    files
  );


  const uploadedUrls:
    string[] =
    [];


  try {
    for (
      const file
      of files
    ) {
      const url =
        await uploadAprovUpReferenceFile(
          file,
          contentId
        );


      if (url) {
        uploadedUrls.push(
          url
        );
      }
    }


    return uploadedUrls;
  }
  catch (
    error
  ) {
    await Promise.all(
      uploadedUrls.map(
        (
          url
        ) =>
          deleteAprovUpReferenceFile(
            contentId,
            url
          ).catch(
            () =>
              false
          )
      )
    );


    throw error;
  }
}


async function removeContentReferenceImages(
  contentId:
    string,
  formData:
    FormData
) {
  const urls =
    formData
      .getAll(
        'removeReferenceUrl'
      )
      .map(
        (
          value
        ) =>
          String(
            value ||
            ''
          ).trim()
      )
      .filter(
        Boolean
      );


  for (
    const url
    of urls
  ) {
    await deleteAprovUpReferenceFile(
      contentId,
      url
    );
  }
}


async function renameContentReferenceImages(
  contentId:
    string,
  formData:
    FormData
) {
  const urls =
    formData
      .getAll(
        'referenceRenameUrl'
      )
      .map(
        (value) =>
          String(
            value ||
            ''
          ).trim()
      );


  const names =
    formData
      .getAll(
        'referenceRenameName'
      )
      .map(
        (value) =>
          String(
            value ||
            ''
          ).trim()
      );


  const removed =
    new Set(
      formData
        .getAll(
          'removeReferenceUrl'
        )
        .map(
          (value) =>
            String(
              value ||
              ''
            ).trim()
        )
        .filter(
          Boolean
        )
    );


  for (
    let index = 0;
    index < urls.length;
    index++
  ) {
    const url =
      urls[index] ||
      '';

    const name =
      names[index] ||
      '';


    if (
      !url ||
      !name ||
      removed.has(
        url
      )
    ) {
      continue;
    }


    await renameAprovUpReferenceFile(
      contentId,
      url,
      name
    );
  }
}


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

      internalResponsible:
        currentUser.role ===
        "DIRECTOR"
          ? text(
              "internalResponsible"
            )
          : (
              currentUser.name ||
              currentUser.email ||
              ""
            ),
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

function formatMaceioDatePart(
  date:
    Date |
    null
) {
  if (!date) {
    return '';
  }

  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'America/Maceio',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      }
    )
      .formatToParts(
        date
      );


  const get =
    (
      type:
        string
    ) =>
      parts.find(
        (
          part
        ) =>
          part.type ===
          type
      )?.value ||
      '';


  return `${get('year')}-${get('month')}-${get('day')}`;
}


function formatMaceioTimePart(
  date:
    Date |
    null
) {
  if (!date) {
    return '';
  }


  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        'America/Maceio',

      hour:
        '2-digit',

      minute:
        '2-digit',

      hourCycle:
        'h23',
    }
  ).format(
    date
  );
}


function parseProductionDeadline(
  dateValue:
    string,
  timeValue:
    string
) {
  if (
    !dateValue
  ) {
    return null;
  }


  const time =
    /^\d{2}:\d{2}$/.test(
      timeValue
    )
      ? timeValue
      : '12:00';


  const parsed =
    new Date(
      `${dateValue}T${time}:00-03:00`
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }


  return parsed;
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


  const rawCalendarReturn =
    String(
      formData.get(
        "calendarReturn"
      ) ||
      ""
    ).trim();


  function safeCalendarReturn(
    value:
      string
  ) {
    if (!value) {
      return "";
    }


    try {
      const parsed =
        new URL(
          value,
          "https://aprovup.local"
        );


      if (
        parsed.origin !==
          "https://aprovup.local" ||
        parsed.pathname !==
          "/calendario-editorial"
      ) {
        return "";
      }


      return (
        parsed.pathname +
        parsed.search
      );
    }
    catch {
      return "";
    }
  }


  const calendarReturn =
    safeCalendarReturn(
      rawCalendarReturn
    );


  function createErrorHref(
    error:
      string
  ) {
    const params =
      new URLSearchParams();


    if (
      plannedDateValue
    ) {
      params.set(
        "date",
        plannedDateValue
      );
    }


    params.set(
      "error",
      error
    );


    if (
      calendarReturn
    ) {
      params.set(
        "retorno",
        calendarReturn
      );
    }


    return (
      `/clientes/${clientId}/conteudos/novo?` +
      params.toString()
    );
  }


  const productionDeadlineValue =
    String(
      formData.get(
        "productionDeadline"
      ) ||
      ""
    ).trim();

  const productionDeadlineTimeValue =
    String(
      formData.get(
        "productionDeadlineTime"
      ) ||
      ""
    ).trim();

  const areaValue = String(formData.get("area") || "GERAL").trim().toUpperCase();

  if (
    ['DESIGN', 'FILMMAKER'].includes(areaValue) &&
    plannedDateValue &&
    !productionDeadlineValue
  ) {
    redirect(
      createErrorHref(
        "production-deadline-required"
      )
    );
  }

  if (
    productionDeadlineTimeValue &&
    !productionDeadlineValue
  ) {
    redirect(
      createErrorHref(
        "production-deadline-required"
      )
    );
  }


  if (
    productionDeadlineValue &&
    !productionDeadlineTimeValue
  ) {
    redirect(
      createErrorHref(
        "production-deadline-time-required"
      )
    );
  }


  if (
    plannedDateValue &&
    productionDeadlineValue &&
    productionDeadlineValue >= plannedDateValue
  ) {
    redirect(
      createErrorHref(
        "production-deadline-before"
      )
    );
  }

  const content = await prisma.content.create({
    data: {
      clientId:
        client.id,
      title,
      objective: String(formData.get("objective") || "").trim(),
      format: String(formData.get("format") || "").trim(),
      platform: String(formData.get("platform") || "").trim(),
      plannedDate: plannedDateValue
        ? new Date(`${plannedDateValue}T12:00:00.000Z`)
        : null,
      productionDeadline:
        parseProductionDeadline(
          productionDeadlineValue,
          productionDeadlineTimeValue
        ),
      responsible: String(formData.get("responsible") || "").trim(),
      area: areaValue,
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

  try {
    await uploadContentReferenceImages(
      content.id,
      formData
    );
  }
  catch (
    error
  ) {
    await prisma.content
      .delete({
        where: {
          id:
            content.id,
        },
      })
      .catch(
        () =>
          null
      );

    console.error(
      'AprovUp reference upload on create:',
      error
    );

    redirect(
      createErrorHref(
        "reference-upload"
      )
    );
  }


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
  revalidatePath("/calendario-editorial");


  if (
    calendarReturn
  ) {
    const destination =
      new URL(
        calendarReturn,
        "https://aprovup.local"
      );


    destination.searchParams.set(
      "created",
      "1"
    );


    destination.searchParams.set(
      "draftClientId",
      clientId
    );


    redirect(
      destination.pathname +
      destination.search
    );
  }


  redirect(
    `/conteudos/${content.id}?created=1&draftClientId=${encodeURIComponent(
      clientId
    )}`
  );
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

  const existingProductionDeadlineValue =
    formatMaceioDatePart(
      currentContent.productionDeadline
    );


  const existingProductionDeadlineTimeValue =
    formatMaceioTimePart(
      currentContent.productionDeadline
    );


  const requestedProductionDeadlineValue =
    formData.has(
      'productionDeadline'
    )
      ? String(
          formData.get(
            'productionDeadline'
          ) ||
          ''
        ).trim()
      : existingProductionDeadlineValue;


  const requestedProductionDeadlineTimeValue =
    formData.has(
      'productionDeadlineTime'
    )
      ? String(
          formData.get(
            'productionDeadlineTime'
          ) ||
          ''
        ).trim()
      : existingProductionDeadlineTimeValue;

  const canManageProductionDeadline =
    hasPermission(
      currentUser,
      'social.manage'
    );

  const productionDeadlineValue =
    canManageProductionDeadline
      ? requestedProductionDeadlineValue
      : existingProductionDeadlineValue;


  const productionDeadlineTimeValue =
    canManageProductionDeadline
      ? requestedProductionDeadlineTimeValue
      : existingProductionDeadlineTimeValue;


  const nextArea =
    normalizeArea(
      text(
        'area',
        currentContent.area
      )
    );

  if (
    productionDeadlineValue &&
    !productionDeadlineTimeValue
  ) {
    redirect(
      `/conteudos/${contentId}?error=production-deadline-time-required`
    );
  }


  if (
    plannedDateValue &&
    productionDeadlineValue &&
    productionDeadlineValue >= plannedDateValue
  ) {
    redirect(
      `/conteudos/${contentId}?error=production-deadline-before`
    );
  }

  const updatedContent =
    await prisma.content.update({
      where: {
        id:
          currentContent.id,
      },
    data: {
      status: text('status', currentContent.status),
      area: nextArea,
      priority: normalizePriority(text('priority', currentContent.priority)),
      responsible: text('responsible', currentContent.responsible || ''),
      title: text('title', currentContent.title),
      objective: text('objective', currentContent.objective || ''),
      format: text('format', currentContent.format || ''),
      platform: text('platform', currentContent.platform || ''),
      plannedDate: plannedDateValue
        ? new Date(`${plannedDateValue}T12:00:00.000Z`)
        : currentContent.plannedDate,
      productionDeadline:
        productionDeadlineValue
          ? parseProductionDeadline(
              productionDeadlineValue,
              productionDeadlineTimeValue
            )
          : currentContent.productionDeadline,
      briefing: text('briefing', currentContent.briefing || ''),
      artText: text('artText', currentContent.artText || ''),
      caption: text('caption', currentContent.caption || ''),
      script: text('script', currentContent.script || ''),
      fileLinks: text('fileLinks', currentContent.fileLinks || ''),
      coverImageUrl: text('coverImageUrl', currentContent.coverImageUrl || ''),
    },
  });

  let referenceUpdateError =
    false;


  try {
    await renameContentReferenceImages(
      contentId,
      formData
    );
  }
  catch (
    error
  ) {
    referenceUpdateError =
      true;

    console.error(
      'AprovUp reference rename on update:',
      error
    );
  }


  try {
    await removeContentReferenceImages(
      contentId,
      formData
    );
  }
  catch (
    error
  ) {
    referenceUpdateError =
      true;

    console.error(
      'AprovUp reference remove on update:',
      error
    );
  }


  try {
    await uploadContentReferenceImages(
      contentId,
      formData
    );
  }
  catch (
    error
  ) {
    referenceUpdateError =
      true;

    console.error(
      'AprovUp reference upload on update:',
      error
    );
  }


  /*
   * Histórico é importante, mas uma indisponibilidade
   * nele não pode invalidar um conteúdo que já foi salvo.
   */
  await prisma.historyLog
    .create({
      data: {
        entityType:
          'CONTENT',

        entityId:
          contentId,

        action:
          'UPDATED',

        description:
          referenceUpdateError
            ? `Conteúdo atualizado. Área: ${updatedContent.area}. Status: ${updatedContent.status}. Houve falha em uma operação de anexo.`
            : `Conteúdo atualizado. Área: ${updatedContent.area}. Status: ${updatedContent.status}.`,

        authorName:
          currentUser.name ||
          currentUser.email ||
          'Equipe Level UP',
      },
    })
    .catch(
      (
        error
      ) => {
        console.error(
          'AprovUp history log on content update:',
          error
        );
      }
    );

  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${updatedContent.clientId}`);
  revalidatePath('/clientes');
  revalidatePath('/design');
  revalidatePath('/social-media');
  revalidatePath('/clientes');

  if (
    referenceUpdateError
  ) {
    redirect(
      `/conteudos/${contentId}?error=reference-update`
    );
  }


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
      status: "FINALIZADO",
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

export async function generateDraftLog(...args: unknown[]) {
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

export async function applyDraftToContent(...args: unknown[]) {
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

  if (
    secondArg &&
    typeof secondArg === "object" &&
    !(secondArg instanceof FormData)
  ) {
    const draft =
      secondArg as
        Record<string, unknown>;

    field = String(
      draft.field ||
      draft.targetField ||
      draft.type ||
      ""
    ).trim();

    value = String(
      draft.value ||
      draft.text ||
      draft.content ||
      ""
    ).trim();
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

  const segment = String(
    formData.get('segment') ||
    ''
  ).trim();

  await prisma.promptTemplate.create({
    data: {
      title,
      prompt:
        content,
      category:
        type ||
        null,
      segment:
        segment ||
        null,
    },
  });

  revalidatePath('/prompts');
  redirect('/prompts');
}
