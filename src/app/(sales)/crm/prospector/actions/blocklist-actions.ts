"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/crm-supabase/server";

export type BlockReason =
  | "Ex-cliente"
  | "Não temos interesse"
  | "Ticket incompatível"
  | "Empresa concorrente"
  | "Empresa duplicada"
  | "Já está no CRM"
  | "Outro";

function normalizeCompanyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\b(ltda|me|eireli|sa|s a|grupo|empresa)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function blockProspect(input: {
  companyName: string;
  website?: string | null;
  reason: BlockReason;
  notes?: string;
}) {
  const companyName = input.companyName?.trim();

  if (!companyName) {
    return {
      success: false,
      message: "Nome da empresa não informado.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Sua sessão expirou. Entre novamente.",
    };
  }

  const normalizedName = normalizeCompanyName(companyName);

  const { error } = await supabase
    .from("prospector_blocklist")
    .upsert(
      {
        company_name: companyName,
        normalized_name: normalizedName,
        website: input.website?.trim() || null,
        reason: input.reason,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      },
      {
        onConflict: "normalized_name",
      }
    );

  if (error) {
    console.error("Erro ao bloquear prospect:", error);

    return {
      success: false,
      message: "Não foi possível adicionar a empresa à lista de exclusão.",
    };
  }

  revalidatePath("/crm/prospector");

  return {
    success: true,
    message: `${companyName} não aparecerá mais nas prospecções.`,
  };
}

export async function getBlockedProspectNames() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prospector_blocklist")
    .select("normalized_name");

  if (error) {
    console.error("Erro ao consultar lista de exclusão:", error);
    return [];
  }

  return (data ?? []).map((item) => item.normalized_name);
}

export async function getProspectorBlocklist() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prospector_blocklist")
    .select("id, company_name, website, reason, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao consultar empresas bloqueadas:", error);
    return [];
  }

  return data ?? [];
}

export async function unblockProspect(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("prospector_blocklist")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      success: false,
      message: "Não foi possível liberar a empresa.",
    };
  }

  revalidatePath("/crm/prospector");
  revalidatePath("/crm/configuracoes");

  return {
    success: true,
    message: "Empresa liberada para novas prospecções.",
  };
}