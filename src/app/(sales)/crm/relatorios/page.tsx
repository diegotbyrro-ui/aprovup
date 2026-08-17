import { Header } from "@/components/sales-os-original/header";
import { createClient } from "@/lib/crm-supabase/server";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Flame,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type ReportPageProps = {
  searchParams: Promise<{
    period?: string;
  }>;
};

type ReportLead = {
  id: string;
  company_name: string;
  segment: string | null;
  estimated_value: number;
  temperature: "cold" | "warm" | "hot";
  priority: "low" | "medium" | "high";
  stage_id: string | null;
  created_at: string;
  decision_maker_name: string | null;
};

type ReportStage = {
  id: string;
  name: string;
  position: number;
  color: string | null;
  is_closed: boolean;
};

type ReportInteraction = {
  id: string;
  lead_id: string;
  interaction_type:
    | "call"
    | "whatsapp"
    | "email"
    | "meeting"
    | "note";
  occurred_at: string;
  follow_up_at: string | null;
  follow_up_completed_at: string | null;
};

type ReportAnalysis = {
  id: string;
  lead_id: string;
  commercial_score: number;
  interest_level:
    | "low"
    | "medium"
    | "high"
    | "very_high";
  created_at: string;
};

type RankedLead = ReportLead & {
  stage: ReportStage | null;
  interactions: number;
  aiScore: number | null;
  lastInteraction: string | null;
};

const allowedPeriods = ["7", "30", "90", "all"];

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Maceio",
  }).format(new Date(value));
}

function getPeriodLabel(period: string) {
  const labels: Record<string, string> = {
    "7": "Últimos 7 dias",
    "30": "Últimos 30 dias",
    "90": "Últimos 90 dias",
    all: "Todo o período",
  };

  return labels[period] ?? labels["30"];
}

function getPeriodStart(period: string) {
  if (period === "all") {
    return null;
  }

  const days = Number(period);

  if (!Number.isFinite(days)) {
    return null;
  }

  const date = new Date();

  date.setDate(date.getDate() - days);

  return date;
}

function differenceInDays(
  newerDate: Date,
  olderDate: Date
) {
  return Math.floor(
    (newerDate.getTime() - olderDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function getInteractionLabel(
  type: ReportInteraction["interaction_type"]
) {
  const labels = {
    call: "Ligações",
    whatsapp: "WhatsApp",
    email: "E-mails",
    meeting: "Reuniões",
    note: "Observações",
  };

  return labels[type];
}

function getInteractionIcon(
  type: ReportInteraction["interaction_type"]
) {
  if (type === "call") {
    return Phone;
  }

  if (type === "whatsapp") {
    return MessageCircle;
  }

  if (type === "email") {
    return Mail;
  }

  if (type === "meeting") {
    return UsersRound;
  }

  return Activity;
}

export default async function ReportsPage({
  searchParams,
}: ReportPageProps) {
  const resolvedSearchParams =
    await searchParams;

  const requestedPeriod =
    resolvedSearchParams.period ?? "30";

  const period = allowedPeriods.includes(
    requestedPeriod
  )
    ? requestedPeriod
    : "30";

  const periodStart = getPeriodStart(period);

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
      data: leadsData,
      error: leadsError,
    },
    {
      data: stagesData,
      error: stagesError,
    },
    {
      data: interactionsData,
      error: interactionsError,
    },
    {
      data: analysesData,
      error: analysesError,
    },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(`
        id,
        company_name,
        segment,
        estimated_value,
        temperature,
        priority,
        stage_id,
        created_at,
        decision_maker_name
      `)
      .eq(
        "organization_id",
        organizationId
      )
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("pipeline_stages")
      .select(`
        id,
        name,
        position,
        color,
        is_closed
      `)
      .eq(
        "organization_id",
        organizationId
      )
      .order("position", {
        ascending: true,
      }),

    supabase
      .from("lead_interactions")
      .select(`
        id,
        lead_id,
        interaction_type,
        occurred_at,
        follow_up_at,
        follow_up_completed_at
      `)
      .eq(
        "organization_id",
        organizationId
      )
      .order("occurred_at", {
        ascending: false,
      }),

    supabase
      .from("lead_ai_analyses")
      .select(`
        id,
        lead_id,
        commercial_score,
        interest_level,
        created_at
      `)
      .eq(
        "organization_id",
        organizationId
      )
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  if (stagesError) {
    throw new Error(stagesError.message);
  }

  if (interactionsError) {
    throw new Error(
      interactionsError.message
    );
  }

  if (analysesError) {
    throw new Error(
      analysesError.message
    );
  }

  const leads =
    (leadsData ?? []) as ReportLead[];

  const stages =
    (stagesData ?? []) as ReportStage[];

  const allInteractions =
    (interactionsData ??
      []) as ReportInteraction[];

  const allAnalyses =
    (analysesData ??
      []) as ReportAnalysis[];

  const interactions = periodStart
    ? allInteractions.filter(
        (interaction) =>
          new Date(
            interaction.occurred_at
          ).getTime() >=
          periodStart.getTime()
      )
    : allInteractions;

  const analyses = periodStart
    ? allAnalyses.filter(
        (analysis) =>
          new Date(
            analysis.created_at
          ).getTime() >=
          periodStart.getTime()
      )
    : allAnalyses;

  const stageMap = new Map(
    stages.map((stage) => [
      stage.id,
      stage,
    ])
  );

  const interactionsByLead = new Map<
    string,
    ReportInteraction[]
  >();

  for (const interaction of allInteractions) {
    const current =
      interactionsByLead.get(
        interaction.lead_id
      ) ?? [];

    current.push(interaction);

    interactionsByLead.set(
      interaction.lead_id,
      current
    );
  }

  const latestAnalysisByLead =
    new Map<string, ReportAnalysis>();

  for (const analysis of allAnalyses) {
    if (
      !latestAnalysisByLead.has(
        analysis.lead_id
      )
    ) {
      latestAnalysisByLead.set(
        analysis.lead_id,
        analysis
      );
    }
  }

  const rankedLeads: RankedLead[] =
    leads.map((lead) => {
      const leadInteractions =
        interactionsByLead.get(
          lead.id
        ) ?? [];

      const analysis =
        latestAnalysisByLead.get(
          lead.id
        );

      return {
        ...lead,
        stage: lead.stage_id
          ? stageMap.get(
              lead.stage_id
            ) ?? null
          : null,
        interactions:
          leadInteractions.length,
        aiScore:
          analysis?.commercial_score ??
          null,
        lastInteraction:
          leadInteractions[0]
            ?.occurred_at ?? null,
      };
    });

  const activeLeads =
    rankedLeads.filter(
      (lead) =>
        !lead.stage?.is_closed
    );

  const closedLeads =
    rankedLeads.filter(
      (lead) =>
        lead.stage?.is_closed
    );

  const pipelineValue =
    activeLeads.reduce(
      (total, lead) =>
        total +
        Number(
          lead.estimated_value ?? 0
        ),
      0
    );

  const averageTicket =
    activeLeads.length > 0
      ? pipelineValue /
        activeLeads.length
      : 0;

  const probableRevenue =
    activeLeads.reduce(
      (total, lead) => {
        const probability =
          lead.aiScore !== null
            ? lead.aiScore / 100
            : lead.temperature === "hot"
              ? 0.7
              : lead.temperature === "warm"
                ? 0.4
                : 0.15;

        return (
          total +
          Number(
            lead.estimated_value ?? 0
          ) *
            probability
        );
      },
      0
    );

  const newLeadsInPeriod = periodStart
    ? leads.filter(
        (lead) =>
          new Date(
            lead.created_at
          ).getTime() >=
          periodStart.getTime()
      ).length
    : leads.length;

  const completedFollowUps =
    allInteractions.filter(
      (interaction) =>
        interaction.follow_up_completed_at &&
        (!periodStart ||
          new Date(
            interaction.follow_up_completed_at
          ).getTime() >=
            periodStart.getTime())
    );

  const now = new Date();

  const pendingFollowUps =
    allInteractions.filter(
      (interaction) =>
        interaction.follow_up_at &&
        !interaction.follow_up_completed_at
    );

  const overdueFollowUps =
    pendingFollowUps.filter(
      (interaction) =>
        interaction.follow_up_at &&
        new Date(
          interaction.follow_up_at
        ).getTime() <
          now.getTime()
    );

  const untouchedLeads =
    rankedLeads.filter(
      (lead) =>
        lead.interactions === 0
    );

  const stalledLeads =
    rankedLeads.filter((lead) => {
      if (!lead.lastInteraction) {
        return true;
      }

      return (
        differenceInDays(
          now,
          new Date(
            lead.lastInteraction
          )
        ) >= 7
      );
    });

  const hotLeads =
    activeLeads.filter(
      (lead) =>
        lead.temperature === "hot"
    );

  const interactionTypeTotals =
    (
      [
        "call",
        "whatsapp",
        "email",
        "meeting",
        "note",
      ] as const
    ).map((type) => ({
      type,
      total: interactions.filter(
        (interaction) =>
          interaction.interaction_type ===
          type
      ).length,
    }));

  const maxInteractionTotal =
    Math.max(
      ...interactionTypeTotals.map(
        (item) => item.total
      ),
      1
    );

  const pipelineSummary =
    stages.map((stage) => {
      const stageLeads =
        rankedLeads.filter(
          (lead) =>
            lead.stage_id === stage.id
        );

      return {
        ...stage,
        count: stageLeads.length,
        value: stageLeads.reduce(
          (total, lead) =>
            total +
            Number(
              lead.estimated_value ?? 0
            ),
          0
        ),
      };
    });

  const maxStageCount =
    Math.max(
      ...pipelineSummary.map(
        (stage) => stage.count
      ),
      1
    );

  const segmentMap = new Map<
    string,
    {
      name: string;
      leads: number;
      value: number;
      interactions: number;
    }
  >();

  for (const lead of rankedLeads) {
    const segment =
      lead.segment?.trim() ||
      "Não informado";

    const current =
      segmentMap.get(segment) ?? {
        name: segment,
        leads: 0,
        value: 0,
        interactions: 0,
      };

    current.leads += 1;

    current.value += Number(
      lead.estimated_value ?? 0
    );

    current.interactions +=
      lead.interactions;

    segmentMap.set(
      segment,
      current
    );
  }

  const segmentRanking =
    Array.from(
      segmentMap.values()
    )
      .sort(
        (first, second) =>
          second.value -
          first.value
      )
      .slice(0, 7);

  const leadRanking =
    [...activeLeads]
      .sort((first, second) => {
        const firstScore =
          first.aiScore ??
          (first.temperature === "hot"
            ? 70
            : first.temperature ===
                "warm"
              ? 45
              : 20);

        const secondScore =
          second.aiScore ??
          (second.temperature === "hot"
            ? 70
            : second.temperature ===
                "warm"
              ? 45
              : 20);

        return (
          secondScore - firstScore
        );
      })
      .slice(0, 7);

  const latestAnalysesByLead =
    new Map<string, ReportAnalysis>();

  for (const analysis of analyses) {
    if (
      !latestAnalysesByLead.has(
        analysis.lead_id
      )
    ) {
      latestAnalysesByLead.set(
        analysis.lead_id,
        analysis
      );
    }
  }

  const analysesInPeriod =
    Array.from(
      latestAnalysesByLead.values()
    );

  const averageAiScore =
    analysesInPeriod.length > 0
      ? Math.round(
          analysesInPeriod.reduce(
            (total, analysis) =>
              total +
              analysis.commercial_score,
            0
          ) /
            analysesInPeriod.length
        )
      : 0;

  const highInterestAnalyses =
    analysesInPeriod.filter(
      (analysis) =>
        analysis.interest_level ===
          "high" ||
        analysis.interest_level ===
          "very_high"
    ).length;

  const stageConversionRate =
    leads.length > 0
      ? Math.round(
          (closedLeads.length /
            leads.length) *
            100
        )
      : 0;

  return (
    <>
      <Header
        description="Indicadores reais de atividade, pipeline e desempenho comercial."
        title="Relatórios Comerciais"
      />

      <div className="page-content reports-page">
        <section className="reports-hero">
          <div>
            <span className="eyebrow">
              <BarChart3 size={15} />
              INTELIGÊNCIA COMERCIAL
            </span>

            <h2>
              Decisões baseadas em dados.
            </h2>

            <p>
              Acompanhe o volume de prospecção,
              movimentação do pipeline, execução
              de follow-ups e potencial de receita.
            </p>
          </div>

          <Link
            className="primary-button"
            href="/crm"
          >
            Abrir pipeline
            <ArrowRight size={17} />
          </Link>
        </section>

        <section className="reports-period-panel">
          <div>
            <span>Período analisado</span>

            <strong>
              {getPeriodLabel(period)}
            </strong>
          </div>

          <nav>
            {[
              ["7", "7 dias"],
              ["30", "30 dias"],
              ["90", "90 dias"],
              ["all", "Todo período"],
            ].map(([value, label]) => (
              <Link
                className={
                  period === value
                    ? "reports-period-active"
                    : ""
                }
                href={`/relatorios?period=${value}`}
                key={value}
              >
                {label}
              </Link>
            ))}
          </nav>
        </section>

        <section className="reports-main-metrics">
          <article>
            <div className="reports-metric-icon money">
              <CircleDollarSign
                size={21}
              />
            </div>

            <div>
              <span>Pipeline ativo</span>

              <strong>
                {formatMoney(
                  pipelineValue
                )}
              </strong>

              <small>
                {activeLeads.length} oportunidades
              </small>
            </div>
          </article>

          <article>
            <div className="reports-metric-icon probable">
              <TrendingUp size={21} />
            </div>

            <div>
              <span>Receita provável</span>

              <strong>
                {formatMoney(
                  probableRevenue
                )}
              </strong>

              <small>
                Baseada em score e temperatura
              </small>
            </div>
          </article>

          <article>
            <div className="reports-metric-icon activity">
              <Activity size={21} />
            </div>

            <div>
              <span>Interações no período</span>

              <strong>
                {interactions.length}
              </strong>

              <small>
                Ligações, mensagens e reuniões
              </small>
            </div>
          </article>

          <article>
            <div className="reports-metric-icon new">
              <Building2 size={21} />
            </div>

            <div>
              <span>Novos leads</span>

              <strong>
                {newLeadsInPeriod}
              </strong>

              <small>
                Cadastrados no período
              </small>
            </div>
          </article>
        </section>

        <div className="reports-grid reports-grid-main">
          <section className="panel reports-pipeline-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  FUNIL COMERCIAL
                </span>

                <h3>
                  Distribuição por etapa
                </h3>
              </div>

              <Target size={20} />
            </div>

            <div className="reports-stage-list">
              {pipelineSummary.map(
                (stage) => (
                  <article key={stage.id}>
                    <div className="reports-stage-heading">
                      <div>
                        <i
                          style={{
                            backgroundColor:
                              stage.color ??
                              "#64748b",
                          }}
                        />

                        <strong>
                          {stage.name}
                        </strong>
                      </div>

                      <span>
                        {stage.count} empresa
                        {stage.count !== 1
                          ? "s"
                          : ""}
                      </span>
                    </div>

                    <div className="reports-bar-track">
                      <div
                        style={{
                          backgroundColor:
                            stage.color ??
                            "#64748b",
                          width: `${Math.max(
                            stage.count > 0
                              ? 7
                              : 0,
                            (stage.count /
                              maxStageCount) *
                              100
                          )}%`,
                        }}
                      />
                    </div>

                    <small>
                      {formatMoney(
                        stage.value
                      )}
                    </small>
                  </article>
                )
              )}
            </div>

            <div className="reports-funnel-footer">
              <div>
                <span>
                  Taxa de encerramento
                </span>

                <strong>
                  {stageConversionRate}%
                </strong>
              </div>

              <div>
                <span>Ticket médio</span>

                <strong>
                  {formatMoney(
                    averageTicket
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Oportunidades quentes
                </span>

                <strong>
                  {hotLeads.length}
                </strong>
              </div>
            </div>
          </section>

          <section className="panel reports-activity-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  PRODUTIVIDADE
                </span>

                <h3>
                  Atividades realizadas
                </h3>
              </div>

              <Activity size={20} />
            </div>

            <div className="reports-activity-list">
              {interactionTypeTotals.map(
                (item) => {
                  const Icon =
                    getInteractionIcon(
                      item.type
                    );

                  return (
                    <article key={item.type}>
                      <div className={`reports-activity-icon ${item.type}`}>
                        <Icon size={17} />
                      </div>

                      <div>
                        <div className="reports-activity-heading">
                          <span>
                            {getInteractionLabel(
                              item.type
                            )}
                          </span>

                          <strong>
                            {item.total}
                          </strong>
                        </div>

                        <div className="reports-bar-track">
                          <div
                            className={`reports-activity-bar ${item.type}`}
                            style={{
                              width: `${Math.max(
                                item.total > 0
                                  ? 7
                                  : 0,
                                (item.total /
                                  maxInteractionTotal) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        </div>

        <section className="reports-operational-metrics">
          <article>
            <CheckCircle2 size={20} />

            <div>
              <span>
                Follow-ups concluídos
              </span>

              <strong>
                {completedFollowUps.length}
              </strong>
            </div>
          </article>

          <article>
            <Clock3 size={20} />

            <div>
              <span>
                Follow-ups pendentes
              </span>

              <strong>
                {pendingFollowUps.length}
              </strong>
            </div>
          </article>

          <article className="danger">
            <AlertTriangle size={20} />

            <div>
              <span>
                Follow-ups atrasados
              </span>

              <strong>
                {overdueFollowUps.length}
              </strong>
            </div>
          </article>

          <article>
            <Flame size={20} />

            <div>
              <span>
                Leads parados
              </span>

              <strong>
                {stalledLeads.length}
              </strong>
            </div>
          </article>

          <article>
            <Building2 size={20} />

            <div>
              <span>
                Sem interação
              </span>

              <strong>
                {untouchedLeads.length}
              </strong>
            </div>
          </article>
        </section>

        <div className="reports-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  OPORTUNIDADES
                </span>

                <h3>
                  Ranking comercial
                </h3>
              </div>

              <TrendingUp size={20} />
            </div>

            {leadRanking.length === 0 ? (
              <div className="reports-empty">
                Nenhuma oportunidade ativa.
              </div>
            ) : (
              <div className="reports-ranking-list">
                {leadRanking.map(
                  (lead, index) => (
                    <Link
                      href={`/crm/${lead.id}`}
                      key={lead.id}
                    >
                      <span className="reports-ranking-position">
                        {index + 1}
                      </span>

                      <div className="reports-ranking-avatar">
                        {lead.company_name
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="reports-ranking-company">
                        <strong>
                          {lead.company_name}
                        </strong>

                        <span>
                          {lead.stage?.name ??
                            "Sem etapa"}{" "}
                          ·{" "}
                          {lead.interactions} interação
                          {lead.interactions !== 1
                            ? "ões"
                            : ""}
                        </span>
                      </div>

                      <div className="reports-ranking-score">
                        <span>
                          {lead.aiScore !== null
                            ? "Score IA"
                            : "Temperatura"}
                        </span>

                        <strong>
                          {lead.aiScore !== null
                            ? `${lead.aiScore}/100`
                            : lead.temperature ===
                                "hot"
                              ? "Quente"
                              : lead.temperature ===
                                  "warm"
                                ? "Morno"
                                : "Frio"}
                        </strong>
                      </div>

                      <div className="reports-ranking-value">
                        <span>
                          Valor potencial
                        </span>

                        <strong>
                          {formatMoney(
                            Number(
                              lead.estimated_value ??
                                0
                            )
                          )}
                        </strong>
                      </div>

                      <ArrowRight size={16} />
                    </Link>
                  )
                )}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  SEGMENTOS
                </span>

                <h3>
                  Potencial por mercado
                </h3>
              </div>

              <BarChart3 size={20} />
            </div>

            {segmentRanking.length === 0 ? (
              <div className="reports-empty">
                Nenhum segmento cadastrado.
              </div>
            ) : (
              <div className="reports-segment-list">
                {segmentRanking.map(
                  (segment) => (
                    <article
                      key={segment.name}
                    >
                      <div>
                        <strong>
                          {segment.name}
                        </strong>

                        <span>
                          {segment.leads} empresa
                          {segment.leads !== 1
                            ? "s"
                            : ""}{" "}
                          ·{" "}
                          {segment.interactions} interação
                          {segment.interactions !== 1
                            ? "ões"
                            : ""}
                        </span>
                      </div>

                      <strong>
                        {formatMoney(
                          segment.value
                        )}
                      </strong>
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        <section className="panel reports-ai-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">
                INTELIGÊNCIA ARTIFICIAL
              </span>

              <h3>
                Indicadores da IA Comercial
              </h3>
            </div>

            <Bot size={20} />
          </div>

          <div className="reports-ai-grid">
            <article>
              <Sparkles size={21} />

              <div>
                <span>
                  Análises geradas
                </span>

                <strong>
                  {analyses.length}
                </strong>
              </div>
            </article>

            <article>
              <Target size={21} />

              <div>
                <span>
                  Score médio da IA
                </span>

                <strong>
                  {averageAiScore}/100
                </strong>
              </div>
            </article>

            <article>
              <Flame size={21} />

              <div>
                <span>
                  Interesse alto
                </span>

                <strong>
                  {highInterestAnalyses}
                </strong>
              </div>
            </article>

            <article>
              <Building2 size={21} />

              <div>
                <span>
                  Empresas sem análise
                </span>

                <strong>
                  {Math.max(
                    leads.length -
                      latestAnalysisByLead.size,
                    0
                  )}
                </strong>
              </div>
            </article>
          </div>

          <Link
            className="secondary-button reports-ai-link"
            href="/crm/ia"
          >
            Abrir IA Comercial
            <ArrowRight size={16} />
          </Link>
        </section>

        <section className="reports-summary-footer">
          <article>
            <CalendarCheck size={19} />

            <div>
              <strong>
                {getPeriodLabel(period)}
              </strong>

              <span>
                Período do relatório
              </span>
            </div>
          </article>

          <article>
            <CircleDollarSign size={19} />

            <div>
              <strong>
                {formatMoney(
                  averageTicket
                )}
              </strong>

              <span>
                Ticket médio ativo
              </span>
            </div>
          </article>

          <article>
            <CheckCircle2 size={19} />

            <div>
              <strong>
                {closedLeads.length}
              </strong>

              <span>
                Oportunidades encerradas
              </span>
            </div>
          </article>

          <article>
            <Activity size={19} />

            <div>
              <strong>
                {interactions.length}
              </strong>

              <span>
                Ações registradas
              </span>
            </div>
          </article>
        </section>
      </div>
    </>
  );
}