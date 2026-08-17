import {
  completeFollowUpAction,
} from "@/app/(sales)/crm/actions/interaction-actions";
import { Header } from "@/components/sales-os-original/header";
import { createClient } from "@/lib/crm-supabase/server";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Flame,
  Mail,
  MessageCircle,
  Phone,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type AgendaInteraction = {
  id: string;
  lead_id: string;
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
  follow_up_completed_at: string | null;
};

type AgendaLead = {
  id: string;
  company_name: string;
  segment: string | null;
  decision_maker_name: string | null;
  estimated_value: number;
  temperature: "cold" | "warm" | "hot";
  priority: "low" | "medium" | "high";
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
};

type AgendaItem = AgendaInteraction & {
  lead: AgendaLead;
  status: "overdue" | "today" | "upcoming";
};

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Maceio",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Maceio",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInteractionLabel(
  type: AgendaInteraction["interaction_type"]
) {
  const labels = {
    call: "Ligação",
    whatsapp: "WhatsApp",
    email: "E-mail",
    meeting: "Reunião",
    note: "Acompanhamento",
  };

  return labels[type];
}

function getInteractionIcon(
  type: AgendaInteraction["interaction_type"]
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

  return CalendarClock;
}

export default async function AgendaPage() {
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
    {
      data: interactionsData,
      error: interactionsError,
    },
    {
      data: leadsData,
      error: leadsError,
    },
  ] = await Promise.all([
    supabase
      .from("lead_interactions")
      .select(`
        id,
        lead_id,
        interaction_type,
        subject,
        description,
        occurred_at,
        follow_up_at,
        follow_up_completed_at
      `)
      .eq("organization_id", organizationId)
      .not("follow_up_at", "is", null)
      .is("follow_up_completed_at", null)
      .order("follow_up_at", {
        ascending: true,
      }),

    supabase
      .from("leads")
      .select(`
        id,
        company_name,
        segment,
        decision_maker_name,
        estimated_value,
        temperature,
        priority,
        whatsapp,
        phone,
        email
      `)
      .eq("organization_id", organizationId),
  ]);

  if (interactionsError) {
    throw new Error(interactionsError.message);
  }

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const interactions =
    (interactionsData ?? []) as AgendaInteraction[];

  const leads = (leadsData ?? []) as AgendaLead[];

  const leadMap = new Map(
    leads.map((lead) => [lead.id, lead])
  );

  const now = new Date();
  const todayKey = getMaceioDateKey(now);

  const agendaItems: AgendaItem[] = interactions
    .map((interaction) => {
      const lead = leadMap.get(interaction.lead_id);

      if (!lead || !interaction.follow_up_at) {
        return null;
      }

      const followUpDate = new Date(
        interaction.follow_up_at
      );

      const followUpKey =
        getMaceioDateKey(followUpDate);

      let status: AgendaItem["status"] =
        "upcoming";

      if (followUpDate.getTime() < now.getTime()) {
        status = "overdue";
      } else if (followUpKey === todayKey) {
        status = "today";
      }

      return {
        ...interaction,
        lead,
        status,
      };
    })
    .filter(
      (item): item is AgendaItem =>
        item !== null
    );

  const overdueItems = agendaItems.filter(
    (item) => item.status === "overdue"
  );

  const todayItems = agendaItems.filter(
    (item) => item.status === "today"
  );

  const upcomingItems = agendaItems.filter(
    (item) => item.status === "upcoming"
  );

  const potentialValue = [
    ...overdueItems,
    ...todayItems,
  ].reduce(
    (total, item) =>
      total +
      Number(item.lead.estimated_value ?? 0),
    0
  );

  function renderAgendaList(
    items: AgendaItem[],
    emptyMessage: string
  ) {
    if (items.length === 0) {
      return (
        <div className="agenda-empty">
          <CheckCircle2 size={24} />

          <strong>{emptyMessage}</strong>
        </div>
      );
    }

    return (
      <div className="agenda-task-list">
        {items.map((item) => {
          const Icon = getInteractionIcon(
            item.interaction_type
          );

          return (
            <article
              className={`agenda-task-card ${item.status}`}
              key={item.id}
            >
              <div className="agenda-task-time">
                <strong>
                  {formatTime(item.follow_up_at!)}
                </strong>

                <span>
                  {formatDate(item.follow_up_at!)}
                </span>
              </div>

              <div
                className={`agenda-task-icon ${item.interaction_type}`}
              >
                <Icon size={18} />
              </div>

              <div className="agenda-task-content">
                <div className="agenda-task-title">
                  <strong>
                    {item.lead.company_name}
                  </strong>

                  {item.lead.temperature === "hot" && (
                    <span className="agenda-hot-badge">
                      <Flame size={11} />
                      Quente
                    </span>
                  )}
                </div>

                <span>
                  {getInteractionLabel(
                    item.interaction_type
                  )}{" "}
                  · {item.subject}
                </span>

                <small>
                  {item.lead.decision_maker_name
                    ? `Decisor: ${item.lead.decision_maker_name}`
                    : "Decisor ainda não identificado"}
                </small>
              </div>

              <div className="agenda-task-value">
                <span>Valor potencial</span>

                <strong>
                  {formatMoney(
                    Number(
                      item.lead.estimated_value ?? 0
                    )
                  )}
                </strong>
              </div>

              <div className="agenda-task-complete">
                <form action={completeFollowUpAction}>
                  <input
                    name="interaction_id"
                    type="hidden"
                    value={item.id}
                  />

                  <input
                    name="lead_id"
                    type="hidden"
                    value={item.lead.id}
                  />

                  <button
                    className="agenda-complete-button"
                    type="submit"
                  >
                    <CheckCircle2 size={15} />
                    Concluir
                  </button>
                </form>
              </div>

              <div className="agenda-task-actions">
                {item.lead.whatsapp && (
                  <a
                    aria-label={`Abrir WhatsApp de ${item.lead.company_name}`}
                    href={`https://wa.me/${item.lead.whatsapp.replace(/\D/g, "")}`}
                    rel="noreferrer"
                    target="_blank"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </a>
                )}

                {item.lead.phone && (
                  <a
                    aria-label={`Ligar para ${item.lead.company_name}`}
                    href={`tel:${item.lead.phone}`}
                    title="Ligar"
                  >
                    <Phone size={16} />
                  </a>
                )}

                {item.lead.email && (
                  <a
                    aria-label={`Enviar e-mail para ${item.lead.company_name}`}
                    href={`mailto:${item.lead.email}`}
                    title="Enviar e-mail"
                  >
                    <Mail size={16} />
                  </a>
                )}

                <Link
                  href={`/crm/${item.lead.id}`}
                  title="Abrir empresa"
                >
                  <ArrowRight size={17} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <Header
        description="Todas as ações comerciais que precisam da sua atenção."
        title="Agenda Comercial"
      />

      <div className="page-content">
        <section className="agenda-hero">
          <div>
            <span className="eyebrow">
              <CalendarCheck size={15} />
              ROTINA COMERCIAL
            </span>

            <h2>
              Seu dia de vendas, organizado.
            </h2>

            <p>
              Comece pelos atrasados, execute as
              atividades de hoje e mantenha o
              pipeline em movimento.
            </p>
          </div>

          <Link
            className="primary-button"
            href="/crm"
          >
            Abrir CRM
            <ArrowRight size={17} />
          </Link>
        </section>

        <section className="agenda-metrics">
          <article>
            <div className="agenda-metric-icon danger">
              <AlertTriangle size={20} />
            </div>

            <div>
              <span>Atrasados</span>
              <strong>{overdueItems.length}</strong>
            </div>
          </article>

          <article>
            <div className="agenda-metric-icon today">
              <CalendarClock size={20} />
            </div>

            <div>
              <span>Para hoje</span>
              <strong>{todayItems.length}</strong>
            </div>
          </article>

          <article>
            <div className="agenda-metric-icon upcoming">
              <CalendarCheck size={20} />
            </div>

            <div>
              <span>Próximos</span>
              <strong>{upcomingItems.length}</strong>
            </div>
          </article>

          <article>
            <div className="agenda-metric-icon money">
              <Building2 size={20} />
            </div>

            <div>
              <span>Valor em atenção</span>
              <strong>
                {formatMoney(potentialValue)}
              </strong>
            </div>
          </article>
        </section>

        <section className="panel agenda-section agenda-overdue-section">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">
                PRIORIDADE MÁXIMA
              </span>

              <h3>Follow-ups atrasados</h3>
            </div>

            <AlertTriangle size={20} />
          </div>

          {renderAgendaList(
            overdueItems,
            "Nenhum follow-up atrasado."
          )}
        </section>

        <section className="panel agenda-section">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">
                HOJE
              </span>

              <h3>Atividades do dia</h3>
            </div>

            <Clock3 size={20} />
          </div>

          {renderAgendaList(
            todayItems,
            "Nenhuma atividade agendada para hoje."
          )}
        </section>

        <section className="panel agenda-section">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">
                PRÓXIMOS DIAS
              </span>

              <h3>Próximos follow-ups</h3>
            </div>

            <CalendarCheck size={20} />
          </div>

          {renderAgendaList(
            upcomingItems.slice(0, 15),
            "Nenhum próximo follow-up agendado."
          )}
        </section>
      </div>
    </>
  );
}