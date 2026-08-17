import { Header } from "@/components/crm/sales-os-header";
import {
  CrmBoard,
  Lead,
  PipelineStage,
} from "@/components/sales-os-original/crm/crm-board";
import { NewLeadForm } from "@/components/sales-os-original/crm/new-lead-form";
import { ImportLeadsForm } from "@/components/sales-os-original/crm/import-leads-form";
import { createClient } from "@/lib/crm-supabase/server";
import {
  Building2,
  CalendarClock,
  CircleDollarSign,
  Flame,
} from "lucide-react";
import { redirect } from "next/navigation";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CrmPage() {
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
    { data: stages, error: stagesError },
    { data: leads, error: leadsError },
  ] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select(
        "id, name, position, color, is_closed"
      )
      .eq("organization_id", organizationId)
      .order("position", { ascending: true }),

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
        stage_id,
        created_at
      `)
      .eq("organization_id", organizationId)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (stagesError) {
    throw new Error(stagesError.message);
  }

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const safeStages =
    (stages ?? []) as PipelineStage[];

  const safeLeads = (leads ?? []) as Lead[];

  const activeValue = safeLeads.reduce(
    (total, lead) =>
      total +
      Number(lead.estimated_value ?? 0),
    0
  );

  const hotLeads = safeLeads.filter(
    (lead) => lead.temperature === "hot"
  ).length;

  const nextActions = safeLeads.filter(
    (lead) => Boolean(lead.next_action)
  ).length;

  return (
    <>
      <Header
        description="Gerencie empresas, contatos e negociações reais."
        title="CRM"
      />

      <div className="page-content">
        <div className="page-toolbar">
          <div>
            <span className="panel-kicker">
              PIPELINE COMERCIAL
            </span>

            <h2>Oportunidades</h2>

            <p className="toolbar-description">
              Cadastre, pesquise, edite e movimente
              suas oportunidades.
            </p>
          </div>

          <div className="crm-toolbar-actions">
            <ImportLeadsForm />
            <NewLeadForm />
          </div>
        </div>

        <section className="crm-metrics">
          <article>
            <div className="crm-metric-icon">
              <Building2 size={19} />
            </div>

            <div>
              <span>Leads cadastrados</span>
              <strong>{safeLeads.length}</strong>
            </div>
          </article>

          <article>
            <div className="crm-metric-icon hot">
              <Flame size={19} />
            </div>

            <div>
              <span>Oportunidades quentes</span>
              <strong>{hotLeads}</strong>
            </div>
          </article>

          <article>
            <div className="crm-metric-icon money">
              <CircleDollarSign size={19} />
            </div>

            <div>
              <span>Valor potencial mensal</span>
              <strong>
                {formatMoney(activeValue)}
              </strong>
            </div>
          </article>

          <article>
            <div className="crm-metric-icon action">
              <CalendarClock size={19} />
            </div>

            <div>
              <span>Próximas ações</span>
              <strong>{nextActions}</strong>
            </div>
          </article>
        </section>

        {safeLeads.length === 0 ? (
          <section className="crm-empty-state">
            <div className="crm-empty-icon">
              <Building2 size={27} />
            </div>

            <span className="panel-kicker">
              PRIMEIRO CADASTRO
            </span>

            <h3>Seu pipeline está pronto.</h3>

            <p>
              Cadastre a primeira empresa para
              começar a usar o Level UP Sales OS.
            </p>

            <NewLeadForm />
          </section>
        ) : (
          <CrmBoard
            leads={safeLeads}
            stages={safeStages}
          />
        )}
      </div>
    </>
  );
}