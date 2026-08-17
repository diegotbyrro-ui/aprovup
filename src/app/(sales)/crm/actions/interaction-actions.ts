"use server";

import { createClient } from "@/lib/crm-supabase/server";
import { revalidatePath } from "next/cache";

export type InteractionActionResult = {
  success: boolean;
  message: string;
};

const allowedTypes = [
  "call",
  "whatsapp",
  "email",
  "meeting",
  "note",
];

function readText(
  formData: FormData,
  field: string
) {
  const value = formData.get(field);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeDateTime(value: string) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

async function getAuthenticatedContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Usuário não autenticado.");
  }

  const {
    data: organizationId,
    error: bootstrapError,
  } = await supabase.rpc("bootstrap_workspace");

  if (bootstrapError || !organizationId) {
    throw new Error(
      bootstrapError?.message ??
        "Não foi possível preparar o ambiente comercial."
    );
  }

  return {
    supabase,
    user,
    organizationId: organizationId as string,
  };
}

export async function createInteractionAction(
  _previousState: InteractionActionResult,
  formData: FormData
): Promise<InteractionActionResult> {
  try {
    const leadId = readText(formData, "lead_id");
    const interactionType = readText(
      formData,
      "interaction_type"
    );

    const subject = readText(formData, "subject");
    const description = readText(
      formData,
      "description"
    );

    const occurredAt =
      normalizeDateTime(
        readText(formData, "occurred_at")
      ) ?? new Date().toISOString();

    const followUpAt = normalizeDateTime(
      readText(formData, "follow_up_at")
    );

    if (!leadId) {
      return {
        success: false,
        message: "A empresa não foi identificada.",
      };
    }

    if (!allowedTypes.includes(interactionType)) {
      return {
        success: false,
        message: "Selecione um tipo de interação válido.",
      };
    }

    if (subject.length < 3) {
      return {
        success: false,
        message:
          "Informe um resumo com pelo menos 3 caracteres.",
      };
    }

    const {
      supabase,
      user,
      organizationId,
    } = await getAuthenticatedContext();

    const {
      data: validLead,
      error: leadError,
    } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (leadError || !validLead) {
      throw new Error(
        leadError?.message ??
          "A empresa informada não foi encontrada."
      );
    }

    const { error: insertError } = await supabase
      .from("lead_interactions")
      .insert({
        organization_id: organizationId,
        lead_id: leadId,
        interaction_type: interactionType,
        subject,
        description: description || null,
        occurred_at: occurredAt,
        follow_up_at: followUpAt,
        created_by: user.id,
        created_by_email:
          user.email ?? "Usuário comercial",
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    if (followUpAt) {
      const formattedFollowUp =
        new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Maceio",
        }).format(new Date(followUpAt));

      await supabase
        .from("leads")
        .update({
          next_action: `${subject} — ${formattedFollowUp}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId)
        .eq("organization_id", organizationId);
    }

    revalidatePath(`/crm/${leadId}`);
    revalidatePath("/crm");
    revalidatePath("/crm/cockpit");

    return {
      success: true,
      message: "Interação registrada com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a interação.",
    };
  }
}

export async function deleteInteractionAction(
  formData: FormData
) {
  const interactionId = readText(
    formData,
    "interaction_id"
  );

  const leadId = readText(formData, "lead_id");

  if (!interactionId || !leadId) {
    return;
  }

  const {
    supabase,
    organizationId,
  } = await getAuthenticatedContext();

  const { error } = await supabase
    .from("lead_interactions")
    .delete()
    .eq("id", interactionId)
    .eq("lead_id", leadId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/crm/${leadId}`);
  revalidatePath("/crm");
}
export async function completeFollowUpAction(
  formData: FormData
) {
  const interactionId = readText(
    formData,
    "interaction_id"
  );

  const leadId = readText(
    formData,
    "lead_id"
  );

  if (!interactionId || !leadId) {
    throw new Error(
      "A atividade não foi identificada."
    );
  }

  const {
    supabase,
    user,
    organizationId,
  } = await getAuthenticatedContext();

  const {
    data: interaction,
    error: interactionError,
  } = await supabase
    .from("lead_interactions")
    .select(`
      id,
      subject,
      follow_up_at,
      follow_up_completed_at
    `)
    .eq("id", interactionId)
    .eq("lead_id", leadId)
    .eq(
      "organization_id",
      organizationId
    )
    .maybeSingle();

  if (interactionError || !interaction) {
    throw new Error(
      interactionError?.message ??
        "A atividade não foi encontrada."
    );
  }

  if (interaction.follow_up_completed_at) {
    return;
  }

  const completedAt =
    new Date().toISOString();

  const { error: updateError } =
    await supabase
      .from("lead_interactions")
      .update({
        follow_up_completed_at:
          completedAt,
        follow_up_completed_by:
          user.id,
        follow_up_completed_by_email:
          user.email ??
          "Usuário comercial",
        updated_at: completedAt,
      })
      .eq("id", interactionId)
      .eq("lead_id", leadId)
      .eq(
        "organization_id",
        organizationId
      );

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  const {
    data: nextPendingFollowUp,
  } = await supabase
    .from("lead_interactions")
    .select(`
      subject,
      follow_up_at
    `)
    .eq("lead_id", leadId)
    .eq(
      "organization_id",
      organizationId
    )
    .not("follow_up_at", "is", null)
    .is(
      "follow_up_completed_at",
      null
    )
    .order("follow_up_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  let nextAction: string | null =
    null;

  if (
    nextPendingFollowUp?.follow_up_at
  ) {
    const formattedDate =
      new Intl.DateTimeFormat(
        "pt-BR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone:
            "America/Maceio",
        }
      ).format(
        new Date(
          nextPendingFollowUp.follow_up_at
        )
      );

    nextAction =
      `${nextPendingFollowUp.subject} — ${formattedDate}`;
  }

  await supabase
    .from("leads")
    .update({
      next_action: nextAction,
      updated_at: completedAt,
    })
    .eq("id", leadId)
    .eq(
      "organization_id",
      organizationId
    );

  revalidatePath("/crm/agenda");
  revalidatePath("/crm/cockpit");
  revalidatePath("/crm");
  revalidatePath(`/crm/${leadId}`);
}