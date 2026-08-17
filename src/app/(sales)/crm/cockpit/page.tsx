import { Header } from "@/components/sales-os-original/header";
import { createClient } from "@/lib/crm-supabase/server";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Flame,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type DashboardLead = {
  id: string;
  company_name: string;
  segment: string | null;
  website: string | null;
  instagram: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  decision_maker_name: string | null;
  decision_maker_role: string | null;
  estimated_value: number;
  temperature: "cold" | "warm" | "hot";
  priority: "low" | "medium" | "high";
  next_action: string | null;
  stage_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type DashboardStage = {
  id: string;
  name: string;
  position: number;
  color: string | null;
  is_closed: boolean;
};

type DashboardInteraction = {
  id: string;
  lead_id: string;
  interaction_type:
    | "call"
    | "whatsapp"
    | "email"
    | "meeting"
    | "note";
  subject: string;
  occurred_at: string;
  follow_up_at: string | null;
  follow_up_completed_at: string | null;
  created_at: string;
};

type ScoredLead = DashboardLead & {
  score: number;
  scoreLabel: string;
  stage: DashboardStage | null;
  interactionsCount: number;
  lastInteraction: DashboardInteraction | null;
  nextFollowUp: DashboardInteraction | null;
  isOverdue: boolean;
  daysWithoutContact: number | null;
};

const MONTHLY_GOAL = 50000;
const CURRENT_RECURRING_REVENUE = 31000;

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMaceioDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Maceio",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Maceio",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Maceio",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Maceio",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );

  if (hour < 12) {
    return "Bom dia";
  }

  if (hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function differenceInDays(
  newerDate: Date,
  olderDate: Date
) {
  const difference =
    newerDate.getTime() - olderDate.getTime();

  return Math.floor(
    difference / (1000 * 60 * 60 * 24)
  );
}

function getScoreLabel(score: number) {
  if (score >= 85) {
    return "Excelente oportunidade";
  }

  if (score >= 70) {
    return "Alta prioridade";
  }

  if (score >= 50) {
    return "Oportunidade promissora";
  }

  if (score >= 30) {
    return "Precisa de qualificação";
  }

  return "Baixa maturidade";
}

function calculateLeadScore({
  lead,
  stage,
  interactionsCount,
  lastInteraction,
  nextFollowUp,
}: {
  lead: DashboardLead;
  stage: DashboardStage | null;
  interactionsCount: number;
  lastInteraction: DashboardInteraction | null;
  nextFollowUp: DashboardInteraction | null;
}) {
  let score = 15;

  if (lead.decision_maker_name) {
    score += 15;
  }

  if (lead.decision_maker_role) {
    score += 5;
  }

  if (lead.whatsapp) {
    score += 10;
  }

  if (lead.phone) {
    score += 5;
  }

  if (lead.email) {
    score += 5;
  }

  if (lead.website) {
    score += 4;
  }

  if (lead.instagram) {
    score += 4;
  }

  const estimatedValue = Number(
    lead.estimated_value ?? 0
  );

  if (estimatedValue >= 5000) {
    score += 12;
  } else if (estimatedValue >= 3000) {
    score += 9;
  } else if (estimatedValue > 0) {
    score += 5;
  }

  if (lead.temperature === "hot") {
    score += 15;
  } else if (lead.temperature === "warm") {
    score += 8;
  }

  if (lead.priority === "high") {
    score += 10;
  } else if (lead.priority === "medium") {
    score += 5;
  }

  score += Math.min(interactionsCount * 3, 12);

  if (stage) {
    score += Math.min(stage.position * 3, 12);
  }

  const now = new Date();

  if (lastInteraction) {
    const daysWithoutContact = differenceInDays(
      now,
      new Date(lastInteraction.occurred_at)
    );

    if (daysWithoutContact <= 2) {
      score += 10;
    } else if (daysWithoutContact <= 7) {
      score += 5;
    } else if (daysWithoutContact >= 15) {
      score -= 12;
    } else if (daysWithoutContact >= 8) {
      score -= 5;
    }
  } else {
    score -= 8;
  }

  if (
    nextFollowUp?.follow_up_at &&
    new Date(nextFollowUp.follow_up_at).getTime() <
      now.getTime()
  ) {
    score -= 12;
  }

  if (stage?.is_closed) {
    score = Math.min(score, 25);
  }

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

function getInteractionLabel(
  type: DashboardInteraction["interaction_type"]
) {
  const labels = {
    call: "Ligação",
    whatsapp: "WhatsApp",
    email: "E-mail",
    meeting: "Reunião",
    note: "Observação",
  };

  return labels[type];
}

export default async function DashboardPage() {
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
  } = await supabase.rpc("bootstrap_workspace");

  if (bootstrapError || !organizationId) {
    throw new Error(
      bootstrapError?.message ??
        "Não foi possível preparar o ambiente comercial."
    );
  }

  const [
    { data: leadsData, error: leadsError },
    { data: stagesData, error: stagesError },
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
        decision_maker_name,
        decision_maker_role,
        estimated_value,
        temperature,
        priority,
        next_action,
        stage_id,
        created_at,
        updated_at
      `)
      .eq("organization_id", organizationId)
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
      .eq("organization_id", organizationId)
      .order("position", {
        ascending: true,
      }),

    supabase
      .from("lead_interactions")
      .select(`
        id,
        lead_id,
        interaction_type,
        subject,
        occurred_at,
        follow_up_at,
        follow_up_completed_at,
        created_at
      `)
      .eq("organization_id", organizationId)
      .order("occurred_at", {
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
    throw new Error(interactionsError.message);
  }

  const leads =
    (leadsData ?? []) as DashboardLead[];

  const stages =
    (stagesData ?? []) as DashboardStage[];

  const interactions =
    (interactionsData ??
      []) as DashboardInteraction[];

  const stageMap = new Map(
    stages.map((stage) => [stage.id, stage])
  );

  const interactionsByLead = new Map<
    string,
    DashboardInteraction[]
  >();

  for (const interaction of interactions) {
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

  const now = new Date();
  const todayKey = getMaceioDateKey(now);

  const scoredLeads: ScoredLead[] = leads.map(
    (lead) => {
      const leadInteractions =
        interactionsByLead.get(lead.id) ?? [];

      const lastInteraction =
        leadInteractions[0] ?? null;

      const futureOrOverdueFollowUps =
        leadInteractions
          .filter(
            (interaction) =>
              interaction.follow_up_at &&
              !interaction.follow_up_completed_at
          )
          .sort(
            (first, second) =>
              new Date(
                first.follow_up_at ?? 0
              ).getTime() -
              new Date(
                second.follow_up_at ?? 0
              ).getTime()
          );

      const nextFollowUp =
        futureOrOverdueFollowUps[0] ?? null;

      const stage = lead.stage_id
        ? stageMap.get(lead.stage_id) ?? null
        : null;

      const score = calculateLeadScore({
        lead,
        stage,
        interactionsCount:
          leadInteractions.length,
        lastInteraction,
        nextFollowUp,
      });

      const isOverdue = Boolean(
        nextFollowUp?.follow_up_at &&
          new Date(
            nextFollowUp.follow_up_at
          ).getTime() < now.getTime()
      );

      const daysWithoutContact =
        lastInteraction
          ? differenceInDays(
              now,
              new Date(
                lastInteraction.occurred_at
              )
            )
          : null;

      return {
        ...lead,
        stage,
        score,
        scoreLabel: getScoreLabel(score),
        interactionsCount:
          leadInteractions.length,
        lastInteraction,
        nextFollowUp,
        isOverdue,
        daysWithoutContact,
      };
    }
  );

  const activeLeads = scoredLeads.filter(
    (lead) => !lead.stage?.is_closed
  );

  const closedLeads = scoredLeads.filter(
    (lead) => lead.stage?.is_closed
  );

  const pipelineValue = activeLeads.reduce(
    (total, lead) =>
      total +
      Number(lead.estimated_value ?? 0),
    0
  );

  const probableRevenue = activeLeads.reduce(
    (total, lead) =>
      total +
      Number(lead.estimated_value ?? 0) *
        (lead.score / 100),
    0
  );

  const hotLeads = activeLeads.filter(
    (lead) => lead.temperature === "hot"
  );

  const overdueLeads = activeLeads.filter(
    (lead) => lead.isOverdue
  );

  const stalledLeads = activeLeads.filter(
    (lead) =>
      lead.daysWithoutContact === null ||
      lead.daysWithoutContact >= 7
  );

  const todayActivities = interactions
    .filter(
      (interaction) =>
        interaction.follow_up_at &&
        !interaction.follow_up_completed_at &&
        getMaceioDateKey(
          new Date(interaction.follow_up_at)
        ) === todayKey
    )
    .sort(
      (first, second) =>
        new Date(
          first.follow_up_at ?? 0
        ).getTime() -
        new Date(
          second.follow_up_at ?? 0
        ).getTime()
    );

  const activityLeadMap = new Map(
    scoredLeads.map((lead) => [
      lead.id,
      lead,
    ])
  );

  const priorityLeads = [...activeLeads]
    .sort((first, second) => {
      if (
        first.isOverdue !== second.isOverdue
      ) {
        return first.isOverdue ? -1 : 1;
      }

      return second.score - first.score;
    })
    .slice(0, 5);

  const pipelineSummary = stages
    .map((stage) => {
      const stageLeads = scoredLeads.filter(
        (lead) => lead.stage_id === stage.id
      );

      return {
        ...stage,
        total: stageLeads.length,
        value: stageLeads.reduce(
          (sum, lead) =>
            sum +
            Number(
              lead.estimated_value ?? 0
            ),
          0
        ),
      };
    })
    .filter(
      (stage) =>
        stage.total > 0 || !stage.is_closed
    );

  const goalPercentage = Math.min(
    100,
    Math.round(
      (CURRENT_RECURRING_REVENUE /
        MONTHLY_GOAL) *
        100
    )
  );

  const goalRemaining = Math.max(
    MONTHLY_GOAL -
      CURRENT_RECURRING_REVENUE,
    0
  );

  const displayName =
    typeof user.user_metadata?.full_name ===
    "string"
      ? user.user_metadata.full_name.split(" ")[0]
      : user.email?.split("@")[0] ?? "Diego";

  const topRecommendation =
    priorityLeads[0] ?? null;

  return (
    <>
      <Header
        description="Prioridades, alertas e oportunidades comerciais em tempo real."
        title="Cockpit Comercial"
      />

      <div className="page-content cockpit-page">
        <section className="cockpit-hero">
          <div>
            <span className="eyebrow">
              <Sparkles size={15} />
              LEVEL UP SALES OS
            </span>

            <h2>
              {getGreeting()}, {displayName}.
            </h2>

            <p>
              {overdueLeads.length > 0 ? (
                <>
                  Você possui{" "}
                  <strong>
                    {overdueLeads.length} follow-up
                    {overdueLeads.length !== 1
                      ? "s"
                      : ""}{" "}
                    atrasado
                    {overdueLeads.length !== 1
                      ? "s"
                      : ""}
                  </strong>{" "}
                  e{" "}
                  <strong>
                    {hotLeads.length} oportunidade
                    {hotLeads.length !== 1
                      ? "s quentes"
                      : " quente"}
                  </strong>{" "}
                  para trabalhar.
                </>
              ) : (
                <>
                  Nenhum follow-up atrasado. Há{" "}
                  <strong>
                    {hotLeads.length} oportunidade
                    {hotLeads.length !== 1
                      ? "s quentes"
                      : " quente"}
                  </strong>{" "}
                  no pipeline.
                </>
              )}
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

        <section className="cockpit-metrics">
          <article>
            <div className="cockpit-metric-icon danger">
              <AlertTriangle size={20} />
            </div>

            <div>
              <span>Follow-ups atrasados</span>
              <strong>
                {overdueLeads.length}
              </strong>
              <small>
                Exigem atenção imediata
              </small>
            </div>
          </article>

          <article>
            <div className="cockpit-metric-icon hot">
              <Flame size={20} />
            </div>

            <div>
              <span>Oportunidades quentes</span>
              <strong>{hotLeads.length}</strong>
              <small>
                {formatMoney(
                  hotLeads.reduce(
                    (sum, lead) =>
                      sum +
                      Number(
                        lead.estimated_value ??
                          0
                      ),
                    0
                  )
                )}{" "}
                em potencial
              </small>
            </div>
          </article>

          <article>
            <div className="cockpit-metric-icon money">
              <CircleDollarSign size={20} />
            </div>

            <div>
              <span>Pipeline ativo</span>
              <strong>
                {formatMoney(pipelineValue)}
              </strong>
              <small>
                {activeLeads.length} oportunidades
              </small>
            </div>
          </article>

          <article>
            <div className="cockpit-metric-icon probable">
              <TrendingUp size={20} />
            </div>

            <div>
              <span>Receita provável</span>
              <strong>
                {formatMoney(probableRevenue)}
              </strong>
              <small>
                Estimada pelo score atual
              </small>
            </div>
          </article>
        </section>

        <div className="cockpit-main-grid">
          <section className="panel cockpit-activities-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  AGENDA COMERCIAL
                </span>

                <h3>Atividades de hoje</h3>
              </div>

              <Link
                className="text-button"
                href="/crm/agenda"
              >
                Abrir agenda
                <ChevronRight size={16} />
              </Link>
            </div>

            {todayActivities.length === 0 ? (
              <div className="cockpit-empty">
                <CheckCircle2 size={26} />

                <strong>
                  Nenhum follow-up marcado para hoje
                </strong>

                <span>
                  Use a página de uma empresa para
                  registrar a próxima atividade.
                </span>
              </div>
            ) : (
              <div className="cockpit-activity-list">
                {todayActivities
                  .slice(0, 7)
                  .map((activity) => {
                    const lead =
                      activityLeadMap.get(
                        activity.lead_id
                      );

                    if (!lead) {
                      return null;
                    }

                    const overdue =
                      Boolean(
                        activity.follow_up_at &&
                          new Date(
                            activity.follow_up_at
                          ).getTime() <
                            now.getTime()
                      );

                    return (
                      <Link
                        className={`cockpit-activity-item ${
                          overdue
                            ? "overdue"
                            : ""
                        }`}
                        href={`/crm/${lead.id}`}
                        key={activity.id}
                      >
                        <div className="cockpit-activity-time">
                          <Clock3 size={15} />

                          <strong>
                            {activity.follow_up_at
                              ? formatTime(
                                  activity.follow_up_at
                                )
                              : "--:--"}
                          </strong>
                        </div>

                        <div className="cockpit-activity-company">
                          <strong>
                            {lead.company_name}
                          </strong>

                          <span>
                            {activity.subject}
                          </span>
                        </div>

                        <div className="cockpit-activity-meta">
                          <span>
                            {getInteractionLabel(
                              activity.interaction_type
                            )}
                          </span>

                          {overdue && (
                            <small>Atrasado</small>
                          )}
                        </div>

                        <ChevronRight size={16} />
                      </Link>
                    );
                  })}
              </div>
            )}
          </section>

          <section className="panel cockpit-alerts-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  ALERTAS
                </span>

                <h3>Saúde do pipeline</h3>
              </div>

              <AlertTriangle size={20} />
            </div>

            <div className="cockpit-alert-list">
              <article className="cockpit-alert danger">
                <AlertTriangle size={18} />

                <div>
                  <strong>
                    {overdueLeads.length} follow-up
                    {overdueLeads.length !== 1
                      ? "s atrasados"
                      : " atrasado"}
                  </strong>

                  <span>
                    Retome essas oportunidades primeiro.
                  </span>
                </div>
              </article>

              <article className="cockpit-alert warning">
                <Clock3 size={18} />

                <div>
                  <strong>
                    {stalledLeads.length} empresa
                    {stalledLeads.length !== 1
                      ? "s paradas"
                      : " parada"}
                  </strong>

                  <span>
                    Sem interação há sete dias ou mais.
                  </span>
                </div>
              </article>

              <article className="cockpit-alert positive">
                <Flame size={18} />

                <div>
                  <strong>
                    {hotLeads.length} oportunidade
                    {hotLeads.length !== 1
                      ? "s quentes"
                      : " quente"}
                  </strong>

                  <span>
                    Priorize decisores já identificados.
                  </span>
                </div>
              </article>
            </div>

            <Link
              className="secondary-button cockpit-alert-button"
              href="/crm"
            >
              Ver oportunidades
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>

        <div className="cockpit-intelligence-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  RANKING INTELIGENTE
                </span>

                <h3>
                  Empresas prioritárias
                </h3>
              </div>

              <Trophy size={20} />
            </div>

            {priorityLeads.length === 0 ? (
              <div className="cockpit-empty compact">
                <Building2 size={24} />
                <strong>
                  Nenhuma empresa ativa
                </strong>
              </div>
            ) : (
              <div className="lead-ranking-list">
                {priorityLeads.map(
                  (lead, index) => (
                    <Link
                      className="lead-ranking-item"
                      href={`/crm/${lead.id}`}
                      key={lead.id}
                    >
                      <span className="ranking-position">
                        {index + 1}
                      </span>

                      <div className="ranking-avatar">
                        {lead.company_name
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="ranking-company">
                        <strong>
                          {lead.company_name}
                        </strong>

                        <span>
                          {lead.stage?.name ??
                            "Sem etapa"}{" "}
                          ·{" "}
                          {formatMoney(
                            Number(
                              lead.estimated_value ??
                                0
                            )
                          )}
                        </span>
                      </div>

                      <div className="ranking-score">
                        <div>
                          <span>Score</span>
                          <strong>
                            {lead.score}
                          </strong>
                        </div>

                        <div className="score-track">
                          <div
                            className="score-progress"
                            style={{
                              width: `${lead.score}%`,
                            }}
                          />
                        </div>

                        <small>
                          {lead.scoreLabel}
                        </small>
                      </div>

                      {lead.isOverdue && (
                        <span className="ranking-overdue">
                          Atrasado
                        </span>
                      )}

                      <ChevronRight size={16} />
                    </Link>
                  )
                )}
              </div>
            )}
          </section>

          <section className="panel cockpit-recommendation">
            <div className="ai-orb">
              <Sparkles size={23} />
            </div>

            <span className="panel-kicker">
              RECOMENDAÇÃO COMERCIAL
            </span>

            {topRecommendation ? (
              <>
                <h3>
                  Comece por{" "}
                  {topRecommendation.company_name}
                </h3>

                <p>
                  Esta empresa possui score de{" "}
                  <strong>
                    {topRecommendation.score}
                  </strong>
                  .{" "}
                  {topRecommendation.isOverdue
                    ? "O follow-up está atrasado e deve ser retomado imediatamente."
                    : topRecommendation.daysWithoutContact ===
                        null
                      ? "Ainda não há interação registrada. Faça o primeiro contato."
                      : `O último contato ocorreu há ${topRecommendation.daysWithoutContact} dia${topRecommendation.daysWithoutContact !== 1 ? "s" : ""}.`}
                </p>

                <div className="recommendation-details">
                  <span>
                    <UserRound size={14} />
                    {topRecommendation.decision_maker_name ??
                      "Decisor não identificado"}
                  </span>

                  <span>
                    <MessageCircle size={14} />
                    {topRecommendation.whatsapp
                      ? "WhatsApp disponível"
                      : "WhatsApp não cadastrado"}
                  </span>

                  <span>
                    <CircleDollarSign size={14} />
                    {formatMoney(
                      Number(
                        topRecommendation.estimated_value ??
                          0
                      )
                    )}{" "}
                    potenciais
                  </span>
                </div>

                <Link
                  className="primary-button"
                  href={`/crm/${topRecommendation.id}`}
                >
                  Abrir empresa
                  <ArrowRight size={16} />
                </Link>
              </>
            ) : (
              <>
                <h3>
                  Cadastre oportunidades
                </h3>

                <p>
                  O sistema precisa de empresas no
                  pipeline para gerar prioridades.
                </p>

                <Link
                  className="primary-button"
                  href="/crm"
                >
                  Abrir CRM
                </Link>
              </>
            )}
          </section>
        </div>

        <section className="panel cockpit-pipeline-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">
                FUNIL DE VENDAS
              </span>

              <h3>Distribuição do pipeline</h3>
            </div>

            <Link
              className="text-button"
              href="/crm"
            >
              Abrir CRM
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="cockpit-pipeline-summary">
            {pipelineSummary.map(
              (stage, index) => (
                <article key={stage.id}>
                  <div className="cockpit-stage-top">
                    <span
                      className="stage-color"
                      style={{
                        backgroundColor:
                          stage.color ??
                          "#64748b",
                      }}
                    />

                    <small>
                      Etapa {index + 1}
                    </small>
                  </div>

                  <strong>{stage.name}</strong>

                  <div>
                    <span>
                      {stage.total} empresa
                      {stage.total !== 1
                        ? "s"
                        : ""}
                    </span>

                    <b>
                      {formatMoney(
                        stage.value
                      )}
                    </b>
                  </div>
                </article>
              )
            )}
          </div>

          <div className="cockpit-goal">
            <div className="goal-icon">
              <Target size={20} />
            </div>

            <div className="goal-content">
              <div>
                <strong>
                  Meta mensal da Level UP
                </strong>

                <span>
                  {formatMoney(
                    CURRENT_RECURRING_REVENUE
                  )}{" "}
                  de{" "}
                  {formatMoney(MONTHLY_GOAL)}
                </span>
              </div>

              <div className="goal-track">
                <div
                  className="goal-progress dynamic"
                  style={{
                    width: `${goalPercentage}%`,
                  }}
                />
              </div>

              <small>
                Faltam{" "}
                {formatMoney(goalRemaining)} para
                alcançar a meta.
              </small>
            </div>

            <strong className="goal-percentage">
              {goalPercentage}%
            </strong>
          </div>
        </section>

        <section className="cockpit-footer-stats">
          <article>
            <Building2 size={19} />

            <div>
              <strong>{activeLeads.length}</strong>
              <span>Oportunidades ativas</span>
            </div>
          </article>

          <article>
            <CalendarClock size={19} />

            <div>
              <strong>
                {todayActivities.length}
              </strong>
              <span>Atividades para hoje</span>
            </div>
          </article>

          <article>
            <CheckCircle2 size={19} />

            <div>
              <strong>{closedLeads.length}</strong>
              <span>Oportunidades encerradas</span>
            </div>
          </article>

          <article>
            <CircleDollarSign size={19} />

            <div>
              <strong>
                {activeLeads.length > 0
                  ? formatMoney(
                      pipelineValue /
                        activeLeads.length
                    )
                  : formatMoney(0)}
              </strong>

              <span>Ticket médio do pipeline</span>
            </div>
          </article>
        </section>
      </div>
    </>
  );
}