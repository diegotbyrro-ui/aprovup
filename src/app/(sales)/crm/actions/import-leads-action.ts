"use server";

import { requireCrmManageAccess } from "@/lib/crmAccess";

import { createClient } from "@/lib/crm-supabase/server";
import { revalidatePath } from "next/cache";

export type ImportLeadsActionResult = {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
};

type ParsedLead = {
  company_name: string;
  segment: string | null;
  website: string | null;
  instagram: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  decision_maker_name: string | null;
  decision_maker_role: string | null;
  estimated_value: number;
  temperature: "cold" | "warm" | "hot";
  priority: "low" | "medium" | "high";
  notes: string | null;
};

const allowedTemperatures = [
  "cold",
  "warm",
  "hot",
] as const;

const allowedPriorities = [
  "low",
  "medium",
  "high",
] as const;

function readText(
  formData: FormData,
  field: string
) {
  const value = formData.get(field);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeNullable(
  value: string | undefined
) {
  const normalized = value?.trim();

  return normalized
    ? normalized
    : null;
}

function normalizeCompanyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseMoney(value: string | undefined) {
  if (!value?.trim()) {
    return 0;
  }

  const normalized = value
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? Math.max(0, parsed)
    : 0;
}

function parseLeadLine(
  line: string,
  lineNumber: number
): {
  lead: ParsedLead | null;
  error: string | null;
} {
  const columns = line
    .split(";")
    .map((column) => column.trim());

  const companyName = columns[0];

  if (!companyName) {
    return {
      lead: null,
      error: `Linha ${lineNumber}: nome da empresa não informado.`,
    };
  }

  const temperatureValue =
    columns[13]?.toLowerCase() ?? "warm";

  const priorityValue =
    columns[14]?.toLowerCase() ?? "medium";

  const temperature =
    allowedTemperatures.includes(
      temperatureValue as
        (typeof allowedTemperatures)[number]
    )
      ? (temperatureValue as ParsedLead["temperature"])
      : "warm";

  const priority =
    allowedPriorities.includes(
      priorityValue as
        (typeof allowedPriorities)[number]
    )
      ? (priorityValue as ParsedLead["priority"])
      : "medium";

  return {
    lead: {
      company_name: companyName,
      segment: normalizeNullable(columns[1]),
      website: normalizeNullable(columns[2]),
      instagram: normalizeNullable(columns[3]),
      phone: normalizeNullable(columns[4]),
      whatsapp:
        normalizeNullable(columns[5]) ??
        normalizeNullable(columns[4]),
      email: normalizeNullable(columns[6]),
      city: normalizeNullable(columns[7]),
      state: normalizeNullable(columns[8]),
      decision_maker_name:
        normalizeNullable(columns[9]),
      decision_maker_role:
        normalizeNullable(columns[10]),
      estimated_value:
        parseMoney(columns[11]),
      temperature,
      priority,
      notes: normalizeNullable(columns[15]),
    },
    error: null,
  };
}

export async function importLeadsAction(
  _previousState: ImportLeadsActionResult,
  formData: FormData
): Promise<ImportLeadsActionResult> {
  await requireCrmManageAccess();

  try {
    const rawContent = readText(
      formData,
      "companies"
    );

    if (!rawContent) {
      return {
        success: false,
        message:
          "Cole pelo menos uma empresa para importar.",
        imported: 0,
        skipped: 0,
        errors: [],
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        message: "Usuário não autenticado.",
        imported: 0,
        skipped: 0,
        errors: [],
      };
    }

    const {
      data: organizationId,
      error: bootstrapError,
    } = await supabase.rpc(
      "bootstrap_workspace"
    );

    if (
      bootstrapError ||
      !organizationId
    ) {
      throw new Error(
        bootstrapError?.message ??
          "Não foi possível preparar o ambiente comercial."
      );
    }

    const {
      data: firstStage,
      error: stageError,
    } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq(
        "organization_id",
        organizationId
      )
      .eq("is_closed", false)
      .order("position", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (stageError || !firstStage) {
      throw new Error(
        stageError?.message ??
          "Nenhuma etapa inicial foi encontrada."
      );
    }

    const {
      data: existingLeads,
      error: existingError,
    } = await supabase
      .from("leads")
      .select("company_name")
      .eq(
        "organization_id",
        organizationId
      );

    if (existingError) {
      throw new Error(
        existingError.message
      );
    }

    const existingNames = new Set(
      (existingLeads ?? []).map((lead) =>
        normalizeCompanyName(
          lead.company_name
        )
      )
    );

    const lines = rawContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsedLeads: ParsedLead[] = [];
    const errors: string[] = [];
    let skipped = 0;

    lines.forEach((line, index) => {
      const result = parseLeadLine(
        line,
        index + 1
      );

      if (result.error || !result.lead) {
        errors.push(
          result.error ??
            `Linha ${index + 1}: erro desconhecido.`
        );

        return;
      }

      const normalizedName =
        normalizeCompanyName(
          result.lead.company_name
        );

      if (existingNames.has(normalizedName)) {
        skipped += 1;
        return;
      }

      existingNames.add(normalizedName);
      parsedLeads.push(result.lead);
    });

    if (parsedLeads.length === 0) {
      return {
        success: false,
        message:
          skipped > 0
            ? "Nenhuma empresa nova foi importada. Todas já estavam cadastradas."
            : "Nenhuma empresa válida foi encontrada.",
        imported: 0,
        skipped,
        errors,
      };
    }

    const insertPayload = parsedLeads.map(
      (lead) => ({
        organization_id: organizationId,
        stage_id: firstStage.id,
        company_name: lead.company_name,
        segment: lead.segment,
        website: lead.website,
        instagram: lead.instagram,
        phone: lead.phone,
        whatsapp: lead.whatsapp,
        email: lead.email,
        city: lead.city,
        state: lead.state,
        decision_maker_name:
          lead.decision_maker_name,
        decision_maker_role:
          lead.decision_maker_role,
        estimated_value:
          lead.estimated_value,
        temperature: lead.temperature,
        priority: lead.priority,
        notes: lead.notes,
        next_action: null,
      })
    );

    const { error: insertError } =
      await supabase
        .from("leads")
        .insert(insertPayload);

    if (insertError) {
      throw new Error(
        insertError.message
      );
    }

    revalidatePath("/crm");
    revalidatePath("/crm/cockpit");
    revalidatePath("/crm/agenda");
    revalidatePath("/crm/ia");

    return {
      success: true,
      message: `${parsedLeads.length} empresa${parsedLeads.length !== 1 ? "s" : ""} importada${parsedLeads.length !== 1 ? "s" : ""} com sucesso.`,
      imported: parsedLeads.length,
      skipped,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível importar as empresas.",
      imported: 0,
      skipped: 0,
      errors: [],
    };
  }
}