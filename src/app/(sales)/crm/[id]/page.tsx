import {
  AiAnalysisPanel,
  type CommercialAiAnalysis,
} from "@/components/sales-os-original/crm/ai-analysis-panel";
import { Header } from "@/components/crm/sales-os-header";
import {
  CompanyHistory,
  type CommercialInteraction,
} from "@/components/sales-os-original/crm/company-history";
import { createClient } from "@/lib/crm-supabase/server";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Camera,
  CircleDollarSign,
  ExternalLink,
  Flame,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type CompanyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Company = {
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
  created_at: string;
  stage_id: string | null;
};

type PipelineStage = {
  id: string;
  name: string;
  color: string | null;
};

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
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getTemperatureLabel(
  temperature: Company["temperature"]
) {
  const labels = {
    cold: "Frio",
    warm: "Morno",
    hot: "Quente",
  };

  return labels[temperature];
}

function getPriorityLabel(
  priority: Company["priority"]
) {
  const labels = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
  };

  return labels[priority];
}

function normalizeWebsite(value: string) {
  if (
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value;
  }

  return `https://${value}`;
}

function normalizeInstagram(value: string) {
  if (
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value;
  }

  return `https://instagram.com/${value.replace("@", "")}`;
}

export default async function CompanyPage({
  params,
}: CompanyPageProps) {
  const { id } = await params;

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

  const {
    data: company,
    error: companyError,
  } = await supabase
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
      created_at,
      stage_id
    `)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (companyError) {
    throw new Error(companyError.message);
  }

  if (!company) {
    notFound();
  }

  const safeCompany = company as Company;

  let stage: PipelineStage | null = null;

  if (safeCompany.stage_id) {
    const { data: stageData } = await supabase
      .from("pipeline_stages")
      .select("id, name, color")
      .eq("id", safeCompany.stage_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    stage = stageData as PipelineStage | null;
  }

  const {
    data: interactionsData,
    error: interactionsError,
  } = await supabase
    .from("lead_interactions")
    .select(`
      id,
      interaction_type,
      subject,
      description,
      occurred_at,
      follow_up_at,
      created_by_email,
      created_at
    `)
    .eq("lead_id", id)
    .eq("organization_id", organizationId)
    .order("occurred_at", {
      ascending: false,
    });

  if (interactionsError) {
    throw new Error(interactionsError.message);
  }

  const interactions =
    (interactionsData ??
      []) as CommercialInteraction[];

  const {
    data: aiAnalysisData,
    error: aiAnalysisError,
  } = await supabase
    .from("lead_ai_analyses")
    .select(`
      id,
      executive_summary,
      marketing_diagnosis,
      commercial_opportunities,
      recommended_approach,
      whatsapp_message,
      probable_objections,
      next_step,
      interest_level,
      commercial_score,
      model_used,
      generated_by_email,
      created_at
    `)
    .eq("lead_id", id)
    .eq("organization_id", organizationId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (aiAnalysisError) {
    throw new Error(aiAnalysisError.message);
  }

  const aiAnalysis =
    aiAnalysisData as
      CommercialAiAnalysis | null;

  const location = [
    safeCompany.city,
    safeCompany.state,
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    <>
      <Header
        description="Visão completa da oportunidade comercial."
        title={safeCompany.company_name}
      />

      <div className="page-content">
        <div className="company-page-topbar">
          <Link
            className="company-back-link"
            href="/crm"
          >
            <ArrowLeft size={16} />
            Voltar ao CRM
          </Link>

          <span>
            Cadastrada em{" "}
            {formatDate(safeCompany.created_at)}
          </span>
        </div>

        <section className="company-hero-card">
          <div className="company-hero-main">
            <div className="company-large-logo">
              {safeCompany.company_name
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div>
              <span className="panel-kicker">
                EMPRESA
              </span>

              <h2>{safeCompany.company_name}</h2>

              <p>
                {safeCompany.segment ??
                  "Segmento ainda não informado"}
              </p>

              <div className="company-hero-badges">
                <span
                  className={`temperature-badge ${safeCompany.temperature}`}
                >
                  <Flame size={12} />
                  {getTemperatureLabel(
                    safeCompany.temperature
                  )}
                </span>

                <span
                  className={`lead-priority ${safeCompany.priority}`}
                >
                  <ShieldAlert size={12} />
                  Prioridade{" "}
                  {getPriorityLabel(
                    safeCompany.priority
                  )}
                </span>

                {stage && (
                  <span className="company-stage-badge">
                    <i
                      style={{
                        backgroundColor:
                          stage.color ?? "#64748b",
                      }}
                    />
                    {stage.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="company-hero-actions">
            {safeCompany.whatsapp && (
              <a
                className="primary-button"
                href={`https://wa.me/${safeCompany.whatsapp.replace(/\D/g, "")}`}
                rel="noreferrer"
                target="_blank"
              >
                <MessageCircle size={16} />
                Abrir WhatsApp
              </a>
            )}

            {safeCompany.website && (
              <a
                className="secondary-button"
                href={normalizeWebsite(
                  safeCompany.website
                )}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={15} />
                Visitar site
              </a>
            )}
          </div>
        </section>

        <section className="company-summary-grid">
          <article>
            <div className="company-summary-icon">
              <CircleDollarSign size={19} />
            </div>

            <div>
              <span>Valor estimado mensal</span>
              <strong>
                {formatMoney(
                  Number(
                    safeCompany.estimated_value ?? 0
                  )
                )}
              </strong>
            </div>
          </article>

          <article>
            <div className="company-summary-icon action">
              <CalendarClock size={19} />
            </div>

            <div>
              <span>Próxima ação</span>
              <strong>
                {safeCompany.next_action ??
                  "Ainda não definida"}
              </strong>
            </div>
          </article>

          <article>
            <div className="company-summary-icon location">
              <MapPin size={19} />
            </div>

            <div>
              <span>Localização</span>
              <strong>
                {location || "Não informada"}
              </strong>
            </div>
          </article>
        </section>

        <div className="company-content-grid">
          <section className="company-panel">
            <div className="company-panel-header">
              <div>
                <span className="panel-kicker">
                  CONTATO
                </span>

                <h3>Informações da empresa</h3>
              </div>

              <Building2 size={20} />
            </div>

            <div className="company-information-list">
              <div>
                <span>
                  <Globe2 size={15} />
                  Site
                </span>

                {safeCompany.website ? (
                  <a
                    href={normalizeWebsite(
                      safeCompany.website
                    )}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {safeCompany.website}
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  <strong>Não informado</strong>
                )}
              </div>

              <div>
                <span>
                  <Camera size={15} />
                  Instagram
                </span>

                {safeCompany.instagram ? (
                  <a
                    href={normalizeInstagram(
                      safeCompany.instagram
                    )}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {safeCompany.instagram}
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  <strong>Não informado</strong>
                )}
              </div>

              <div>
                <span>
                  <Phone size={15} />
                  Telefone
                </span>

                <strong>
                  {safeCompany.phone ??
                    "Não informado"}
                </strong>
              </div>

              <div>
                <span>
                  <MessageCircle size={15} />
                  WhatsApp
                </span>

                <strong>
                  {safeCompany.whatsapp ??
                    "Não informado"}
                </strong>
              </div>

              <div>
                <span>
                  <Mail size={15} />
                  E-mail
                </span>

                {safeCompany.email ? (
                  <a
                    href={`mailto:${safeCompany.email}`}
                  >
                    {safeCompany.email}
                  </a>
                ) : (
                  <strong>Não informado</strong>
                )}
              </div>

              <div>
                <span>
                  <MapPin size={15} />
                  Cidade
                </span>

                <strong>
                  {location || "Não informada"}
                </strong>
              </div>
            </div>
          </section>

          <section className="company-panel">
            <div className="company-panel-header">
              <div>
                <span className="panel-kicker">
                  DECISOR
                </span>

                <h3>Contato comercial</h3>
              </div>

              <UserRound size={20} />
            </div>

            <div className="decision-maker-card">
              <div className="decision-maker-avatar">
                {safeCompany.decision_maker_name
                  ? safeCompany.decision_maker_name
                      .slice(0, 2)
                      .toUpperCase()
                  : "?"}
              </div>

              <div>
                <strong>
                  {safeCompany.decision_maker_name ??
                    "Decisor ainda não identificado"}
                </strong>

                <span>
                  {safeCompany.decision_maker_role ??
                    "Cargo não informado"}
                </span>
              </div>
            </div>

            <div className="company-commercial-status">
              <div>
                <span>Temperatura</span>
                <strong>
                  {getTemperatureLabel(
                    safeCompany.temperature
                  )}
                </strong>
              </div>

              <div>
                <span>Prioridade</span>
                <strong>
                  {getPriorityLabel(
                    safeCompany.priority
                  )}
                </strong>
              </div>

              <div>
                <span>Etapa atual</span>
                <strong>
                  {stage?.name ?? "Não definida"}
                </strong>
              </div>
            </div>
          </section>
        </div>

        <section className="company-panel company-notes-panel">
          <div className="company-panel-header">
            <div>
              <span className="panel-kicker">
                CONTEXTO COMERCIAL
              </span>

              <h3>Observações e pesquisa</h3>
            </div>
          </div>

          <div className="company-notes-content">
            {safeCompany.notes ? (
              <p>{safeCompany.notes}</p>
            ) : (
              <div className="company-no-notes">
                <Building2 size={22} />

                <div>
                  <strong>
                    Nenhuma observação cadastrada
                  </strong>

                  <span>
                    Use a edição no CRM para registrar
                    informações da pesquisa, oportunidades e
                    detalhes importantes.
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        <AiAnalysisPanel
          analysis={aiAnalysis}
          leadId={safeCompany.id}
        />

        <CompanyHistory
          interactions={interactions}
          leadId={safeCompany.id}
        />
      </div>
    </>
  );
}