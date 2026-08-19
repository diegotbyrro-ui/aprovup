"use server";

import { requireCrmAiManageAccess } from "@/lib/crmAccess";

import { createClient } from "@/lib/crm-supabase/server";
import { revalidatePath } from "next/cache";

export type AiAnalysisActionResult = {
  success: boolean;
  message: string;
};

type LeadForAnalysis = {
  id: string;
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
  next_action: string | null;
  notes: string | null;
  stage_id: string | null;
};

type InteractionForAnalysis = {
  interaction_type:
    | "call"
    | "whatsapp"
    | "email"
    | "meeting"
    | "note";
  subject: string;
  description: string | null;
  occurred_at: string;
  follow_up_at: string | null;
};

type AiCommercialAnalysis = {
  executive_summary: string;
  marketing_diagnosis: string;
  commercial_opportunities: string;
  recommended_approach: string;
  whatsapp_message: string;
  probable_objections: string;
  next_step: string;
  interest_level:
    | "low"
    | "medium"
    | "high"
    | "very_high";
  commercial_score: number;
};

function readText(
  formData: FormData,
  field: string
) {
  const value = formData.get(field);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function extractResponseText(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "output_text" in payload &&
    typeof payload.output_text === "string"
  ) {
    return payload.output_text;
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("output" in payload) ||
    !Array.isArray(payload.output)
  ) {
    return "";
  }

  for (const item of payload.output) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("content" in item) ||
      !Array.isArray(item.content)
    ) {
      continue;
    }

    for (const content of item.content) {
      if (
        typeof content === "object" &&
        content !== null &&
        "text" in content &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return "";
}

function validateAnalysis(
  value: unknown
): AiCommercialAnalysis {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new Error(
      "A IA retornou uma análise inválida."
    );
  }

  const analysis =
    value as Partial<AiCommercialAnalysis>;

  const requiredTexts: Array<
    keyof Pick<
      AiCommercialAnalysis,
      | "executive_summary"
      | "marketing_diagnosis"
      | "commercial_opportunities"
      | "recommended_approach"
      | "whatsapp_message"
      | "probable_objections"
      | "next_step"
    >
  > = [
    "executive_summary",
    "marketing_diagnosis",
    "commercial_opportunities",
    "recommended_approach",
    "whatsapp_message",
    "probable_objections",
    "next_step",
  ];

  for (const field of requiredTexts) {
    if (
      typeof analysis[field] !== "string" ||
      analysis[field].trim().length < 3
    ) {
      throw new Error(
        `A IA não preencheu corretamente o campo ${field}.`
      );
    }
  }

  const allowedInterestLevels = [
    "low",
    "medium",
    "high",
    "very_high",
  ];

  if (
    typeof analysis.interest_level !==
      "string" ||
    !allowedInterestLevels.includes(
      analysis.interest_level
    )
  ) {
    throw new Error(
      "A IA retornou um nível de interesse inválido."
    );
  }

  const score = Number(
    analysis.commercial_score
  );

  if (
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    throw new Error(
      "A IA retornou um score comercial inválido."
    );
  }

  return {
    executive_summary:
      analysis.executive_summary!.trim(),
    marketing_diagnosis:
      analysis.marketing_diagnosis!.trim(),
    commercial_opportunities:
      analysis.commercial_opportunities!.trim(),
    recommended_approach:
      analysis.recommended_approach!.trim(),
    whatsapp_message:
      analysis.whatsapp_message!.trim(),
    probable_objections:
      analysis.probable_objections!.trim(),
    next_step: analysis.next_step!.trim(),
    interest_level:
      analysis.interest_level as
        AiCommercialAnalysis["interest_level"],
    commercial_score: Math.round(score),
  };
}

export async function generateAiAnalysisAction(
  _previousState: AiAnalysisActionResult,
  formData: FormData
): Promise<AiAnalysisActionResult> {
  await requireCrmAiManageAccess();

  try {
    const leadId = readText(
      formData,
      "lead_id"
    );

    if (!leadId) {
      return {
        success: false,
        message:
          "A empresa não foi identificada.",
      };
    }

    const apiKey =
      process.env.OPENAI_API_KEY;

    const model =
      process.env.OPENAI_MODEL ??
      "gpt-5.6-luna";

    if (!apiKey) {
      return {
        success: false,
        message:
          "A chave OPENAI_API_KEY não foi configurada.",
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

    const [
      {
        data: leadData,
        error: leadError,
      },
      {
        data: interactionsData,
        error: interactionsError,
      },
    ] = await Promise.all([
      supabase
        .from("leads")
        .select(`
          id,
          company_name,
          segment,
          website,
          instagram,
          phone,
          whatsapp,
          email,
          city,
          state,
          decision_maker_name,
          decision_maker_role,
          estimated_value,
          temperature,
          priority,
          next_action,
          notes,
          stage_id
        `)
        .eq("id", leadId)
        .eq(
          "organization_id",
          organizationId
        )
        .maybeSingle(),

      supabase
        .from("lead_interactions")
        .select(`
          interaction_type,
          subject,
          description,
          occurred_at,
          follow_up_at
        `)
        .eq("lead_id", leadId)
        .eq(
          "organization_id",
          organizationId
        )
        .order("occurred_at", {
          ascending: false,
        })
        .limit(15),
    ]);

    if (leadError || !leadData) {
      throw new Error(
        leadError?.message ??
          "A empresa não foi encontrada."
      );
    }

    if (interactionsError) {
      throw new Error(
        interactionsError.message
      );
    }

    const lead =
      leadData as LeadForAnalysis;

    const interactions =
      (interactionsData ??
        []) as InteractionForAnalysis[];

    let stageName =
      "Etapa não informada";

    if (lead.stage_id) {
      const { data: stageData } =
        await supabase
          .from("pipeline_stages")
          .select("name")
          .eq("id", lead.stage_id)
          .eq(
            "organization_id",
            organizationId
          )
          .maybeSingle();

      if (stageData?.name) {
        stageName = stageData.name;
      }
    }

    const commercialContext = {
      company: {
        name: lead.company_name,
        segment: lead.segment,
        website: lead.website,
        instagram: lead.instagram,
        city: lead.city,
        state: lead.state,
        decision_maker:
          lead.decision_maker_name,
        decision_maker_role:
          lead.decision_maker_role,
        estimated_monthly_value:
          Number(
            lead.estimated_value ?? 0
          ),
        temperature: lead.temperature,
        priority: lead.priority,
        pipeline_stage: stageName,
        next_action: lead.next_action,
        research_notes: lead.notes,
      },
      contact_channels: {
        has_phone: Boolean(lead.phone),
        has_whatsapp: Boolean(
          lead.whatsapp
        ),
        has_email: Boolean(lead.email),
        has_website: Boolean(
          lead.website
        ),
        has_instagram: Boolean(
          lead.instagram
        ),
      },
      interaction_history:
        interactions.map(
          (interaction) => ({
            type:
              interaction.interaction_type,
            subject:
              interaction.subject,
            description:
              interaction.description,
            occurred_at:
              interaction.occurred_at,
            follow_up_at:
              interaction.follow_up_at,
          })
        ),
    };

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          reasoning: {
            effort: "low",
          },
          instructions: `
Você é o estrategista comercial da Level UP Marketing Digital, uma agência de marketing de Maceió.

Sua missão é ajudar Diego a vender serviços de marketing digital, produção audiovisual, gestão de redes sociais, tráfego pago, criação de sites, branding e estratégia.

Analise somente os dados fornecidos. Não invente pesquisas, números, fatos, campanhas, concorrentes ou comportamentos que não estejam no contexto.

Quando faltarem informações, deixe claro que são hipóteses comerciais.

A abordagem precisa ser humana, consultiva, específica e sem promessas exageradas.

A mensagem de WhatsApp deve parecer escrita por uma pessoa real. Ela deve ser curta, natural, sem linguagem robótica e sem começar apresentando uma proposta comercial agressiva.

O score comercial deve refletir a maturidade atual da negociação, e não apenas a quantidade de dados cadastrados.

Referência de score:
0 a 29: lead pouco qualificado.
30 a 49: possibilidade inicial.
50 a 69: oportunidade promissora.
70 a 84: boa oportunidade comercial.
85 a 94: negociação avançada.
95 a 100: reservado para interesse confirmado, reunião avançada ou proposta em forte negociação.

Uma empresa que está apenas em primeiro contato não deve receber score acima de 84.
          `.trim(),
          input: `
Produza uma análise comercial para a empresa abaixo.

DADOS DO CRM:
${JSON.stringify(
  commercialContext,
  null,
  2
)}

Escreva todos os campos em português brasileiro.

Em probable_objections, apresente no máximo três objeções e a melhor resposta para cada uma.

Em commercial_opportunities, priorize os serviços da Level UP que realmente fazem sentido com base no contexto.

Em next_step, recomende uma ação prática e executável.
          `.trim(),
          text: {
            verbosity: "medium",
            format: {
              type: "json_schema",
              name:
                "level_up_commercial_analysis",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  executive_summary: {
                    type: "string",
                  },
                  marketing_diagnosis: {
                    type: "string",
                  },
                  commercial_opportunities: {
                    type: "string",
                  },
                  recommended_approach: {
                    type: "string",
                  },
                  whatsapp_message: {
                    type: "string",
                  },
                  probable_objections: {
                    type: "string",
                  },
                  next_step: {
                    type: "string",
                  },
                  interest_level: {
                    type: "string",
                    enum: [
                      "low",
                      "medium",
                      "high",
                      "very_high",
                    ],
                  },
                  commercial_score: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                  },
                },
                required: [
                  "executive_summary",
                  "marketing_diagnosis",
                  "commercial_opportunities",
                  "recommended_approach",
                  "whatsapp_message",
                  "probable_objections",
                  "next_step",
                  "interest_level",
                  "commercial_score",
                ],
              },
            },
          },
        }),
      }
    );

    const responsePayload =
      (await response.json()) as unknown;

    if (!response.ok) {
      let apiMessage =
        "A OpenAI não conseguiu gerar a análise.";

      if (
        typeof responsePayload ===
          "object" &&
        responsePayload !== null &&
        "error" in responsePayload &&
        typeof responsePayload.error ===
          "object" &&
        responsePayload.error !== null &&
        "message" in
          responsePayload.error &&
        typeof responsePayload.error
          .message === "string"
      ) {
        apiMessage =
          responsePayload.error.message;
      }

      throw new Error(apiMessage);
    }

    const responseText =
      extractResponseText(
        responsePayload
      );

    if (!responseText) {
      throw new Error(
        "A OpenAI não retornou o conteúdo da análise."
      );
    }

    let parsedAnalysis: unknown;

    try {
      parsedAnalysis = JSON.parse(
        responseText
      );
    } catch {
      throw new Error(
        "A resposta da IA não pôde ser interpretada."
      );
    }

    const analysis =
      validateAnalysis(parsedAnalysis);

    const { error: insertError } =
      await supabase
        .from("lead_ai_analyses")
        .insert({
          organization_id:
            organizationId,
          lead_id: leadId,
          executive_summary:
            analysis.executive_summary,
          marketing_diagnosis:
            analysis.marketing_diagnosis,
          commercial_opportunities:
            analysis.commercial_opportunities,
          recommended_approach:
            analysis.recommended_approach,
          whatsapp_message:
            analysis.whatsapp_message,
          probable_objections:
            analysis.probable_objections,
          next_step:
            analysis.next_step,
          interest_level:
            analysis.interest_level,
          commercial_score:
            analysis.commercial_score,
          model_used: model,
          generated_by: user.id,
          generated_by_email:
            user.email ??
            "Usuário comercial",
        });

    if (insertError) {
      throw new Error(
        insertError.message
      );
    }

    revalidatePath(
      `/crm/${leadId}`
    );

    revalidatePath("/crm/cockpit");
    revalidatePath("/crm/ia");

    return {
      success: true,
      message:
        "Análise comercial gerada e salva com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a análise.",
    };
  }
}