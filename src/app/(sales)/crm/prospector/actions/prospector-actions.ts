"use server";

import {
  requireCrmManageAccess,
  requireCrmAiManageAccess,
} from "@/lib/crmAccess";

import {
  getOpenAiConfigForAgency,
} from "@/lib/aiProviderCredentials";

import { createClient } from "@/lib/crm-supabase/server";
import { revalidatePath } from "next/cache";

export type ProspectedCompany = {
  company_name: string;
  segment: string;
  website: string;
  instagram: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  state: string;
  decision_maker_name: string;
  decision_maker_role: string;
  decision_maker_phone: string;
  decision_maker_whatsapp: string;
  decision_maker_email: string;
  decision_maker_contact_source: string;
  marketing_diagnosis: string;
  commercial_opportunity: string;
  recommended_approach: string;
  estimated_value: number;
  temperature: "cold" | "warm" | "hot";
  priority: "low" | "medium" | "high";
  prospecting_score: number;
  sources: string[];
};

export type ProspectorActionResult = {
  success: boolean;
  message: string;
  companies: ProspectedCompany[];
};

export type SaveProspectResult = {
  success: boolean;
  message: string;
  leadId: string | null;
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

function normalizeCompanyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeOptional(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function validateCompanies(
  value: unknown
): ProspectedCompany[] {
  if (
    typeof value !== "object" ||
    value === null ||
    !("companies" in value) ||
    !Array.isArray(value.companies)
  ) {
    throw new Error(
      "A pesquisa não retornou uma lista válida."
    );
  }

  return value.companies
    .map((item): ProspectedCompany | null => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return null;
      }

      const company =
        item as Record<string, unknown>;

      const companyName =
        normalizeOptional(
          company.company_name
        );

      if (!companyName) {
        return null;
      }

      const temperatureValue =
        normalizeOptional(
          company.temperature
        );

      const priorityValue =
        normalizeOptional(
          company.priority
        );

      const temperature:
        ProspectedCompany["temperature"] =
          temperatureValue === "hot" ||
          temperatureValue === "cold"
            ? temperatureValue
            : "warm";

      const priority:
        ProspectedCompany["priority"] =
          priorityValue === "high" ||
          priorityValue === "low"
            ? priorityValue
            : "medium";

      const rawScore = Number(
        company.prospecting_score
      );

      const rawValue = Number(
        company.estimated_value
      );

      const sources = Array.isArray(
        company.sources
      )
        ? company.sources
            .filter(
              (source): source is string =>
                typeof source === "string"
            )
            .map((source) => source.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];

      return {
        company_name: companyName,
        segment:
          normalizeOptional(
            company.segment
          ),
        website:
          normalizeOptional(
            company.website
          ),
        instagram:
          normalizeOptional(
            company.instagram
          ),
        phone:
          normalizeOptional(
            company.phone
          ),
        whatsapp:
          normalizeOptional(
            company.whatsapp
          ),
        email:
          normalizeOptional(
            company.email
          ),
        city:
          normalizeOptional(
            company.city
          ),
        state:
          normalizeOptional(
            company.state
          ),
        decision_maker_name:
          normalizeOptional(
            company.decision_maker_name
          ),
        decision_maker_role:
          normalizeOptional(
            company.decision_maker_role
          ),
        decision_maker_phone:
          normalizeOptional(
            company.decision_maker_phone
          ),
        decision_maker_whatsapp:
          normalizeOptional(
            company.decision_maker_whatsapp
          ),
        decision_maker_email:
          normalizeOptional(
            company.decision_maker_email
          ),
        decision_maker_contact_source:
          normalizeOptional(
            company.decision_maker_contact_source
          ),
        marketing_diagnosis:
          normalizeOptional(
            company.marketing_diagnosis
          ),
        commercial_opportunity:
          normalizeOptional(
            company.commercial_opportunity
          ),
        recommended_approach:
          normalizeOptional(
            company.recommended_approach
          ),
        estimated_value:
          Number.isFinite(rawValue)
            ? Math.max(
                0,
                Math.round(rawValue)
              )
            : 0,
        temperature,
        priority,
        prospecting_score:
          Number.isFinite(rawScore)
            ? Math.max(
                0,
                Math.min(
                  100,
                  Math.round(rawScore)
                )
              )
            : 50,
        sources,
      };
    })
    .filter(
      (
        company
      ): company is ProspectedCompany =>
        company !== null
    );
}

async function getAuthenticatedContext() {
  await requireCrmManageAccess();

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Usuário não autenticado."
    );
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

  return {
    supabase,
    user,
    organizationId:
      organizationId as string,
  };
}

export async function searchCompaniesAction(
  _previousState: ProspectorActionResult,
  formData: FormData
): Promise<ProspectorActionResult> {
  const accessUser =
    await requireCrmAiManageAccess();

  try {
    const searchQuery = readText(
      formData,
      "search_query"
    );

    const city = readText(
      formData,
      "city"
    );

    const amountRaw = Number(
      readText(formData, "amount")
    );

    const amount = Number.isFinite(
      amountRaw
    )
      ? Math.max(
          3,
          Math.min(12, amountRaw)
        )
      : 8;

    if (searchQuery.length < 3) {
      return {
        success: false,
        message:
          "Informe o segmento ou tipo de empresa que deseja encontrar.",
        companies: [],
      };
    }

    if (!accessUser.agencyId) {
      return {
        success: false,
        message:
          "A agência do usuário não foi identificada.",
        companies: [],
      };
    }

    const openAiConfig =
      await getOpenAiConfigForAgency(
        accessUser.agencyId
      );

    const apiKey =
      openAiConfig.apiKey;

    const model =
      openAiConfig.model;

    if (!apiKey) {
      return {
        success: false,
        message:
          "Configure a chave da OpenAI em Configurações > Integrações.",
        companies: [],
      };
    }

    const {
      supabase,
      organizationId,
    } = await getAuthenticatedContext();

    const [
      existingLeadsResult,
      blockedCompaniesResult,
      seenCompaniesResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("company_name")
        .eq("organization_id", organizationId),

      supabase
        .from("prospector_blocklist")
        .select("company_name, normalized_name"),

      supabase
        .from("prospector_seen_companies")
        .select("company_name, normalized_name")
        .eq("organization_id", organizationId),
    ]);

    if (existingLeadsResult.error) {
      throw new Error(
        `Erro ao consultar empresas do CRM: ${existingLeadsResult.error.message}`
      );
    }

    if (blockedCompaniesResult.error) {
      throw new Error(
        `Erro ao consultar empresas bloqueadas: ${blockedCompaniesResult.error.message}`
      );
    }

    if (seenCompaniesResult.error) {
      throw new Error(
        `Erro ao consultar histórico do Prospector: ${seenCompaniesResult.error.message}`
      );
    }

    const excludedCompanyNames = Array.from(
      new Set([
        ...(existingLeadsResult.data ?? []).map(
          (item) => item.company_name
        ),
        ...(blockedCompaniesResult.data ?? []).map(
          (item) => item.company_name
        ),
        ...(seenCompaniesResult.data ?? []).map(
          (item) => item.company_name
        ),
      ])
    )
      .filter(Boolean)
      .map((name) => String(name).trim())
      .filter((name) => name.length > 0);

    const excludedNormalizedNames = new Set(
      [
        ...(existingLeadsResult.data ?? []).map(
          (item) => normalizeCompanyName(item.company_name)
        ),
        ...(blockedCompaniesResult.data ?? []).map(
          (item) =>
            item.normalized_name ||
            normalizeCompanyName(item.company_name)
        ),
        ...(seenCompaniesResult.data ?? []).map(
          (item) =>
            item.normalized_name ||
            normalizeCompanyName(item.company_name)
        ),
      ].filter(Boolean)
    );

    const excludedCompaniesPrompt =
      excludedCompanyNames.length > 0
        ? excludedCompanyNames
            .slice(0, 250)
            .map((name, index) => `${index + 1}. ${name}`)
            .join("\n")
        : "Nenhuma empresa registrada anteriormente.";

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          tools: [
            {
              type: "web_search",
            },
          ],
          reasoning: {
            effort: "medium",
          },
          instructions: `
Você é um pesquisador comercial da Level UP Marketing Digital, agência localizada em Maceió.

Pesquise empresas reais usando somente informações públicas encontradas na web.

O objetivo é encontrar possíveis clientes para serviços de:
- gestão estratégica de redes sociais;
- produção audiovisual;
- tráfego pago;
- criação ou reformulação de sites;
- branding;
- estratégia de marketing.

Regras obrigatórias:

1. Trabalhe como um investigador comercial extremamente persistente.
2. Antes de desistir de identificar o decisor, pesquise em varias fontes publicas.
3. Procure proprietario, socio, fundador, CEO, diretor, gerente comercial, gerente de marketing ou outro profissional com poder real de decisao.
4. Cruze site oficial, pagina de equipe, noticias, entrevistas, perfis profissionais publicos, redes sociais da empresa, associacoes empresariais, diretorios empresariais e outras fontes publicas confiaveis.
5. Depois de identificar o decisor, tente localizar telefone profissional, WhatsApp profissional e e-mail profissional publicamente divulgados.
6. Priorize um contato que possa ser associado publicamente ao proprio decisor.
7. Se nao encontrar contato profissional do decisor, mantenha decision_maker_phone, decision_maker_whatsapp e decision_maker_email vazios e use phone, whatsapp e email apenas para os contatos gerais oficiais da empresa.
8. Nunca invente, complete, deduza ou adivinhe um telefone, WhatsApp, e-mail, site, Instagram, nome ou cargo.
9. Nunca use numero residencial, telefone pessoal nao publicado profissionalmente, dados vazados, dados privados ou informacoes obtidas de fontes duvidosas.
10. Um telefone pessoal so pode ser retornado quando a propria pessoa ou empresa o publicou claramente para contato profissional ou comercial.
11. decision_maker_contact_source deve conter a URL publica que sustenta o contato profissional do decisor. Se nao houver fonte, retorne string vazia.
12. Nao apresente uma pessoa como decisor sem evidencia publica de vinculo atual com a empresa.
13. Nao confunda empresas ou pessoas com nomes semelhantes.
14. Priorize empresas ativas e com presenca digital verificavel.
15. O diagnostico deve separar fatos encontrados de hipoteses comerciais.
16. Inclua de uma a oito URLs publicas relevantes em sources.
17. Quando uma informacao nao puder ser confirmada, retorne string vazia.
18. Nao inclua CPF, endereco residencial ou outros dados pessoais sensiveis.
19. Tente confirmar informacoes importantes em mais de uma fonte quando possivel.
20. Nao pare na primeira pagina encontrada: aprofunde a busca antes de declarar que o decisor ou seu contato profissional nao foi localizado.

O prospecting_score mede o potencial para uma abordagem comercial da Level UP:

0 a 39: baixa prioridade.
40 a 59: oportunidade inicial.
60 a 79: boa oportunidade.
80 a 89: oportunidade muito relevante.
90 a 100: use apenas quando houver sinais públicos fortes de investimento, crescimento ou necessidade.
          `.trim(),
          input: `
Encontre ${amount} empresas reais para prospecção.

Pesquisa solicitada:
${searchQuery}

Localidade preferencial:
${city || "Brasil, sem cidade obrigatória"}

Para cada empresa:

- confirme que a empresa realmente existe e esta ativa;
- identifique segmento, cidade, site e Instagram oficiais;
- descubra quem realmente participa da decisao de contratacao de marketing;
- priorize proprietario, socio, fundador, CEO, diretor, gerente de marketing ou gerente comercial;
- pesquise explicitamente o nome do decisor junto com telefone, WhatsApp, e-mail, contato, comercial e empresa;
- procure telefone profissional do decisor em fontes publicas;
- procure WhatsApp profissional do decisor em fontes publicas;
- procure e-mail profissional do decisor em fontes publicas;
- informe em decision_maker_contact_source a melhor fonte publica que comprova esse contato;
- mantenha phone, whatsapp e email para contatos gerais da empresa quando forem diferentes do contato do decisor;
- se nao existir contato profissional publico do decisor, nao invente e deixe os campos correspondentes vazios;
- avalie a presenca de marketing da empresa;
- identifique sinais de expansao, investimento, contratacoes, novos produtos, novas unidades ou movimentacoes que possam gerar oportunidade;
- explique objetivamente por que a empresa pode precisar da Level UP;
- sugira uma abordagem curta e especifica para aquela empresa;
- estime um valor mensal comercial plausivel entre R$ 2.500 e R$ 6.000, sem afirmar que esse e o orcamento real da empresa;
- atribua temperatura, prioridade e score de prospeccao;
- inclua as fontes publicas utilizadas.

Não repita empresas dentro desta pesquisa.
Não repita empresas dentro desta pesquisa.

IMPORTANTE: as empresas abaixo já foram apresentadas, cadastradas
no CRM ou bloqueadas pela Level UP. Não retorne nenhuma delas,
nem variações evidentes do mesmo nome, razão social, unidade ou marca:

${excludedCompaniesPrompt}

Procure empresas realmente diferentes das listadas acima.
Caso encontre uma filial ou unidade da mesma organização, considere
como repetida e não a apresente.
          `.trim(),
          text: {
            verbosity: "medium",
            format: {
              type: "json_schema",
              name:
                "level_up_prospector_results",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  companies: {
                    type: "array",
                    minItems: 1,
                    maxItems: 12,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        company_name: {
                          type: "string",
                        },
                        segment: {
                          type: "string",
                        },
                        website: {
                          type: "string",
                        },
                        instagram: {
                          type: "string",
                        },
                        phone: {
                          type: "string",
                        },
                        whatsapp: {
                          type: "string",
                        },
                        email: {
                          type: "string",
                        },
                        city: {
                          type: "string",
                        },
                        state: {
                          type: "string",
                        },
                        decision_maker_name: {
                          type: "string",
                        },
                        decision_maker_role: {
                          type: "string",
                        },
                        decision_maker_phone: {
                          type: "string",
                        },
                        decision_maker_whatsapp: {
                          type: "string",
                        },
                        decision_maker_email: {
                          type: "string",
                        },
                        decision_maker_contact_source: {
                          type: "string",
                        },
                        marketing_diagnosis: {
                          type: "string",
                        },
                        commercial_opportunity: {
                          type: "string",
                        },
                        recommended_approach: {
                          type: "string",
                        },
                        estimated_value: {
                          type: "integer",
                          minimum: 0,
                          maximum: 10000,
                        },
                        temperature: {
                          type: "string",
                          enum: [
                            "cold",
                            "warm",
                            "hot"
                          ],
                        },
                        priority: {
                          type: "string",
                          enum: [
                            "low",
                            "medium",
                            "high"
                          ],
                        },
                        prospecting_score: {
                          type: "integer",
                          minimum: 0,
                          maximum: 100,
                        },
                        sources: {
                          type: "array",
                          maxItems: 8,
                          items: {
                            type: "string",
                          },
                        },
                      },
                      required: [
                        "company_name",
                        "segment",
                        "website",
                        "instagram",
                        "phone",
                        "whatsapp",
                        "email",
                        "city",
                        "state",
                        "decision_maker_name",
                        "decision_maker_role",
                        "decision_maker_phone",
                        "decision_maker_whatsapp",
                        "decision_maker_email",
                        "decision_maker_contact_source",
                        "marketing_diagnosis",
                        "commercial_opportunity",
                        "recommended_approach",
                        "estimated_value",
                        "temperature",
                        "priority",
                        "prospecting_score",
                        "sources"
                      ],
                    },
                  },
                },
                required: [
                  "companies"
                ],
              },
            },
          },
        }),
      }
    );

    const payload =
      (await response.json()) as unknown;

    if (!response.ok) {
      let message =
        "A pesquisa da IA não pôde ser concluída.";

      if (
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error ===
          "object" &&
        payload.error !== null &&
        "message" in payload.error &&
        typeof payload.error.message ===
          "string"
      ) {
        message =
          payload.error.message;
      }

      throw new Error(message);
    }

    const responseText =
      extractResponseText(payload);

    if (!responseText) {
      throw new Error(
        "A IA não retornou os resultados da pesquisa."
      );
    }

    const parsed =
      JSON.parse(responseText) as unknown;

    const validatedCompanies =
      validateCompanies(parsed);

    const uniqueSearchNames = new Set<string>();

    const companies = validatedCompanies.filter(
      (company) => {
        const normalizedName =
          normalizeCompanyName(
            company.company_name
          );

        if (!normalizedName) {
          return false;
        }

        if (
          excludedNormalizedNames.has(
            normalizedName
          )
        ) {
          return false;
        }

        if (
          uniqueSearchNames.has(
            normalizedName
          )
        ) {
          return false;
        }

        uniqueSearchNames.add(normalizedName);

        return true;
      }
    );

    if (companies.length === 0) {
      return {
        success: false,
        message:
          "Nenhuma empresa verificável foi encontrada. Tente uma pesquisa mais específica.",
        companies: [],
      };
    }

    const seenCompaniesPayload = companies.map(
      (company) => ({
        organization_id: organizationId,
        company_name: company.company_name,
        normalized_name:
          normalizeCompanyName(
            company.company_name
          ),
        website:
          company.website || null,
        city:
          company.city || null,
        state:
          company.state || null,
        first_seen_at:
          new Date().toISOString(),
        last_seen_at:
          new Date().toISOString(),
        times_seen: 1,
      })
    );

    if (seenCompaniesPayload.length > 0) {
      const {
        error: seenInsertError,
      } = await supabase
        .from("prospector_seen_companies")
        .upsert(
          seenCompaniesPayload,
          {
            onConflict:
              "organization_id,normalized_name",
            ignoreDuplicates: true,
          }
        );

      if (seenInsertError) {
        console.error(
          "Erro ao registrar histórico do Prospector:",
          seenInsertError
        );
      }
    }

    return {
      success: true,
      message:
        `${companies.length} empresa${companies.length !== 1 ? "s" : ""} nova${companies.length !== 1 ? "s" : ""} encontrada${companies.length !== 1 ? "s" : ""}. Empresas já apresentadas foram removidas automaticamente.`,
      companies,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível executar a pesquisa.",
      companies: [],
    };
  }
}

export async function saveProspectedCompanyAction(
  _previousState: SaveProspectResult,
  formData: FormData
): Promise<SaveProspectResult> {
  try {
    const companyName = readText(
      formData,
      "company_name"
    );

    if (!companyName) {
      return {
        success: false,
        message:
          "O nome da empresa não foi informado.",
        leadId: null,
      };
    }

    const {
      supabase,
      organizationId,
    } = await getAuthenticatedContext();

    const {
      data: existingLeads,
      error: existingError,
    } = await supabase
      .from("leads")
      .select("id, company_name")
      .eq(
        "organization_id",
        organizationId
      );

    if (existingError) {
      throw new Error(
        existingError.message
      );
    }

    const normalizedName =
      normalizeCompanyName(
        companyName
      );

    const existingLead =
      (existingLeads ?? []).find(
        (lead) =>
          normalizeCompanyName(
            lead.company_name
          ) === normalizedName
      );

    if (existingLead) {
      return {
        success: false,
        message:
          "Esta empresa já está cadastrada no CRM.",
        leadId: existingLead.id,
      };
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
          "A etapa inicial do CRM não foi encontrada."
      );
    }

    const sources = readText(
      formData,
      "sources"
    );

    const diagnosis = readText(
      formData,
      "marketing_diagnosis"
    );

    const opportunity = readText(
      formData,
      "commercial_opportunity"
    );

    const approach = readText(
      formData,
      "recommended_approach"
    );

    const decisionMakerPhone =
      readText(
        formData,
        "decision_maker_phone"
      );

    const decisionMakerWhatsapp =
      readText(
        formData,
        "decision_maker_whatsapp"
      );

    const decisionMakerEmail =
      readText(
        formData,
        "decision_maker_email"
      );

    const decisionMakerContactSource =
      readText(
        formData,
        "decision_maker_contact_source"
      );

    const companyPhone =
      readText(
        formData,
        "phone"
      );

    const companyWhatsapp =
      readText(
        formData,
        "whatsapp"
      );

    const companyEmail =
      readText(
        formData,
        "email"
      );

    const notes = [
      "PESQUISA DO PROSPECTOR IA",
      "",
      (
        decisionMakerPhone ||
        decisionMakerWhatsapp ||
        decisionMakerEmail
      )
        ? [
            "Contato profissional publico do decisor:",
            decisionMakerPhone
              ? "Telefone: " + decisionMakerPhone
              : "",
            decisionMakerWhatsapp
              ? "WhatsApp: " + decisionMakerWhatsapp
              : "",
            decisionMakerEmail
              ? "E-mail: " + decisionMakerEmail
              : "",
          ]
            .filter(Boolean)
            .join("\n")
        : "",
      decisionMakerContactSource
        ? "\nFonte publica do contato do decisor:\n" +
          decisionMakerContactSource
        : "",
      (
        companyPhone ||
        companyWhatsapp ||
        companyEmail
      )
        ? [
            "\nContato geral da empresa:",
            companyPhone
              ? "Telefone: " + companyPhone
              : "",
            companyWhatsapp
              ? "WhatsApp: " + companyWhatsapp
              : "",
            companyEmail
              ? "E-mail: " + companyEmail
              : "",
          ]
            .filter(Boolean)
            .join("\n")
        : "",
      diagnosis
        ? `Diagnóstico de marketing:` +
          `\n${diagnosis}`
        : "",
      opportunity
        ? `\nOportunidade comercial:` +
          `\n${opportunity}`
        : "",
      approach
        ? `\nAbordagem recomendada:` +
          `\n${approach}`
        : "",
      sources
        ? `\nFontes públicas:` +
          `\n${sources}`
        : "",
      "",
      "Revise os dados antes do primeiro contato.",
    ]
      .filter(Boolean)
      .join("\n");

    const estimatedValue =
      Number(
        readText(
          formData,
          "estimated_value"
        )
      ) || 0;

    const temperatureRaw =
      readText(
        formData,
        "temperature"
      );

    const priorityRaw =
      readText(
        formData,
        "priority"
      );

    const temperature =
      temperatureRaw === "hot" ||
      temperatureRaw === "cold"
        ? temperatureRaw
        : "warm";

    const priority =
      priorityRaw === "high" ||
      priorityRaw === "low"
        ? priorityRaw
        : "medium";

    const {
      data: insertedLead,
      error: insertError,
    } = await supabase
      .from("leads")
      .insert({
        organization_id:
          organizationId,
        stage_id: firstStage.id,
        company_name: companyName,
        segment:
          readText(
            formData,
            "segment"
          ) || null,
        website:
          readText(
            formData,
            "website"
          ) || null,
        instagram:
          readText(
            formData,
            "instagram"
          ) || null,
        phone:
          decisionMakerPhone ||
          companyPhone ||
          null,
        whatsapp:
          decisionMakerWhatsapp ||
          companyWhatsapp ||
          null,
        email:
          decisionMakerEmail ||
          companyEmail ||
          null,
        city:
          readText(
            formData,
            "city"
          ) || null,
        state:
          readText(
            formData,
            "state"
          ) || null,
        decision_maker_name:
          readText(
            formData,
            "decision_maker_name"
          ) || null,
        decision_maker_role:
          readText(
            formData,
            "decision_maker_role"
          ) || null,
        estimated_value:
          Math.max(
            0,
            estimatedValue
          ),
        temperature,
        priority,
        notes,
        next_action:
          "Realizar primeiro contato",
      })
      .select("id")
      .single();

    if (
      insertError ||
      !insertedLead
    ) {
      throw new Error(
        insertError?.message ??
          "Não foi possível cadastrar a empresa."
      );
    }

    revalidatePath("/crm");
    revalidatePath("/crm/cockpit");
    revalidatePath("/crm/prospector");

    return {
      success: true,
      message:
        "Empresa cadastrada no CRM com sucesso.",
      leadId: insertedLead.id,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar a empresa.",
      leadId: null,
    };
  }
}