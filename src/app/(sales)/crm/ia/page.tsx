import { Header } from "@/components/sales-os-original/header";
import { createClient } from "@/lib/crm-supabase/server";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Building2,
  CircleGauge,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type AnalysisListItem = {
  id: string;
  lead_id: string;
  executive_summary: string;
  interest_level:
    | "low"
    | "medium"
    | "high"
    | "very_high";
  commercial_score: number;
  created_at: string;
  model_used: string | null;
};

type LeadSummary = {
  id: string;
  company_name: string;
  segment: string | null;
  estimated_value: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Maceio",
    }
  ).format(new Date(value));
}

function getInterestLabel(
  value: AnalysisListItem["interest_level"]
) {
  const labels = {
    low: "Baixo",
    medium: "Médio",
    high: "Alto",
    very_high: "Muito alto",
  };

  return labels[value];
}

export default async function AssistantPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
      data: analysesData,
      error: analysesError,
    },
    {
      data: leadsData,
      error: leadsError,
    },
  ] = await Promise.all([
    supabase
      .from("lead_ai_analyses")
      .select(`
        id,
        lead_id,
        executive_summary,
        interest_level,
        commercial_score,
        created_at,
        model_used
      `)
      .eq(
        "organization_id",
        organizationId
      )
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("leads")
      .select(`
        id,
        company_name,
        segment,
        estimated_value
      `)
      .eq(
        "organization_id",
        organizationId
      ),
  ]);

  if (analysesError) {
    throw new Error(
      analysesError.message
    );
  }

  if (leadsError) {
    throw new Error(
      leadsError.message
    );
  }

  const analyses =
    (analysesData ??
      []) as AnalysisListItem[];

  const leads =
    (leadsData ?? []) as LeadSummary[];

  const leadMap = new Map(
    leads.map((lead) => [
      lead.id,
      lead,
    ])
  );

  const latestByLead = new Map<
    string,
    AnalysisListItem
  >();

  for (const analysis of analyses) {
    if (
      !latestByLead.has(
        analysis.lead_id
      )
    ) {
      latestByLead.set(
        analysis.lead_id,
        analysis
      );
    }
  }

  const latestAnalyses = Array.from(
    latestByLead.values()
  ).sort(
    (first, second) =>
      second.commercial_score -
      first.commercial_score
  );

  const averageScore =
    latestAnalyses.length > 0
      ? Math.round(
          latestAnalyses.reduce(
            (sum, item) =>
              sum +
              item.commercial_score,
            0
          ) / latestAnalyses.length
        )
      : 0;

  const highInterest = latestAnalyses.filter(
    (item) =>
      item.interest_level === "high" ||
      item.interest_level ===
        "very_high"
  ).length;

  return (
    <>
      <Header
        description="Diagnósticos, argumentos e recomendações gerados pela inteligência comercial."
        title="IA Comercial"
      />

      <div className="page-content">
        <section className="assistant-hero">
          <div>
            <span className="eyebrow">
              <Sparkles size={15} />
              ASSISTENTE LEVEL UP
            </span>

            <h2>
              Inteligência aplicada às vendas.
            </h2>

            <p>
              Analise o contexto de cada empresa,
              prepare abordagens melhores e defina
              o próximo passo da negociação.
            </p>
          </div>

          <Link
            className="primary-button"
            href="/crm"
          >
            Escolher empresa
            <ArrowRight size={17} />
          </Link>
        </section>

        <section className="assistant-metrics">
          <article>
            <BrainCircuit size={21} />

            <div>
              <span>
                Empresas analisadas
              </span>

              <strong>
                {latestAnalyses.length}
              </strong>
            </div>
          </article>

          <article>
            <CircleGauge size={21} />

            <div>
              <span>Score médio</span>
              <strong>
                {averageScore}/100
              </strong>
            </div>
          </article>

          <article>
            <Target size={21} />

            <div>
              <span>
                Interesse alto
              </span>

              <strong>
                {highInterest}
              </strong>
            </div>
          </article>

          <article>
            <Building2 size={21} />

            <div>
              <span>
                Aguardando análise
              </span>

              <strong>
                {Math.max(
                  leads.length -
                    latestAnalyses.length,
                  0
                )}
              </strong>
            </div>
          </article>
        </section>

        <section className="panel assistant-list-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">
                RANKING DA IA
              </span>

              <h3>
                Empresas analisadas
              </h3>
            </div>

            <Bot size={20} />
          </div>

          {latestAnalyses.length === 0 ? (
            <div className="assistant-empty">
              <BrainCircuit size={29} />

              <strong>
                Nenhuma análise gerada
              </strong>

              <span>
                Abra uma empresa no CRM e
                clique em “Analisar com IA”.
              </span>

              <Link
                className="primary-button"
                href="/crm"
              >
                Abrir CRM
              </Link>
            </div>
          ) : (
            <div className="assistant-company-list">
              {latestAnalyses.map(
                (analysis, index) => {
                  const lead =
                    leadMap.get(
                      analysis.lead_id
                    );

                  if (!lead) {
                    return null;
                  }

                  return (
                    <Link
                      className="assistant-company-item"
                      href={`/crm/${lead.id}`}
                      key={analysis.id}
                    >
                      <span className="assistant-position">
                        {index + 1}
                      </span>

                      <div className="assistant-company-avatar">
                        {lead.company_name
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="assistant-company-info">
                        <strong>
                          {lead.company_name}
                        </strong>

                        <span>
                          {lead.segment ??
                            "Segmento não informado"}{" "}
                          ·{" "}
                          {formatMoney(
                            Number(
                              lead.estimated_value ??
                                0
                            )
                          )}
                        </span>

                        <p>
                          {
                            analysis.executive_summary
                          }
                        </p>
                      </div>

                      <div className="assistant-score">
                        <span>Score</span>

                        <strong>
                          {
                            analysis.commercial_score
                          }
                        </strong>

                        <div>
                          <i
                            style={{
                              width: `${analysis.commercial_score}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="assistant-interest">
                        <span>
                          Interesse
                        </span>

                        <strong>
                          {getInterestLabel(
                            analysis.interest_level
                          )}
                        </strong>

                        <small>
                          {formatDate(
                            analysis.created_at
                          )}
                        </small>
                      </div>

                      <ArrowRight size={17} />
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}