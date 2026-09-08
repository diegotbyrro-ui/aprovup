"use server";

import { revalidatePath } from "next/cache";

import { requireCrmManageAccess } from "@/lib/crmAccess";
import { createClient } from "@/lib/crm-supabase/server";

export type PipelineStageActionResult = {
  success: boolean;
  message: string;
};

type StageInput = {
  name: string;
  color?: string | null;
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

function cleanName(value: string) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeColor(value?: string | null) {
  const color = String(value ?? "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toLowerCase();
  }

  return "#2f6df6";
}

function refreshPipeline() {
  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/cockpit");
}

async function applyStageOrderSafely({
  supabase,
  organizationId,
  orderedStageIds,
  currentPositions,
}: {
  supabase: any;
  organizationId: string;
  orderedStageIds: string[];
  currentPositions: number[];
}) {
  const currentMaxPosition =
    currentPositions.length > 0
      ? Math.max(...currentPositions)
      : 0;

  /*
   * Primeiro movemos todas as colunas para uma faixa
   * temporária que não conflita com posições existentes.
   */
  const temporaryBase =
    currentMaxPosition +
    orderedStageIds.length +
    1000;

  for (
    let index = 0;
    index < orderedStageIds.length;
    index += 1
  ) {
    const stageId =
      orderedStageIds[index];

    const { error } =
      await supabase
        .from("pipeline_stages")
        .update({
          position:
            temporaryBase + index,
        })
        .eq(
          "organization_id",
          organizationId
        )
        .eq(
          "id",
          stageId
        );

    if (error) {
      throw new Error(
        error.message
      );
    }
  }

  /*
   * Agora que 0, 1, 2... estão livres,
   * aplicamos a ordem definitiva.
   */
  for (
    let position = 0;
    position < orderedStageIds.length;
    position += 1
  ) {
    const stageId =
      orderedStageIds[position];

    const { error } =
      await supabase
        .from("pipeline_stages")
        .update({
          position,
        })
        .eq(
          "organization_id",
          organizationId
        )
        .eq(
          "id",
          stageId
        );

    if (error) {
      throw new Error(
        error.message
      );
    }
  }
}

export async function createPipelineStageAction(
  input: StageInput
): Promise<PipelineStageActionResult> {
  try {
    const name = cleanName(input.name);

    if (name.length < 2) {
      return {
        success: false,
        message: "Informe um nome para a coluna.",
      };
    }

    if (name.length > 80) {
      return {
        success: false,
        message: "O nome da coluna deve ter no máximo 80 caracteres.",
      };
    }

    const { supabase, organizationId } =
      await getAuthenticatedContext();

    const { data: lastStage, error: lastStageError } =
      await supabase
        .from("pipeline_stages")
        .select("position")
        .eq("organization_id", organizationId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lastStageError) {
      throw new Error(lastStageError.message);
    }

    const nextPosition =
      Number(lastStage?.position ?? -1) + 1;

    const { error } = await supabase
      .from("pipeline_stages")
      .insert({
        organization_id: organizationId,
        name,
        color: normalizeColor(input.color),
        position: nextPosition,
        is_closed: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    refreshPipeline();

    return {
      success: true,
      message: "Coluna criada com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível criar a coluna.",
    };
  }
}

export async function updatePipelineStageAction(
  stageId: string,
  input: StageInput
): Promise<PipelineStageActionResult> {
  try {
    const name = cleanName(input.name);

    if (!stageId) {
      return {
        success: false,
        message: "Coluna não identificada.",
      };
    }

    if (name.length < 2) {
      return {
        success: false,
        message: "Informe um nome para a coluna.",
      };
    }

    if (name.length > 80) {
      return {
        success: false,
        message: "O nome da coluna deve ter no máximo 80 caracteres.",
      };
    }

    const { supabase, organizationId } =
      await getAuthenticatedContext();

    const { data: validStage, error: validationError } =
      await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("id", stageId)
        .maybeSingle();

    if (validationError) {
      throw new Error(validationError.message);
    }

    if (!validStage) {
      return {
        success: false,
        message: "Esta coluna não pertence à sua empresa.",
      };
    }

    const { error } = await supabase
      .from("pipeline_stages")
      .update({
        name,
        color: normalizeColor(input.color),
      })
      .eq("organization_id", organizationId)
      .eq("id", stageId);

    if (error) {
      throw new Error(error.message);
    }

    refreshPipeline();

    return {
      success: true,
      message: "Coluna atualizada.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a coluna.",
    };
  }
}

export async function reorderPipelineStagesAction(
  orderedStageIds: string[]
): Promise<PipelineStageActionResult> {
  try {
    if (!Array.isArray(orderedStageIds) || orderedStageIds.length === 0) {
      return {
        success: false,
        message: "Nenhuma coluna foi informada.",
      };
    }

    const uniqueIds = [...new Set(orderedStageIds)];

    if (uniqueIds.length !== orderedStageIds.length) {
      return {
        success: false,
        message: "A ordenação contém colunas duplicadas.",
      };
    }

    const { supabase, organizationId } =
      await getAuthenticatedContext();

    const { data: existingStages, error: existingError } =
      await supabase
        .from("pipeline_stages")
        .select("id,position")
        .eq("organization_id", organizationId);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existingIds = new Set(
      (existingStages ?? []).map((stage) => stage.id)
    );

    if (
      existingIds.size !== orderedStageIds.length ||
      orderedStageIds.some((id) => !existingIds.has(id))
    ) {
      return {
        success: false,
        message:
          "A lista de colunas mudou. Atualize a página e tente novamente.",
      };
    }

    await applyStageOrderSafely({
      supabase,
      organizationId,
      orderedStageIds,
      currentPositions:
        (existingStages ?? []).map(
          (stage) =>
            Number(
              stage.position ?? 0
            )
        ),
    });

    refreshPipeline();

    return {
      success: true,
      message: "Ordem das colunas atualizada.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível reordenar as colunas.",
    };
  }
}

export async function deletePipelineStageAction(
  stageId: string,
  destinationStageId?: string | null
): Promise<PipelineStageActionResult> {
  try {
    if (!stageId) {
      return {
        success: false,
        message: "Coluna não identificada.",
      };
    }

    if (stageId === destinationStageId) {
      return {
        success: false,
        message: "Escolha outra coluna para receber as oportunidades.",
      };
    }

    const { supabase, organizationId } =
      await getAuthenticatedContext();

    const { data: stages, error: stagesError } =
      await supabase
        .from("pipeline_stages")
        .select("id,position")
        .eq("organization_id", organizationId)
        .order("position", { ascending: true });

    if (stagesError) {
      throw new Error(stagesError.message);
    }

    const currentStages = stages ?? [];

    if (currentStages.length <= 1) {
      return {
        success: false,
        message: "A pipeline precisa manter pelo menos uma coluna.",
      };
    }

    if (!currentStages.some((stage) => stage.id === stageId)) {
      return {
        success: false,
        message: "Esta coluna não pertence à sua empresa.",
      };
    }

    const { count: leadCount, error: leadCountError } =
      await supabase
        .from("leads")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("organization_id", organizationId)
        .eq("stage_id", stageId);

    if (leadCountError) {
      throw new Error(leadCountError.message);
    }

    const hasLeads = Number(leadCount ?? 0) > 0;

    if (hasLeads) {
      if (!destinationStageId) {
        return {
          success: false,
          message:
            "Escolha uma coluna de destino para as oportunidades.",
        };
      }

      const destinationExists =
        currentStages.some(
          (stage) => stage.id === destinationStageId
        );

      if (!destinationExists) {
        return {
          success: false,
          message: "A coluna de destino é inválida.",
        };
      }

      const { error: moveError } = await supabase
        .from("leads")
        .update({
          stage_id: destinationStageId,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId)
        .eq("stage_id", stageId);

      if (moveError) {
        throw new Error(moveError.message);
      }
    }

    const { error: deleteError } = await supabase
      .from("pipeline_stages")
      .delete()
      .eq("organization_id", organizationId)
      .eq("id", stageId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const remainingStages =
      currentStages.filter(
        (stage) =>
          stage.id !== stageId
      );

    if (
      remainingStages.length >
      0
    ) {
      await applyStageOrderSafely({
        supabase,
        organizationId,
        orderedStageIds:
          remainingStages.map(
            (stage) =>
              stage.id
          ),
        currentPositions:
          remainingStages.map(
            (stage) =>
              Number(
                stage.position ?? 0
              )
          ),
      });
    }

    refreshPipeline();

    return {
      success: true,
      message: "Coluna excluída com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a coluna.",
    };
  }
}