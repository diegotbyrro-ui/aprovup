"use server";

import { requireCrmManageAccess } from "@/lib/crmAccess";

import { createClient } from "@/lib/crm-supabase/server";
import { revalidatePath } from "next/cache";

export type LeadActionResult = {
  success: boolean;
  message: string;
};

async function getAuthenticatedContext() {
  await requireCrmManageAccess();

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: organizationId, error: bootstrapError } =
    await supabase.rpc("bootstrap_workspace");

  if (bootstrapError || !organizationId) {
    throw new Error(
      bootstrapError?.message ??
        "Não foi possível preparar o ambiente da empresa."
    );
  }

  return {
    supabase,
    user,
    organizationId: organizationId as string,
  };
}

function readText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, field: string) {
  const value = readText(formData, field);

  if (!value) {
    return 0;
  }

  const normalizedValue = value
    .replace(/\s/g, "")
    .replace(/^R\$/, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizeUrl(value: string) {
  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `https://${value}`;
}

function normalizeTemperature(value: string) {
  return ["cold", "warm", "hot"].includes(value)
    ? value
    : "cold";
}

function normalizePriority(value: string) {
  return ["low", "medium", "high"].includes(value)
    ? value
    : "medium";
}

function revalidateCommercialPages() {
  revalidatePath("/crm");
  revalidatePath("/crm/cockpit");
}

export async function createLeadAction(
  _previousState: LeadActionResult,
  formData: FormData
): Promise<LeadActionResult> {
  try {
    const companyName = readText(formData, "company_name");

    if (companyName.length < 2) {
      return {
        success: false,
        message: "Informe o nome da empresa.",
      };
    }

    const { supabase, user, organizationId } =
      await getAuthenticatedContext();

    const { data: firstStage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_closed", false)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (stageError) {
      throw new Error(stageError.message);
    }

    const { error: insertError } = await supabase
      .from("leads")
      .insert({
        organization_id: organizationId,
        stage_id: firstStage?.id ?? null,
        company_name: companyName,
        segment: readText(formData, "segment") || null,
        website: normalizeUrl(readText(formData, "website")),
        instagram: readText(formData, "instagram") || null,
        phone: readText(formData, "phone") || null,
        whatsapp: readText(formData, "whatsapp") || null,
        email: readText(formData, "email") || null,
        city: readText(formData, "city") || null,
        state:
          readText(formData, "state").toUpperCase() || null,
        decision_maker_name:
          readText(formData, "decision_maker_name") || null,
        decision_maker_role:
          readText(formData, "decision_maker_role") || null,
        estimated_value: readNumber(
          formData,
          "estimated_value"
        ),
        temperature: normalizeTemperature(
          readText(formData, "temperature")
        ),
        priority: normalizePriority(
          readText(formData, "priority")
        ),
        next_action:
          readText(formData, "next_action") || null,
        notes: readText(formData, "notes") || null,
        created_by: user.id,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    revalidateCommercialPages();

    return {
      success: true,
      message: "Lead cadastrado com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o lead.",
    };
  }
}

export async function updateLeadAction(
  _previousState: LeadActionResult,
  formData: FormData
): Promise<LeadActionResult> {
  try {
    const leadId = readText(formData, "lead_id");
    const companyName = readText(formData, "company_name");

    if (!leadId) {
      return {
        success: false,
        message: "Lead não identificado.",
      };
    }

    if (companyName.length < 2) {
      return {
        success: false,
        message: "Informe o nome da empresa.",
      };
    }

    const { supabase, organizationId } =
      await getAuthenticatedContext();

    const { error } = await supabase
      .from("leads")
      .update({
        company_name: companyName,
        segment: readText(formData, "segment") || null,
        website: normalizeUrl(readText(formData, "website")),
        instagram: readText(formData, "instagram") || null,
        phone: readText(formData, "phone") || null,
        whatsapp: readText(formData, "whatsapp") || null,
        email: readText(formData, "email") || null,
        city: readText(formData, "city") || null,
        state:
          readText(formData, "state").toUpperCase() || null,
        decision_maker_name:
          readText(formData, "decision_maker_name") || null,
        decision_maker_role:
          readText(formData, "decision_maker_role") || null,
        estimated_value: readNumber(
          formData,
          "estimated_value"
        ),
        temperature: normalizeTemperature(
          readText(formData, "temperature")
        ),
        priority: normalizePriority(
          readText(formData, "priority")
        ),
        next_action:
          readText(formData, "next_action") || null,
        notes: readText(formData, "notes") || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(error.message);
    }

    revalidateCommercialPages();

    return {
      success: true,
      message: "Empresa atualizada com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a empresa.",
    };
  }
}

export async function moveLeadAction(
  formData: FormData
) {
  const leadId = readText(formData, "lead_id");
  const stageId = readText(formData, "stage_id");

  if (!leadId || !stageId) {
    return;
  }

  const { supabase, organizationId } =
    await getAuthenticatedContext();

  const { data: validStage, error: stageError } =
    await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("id", stageId)
      .eq("organization_id", organizationId)
      .maybeSingle();

  if (stageError || !validStage) {
    throw new Error(
      stageError?.message ?? "Etapa inválida."
    );
  }

  const { error } = await supabase
    .from("leads")
    .update({
      stage_id: stageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateCommercialPages();
}

export async function deleteLeadAction(
  formData: FormData
) {
  const leadId = readText(formData, "lead_id");

  if (!leadId) {
    return;
  }

  const { supabase, organizationId } =
    await getAuthenticatedContext();

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateCommercialPages();
}