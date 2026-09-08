import "../crm-pipeline-v2.css";

import {
  Header,
} from "@/components/crm/sales-os-header";

import {
  CrmBoard,
  Lead,
  PipelineStage,
} from "@/components/sales-os-original/crm/crm-board";

import {
  ImportLeadsForm,
} from "@/components/sales-os-original/crm/import-leads-form";

import {
  NewLeadForm,
} from "@/components/sales-os-original/crm/new-lead-form";

import {
  createClient,
} from "@/lib/crm-supabase/server";

import {
  Building2,
  CalendarClock,
  CircleDollarSign,
  Flame,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";


function formatMoney(
  value: number
) {

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL",

      maximumFractionDigits:
        0,
    }
  ).format(
    value
  );
}


export default async function CrmPage() {

  const supabase =
    await createClient();


  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();


  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }


  const {
    data:
      organizationId,

    error:
      bootstrapError,
  } =
    await supabase.rpc(
      "bootstrap_workspace"
    );


  if (
    bootstrapError ||
    !organizationId
  ) {
    throw new Error(
      bootstrapError
        ?.message ??
      "Não foi possível preparar o ambiente comercial."
    );
  }


  const [
    {
      data:
        stages,

      error:
        stagesError,
    },

    {
      data:
        leads,

      error:
        leadsError,
    },
  ] =
    await Promise.all([

      supabase
        .from(
          "pipeline_stages"
        )
        .select(
          "id, name, position, color, is_closed"
        )
        .eq(
          "organization_id",
          organizationId
        )
        .order(
          "position",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "leads"
        )
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
        .eq(
          "organization_id",
          organizationId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

    ]);


  if (
    stagesError
  ) {
    throw new Error(
      stagesError.message
    );
  }


  if (
    leadsError
  ) {
    throw new Error(
      leadsError.message
    );
  }


  const safeStages =
    (
      stages ??
      []
    ) as PipelineStage[];


  const safeLeads =
    (
      leads ??
      []
    ) as Lead[];


  const activeStageIds =
    new Set(
      safeStages
        .filter(
          (
            stage
          ) =>
            !stage.is_closed
        )
        .map(
          (
            stage
          ) =>
            stage.id
        )
    );


  const activeLeads =
    safeLeads.filter(
      (
        lead
      ) =>
        !lead.stage_id ||
        activeStageIds.has(
          lead.stage_id
        )
    );


  const activeValue =
    activeLeads.reduce(
      (
        total,
        lead
      ) =>
        total +
        Number(
          lead.estimated_value ??
          0
        ),
      0
    );


  const hotLeads =
    activeLeads.filter(
      (
        lead
      ) =>
        lead.temperature ===
        "hot"
    ).length;


  const nextActions =
    activeLeads.filter(
      (
        lead
      ) =>
        Boolean(
          lead.next_action
        )
    ).length;


  return (
    <>

      <Header
        description="Gerencie empresas, contatos e negociações reais."
        title="CRM"
      />


      <main className="crm-pipeline-v2">

        <section className="crm-pipeline-hero-v2">

          <div>

            <span className="crm-eyebrow-v2">
              PIPELINE COMERCIAL
            </span>

            <h1>
              Oportunidades
            </h1>

            <p>
              Visualize seu funil, acompanhe negociações e saiba exatamente qual é o próximo passo de cada oportunidade.
            </p>

          </div>


          <div className="crm-hero-actions-v2">

            <ImportLeadsForm />

            <NewLeadForm />

          </div>

        </section>


        <section className="crm-summary-grid-v2">

          <article className="crm-summary-card-v2">

            <div className="crm-summary-icon-v2 blue">
              <Building2 size={20} />
            </div>

            <div>
              <span>
                Leads ativos
              </span>

              <strong>
                {activeLeads.length}
              </strong>

              <small>
                no funil comercial
              </small>
            </div>

          </article>


          <article className="crm-summary-card-v2">

            <div className="crm-summary-icon-v2 orange">
              <Flame size={20} />
            </div>

            <div>
              <span>
                Oportunidades quentes
              </span>

              <strong>
                {hotLeads}
              </strong>

              <small>
                prioridade de contato
              </small>
            </div>

          </article>


          <article className="crm-summary-card-v2 featured">

            <div className="crm-summary-icon-v2 cyan">
              <CircleDollarSign size={20} />
            </div>

            <div>
              <span>
                Potencial mensal
              </span>

              <strong>
                {formatMoney(
                  activeValue
                )}
              </strong>

              <small>
                pipeline em aberto
              </small>
            </div>

          </article>


          <article className="crm-summary-card-v2">

            <div className="crm-summary-icon-v2 purple">
              <CalendarClock size={20} />
            </div>

            <div>
              <span>
                Próximas ações
              </span>

              <strong>
                {nextActions}
              </strong>

              <small>
                follow-ups definidos
              </small>
            </div>

          </article>

        </section>


        {
          safeStages.length ===
          0
            ? (
                <section className="crm-no-stages-v2">

                  <Building2 size={30} />

                  <strong>
                    Nenhuma etapa encontrada
                  </strong>

                  <p>
                    O pipeline ainda não possui etapas comerciais cadastradas.
                  </p>

                </section>
              )
            : (
                <CrmBoard
                  leads={safeLeads}
                  stages={safeStages}
                />
              )
        }

      </main>

    </>
  );
}