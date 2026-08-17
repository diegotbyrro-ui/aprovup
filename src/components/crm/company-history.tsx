"use client";

import {
  createInteractionAction,
  deleteInteractionAction,
  type InteractionActionResult,
} from "@/app/(sales)/crm/actions/interaction-actions";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
} from "react";

export type CommercialInteraction = {
  id: string;
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
  created_by_email: string | null;
  created_at: string;
};

type CompanyHistoryProps = {
  leadId: string;
  interactions: CommercialInteraction[];
};

const initialState: InteractionActionResult = {
  success: false,
  message: "",
};

const typeLabels = {
  call: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meeting: "Reunião",
  note: "Observação",
};

function getTypeIcon(
  type: CommercialInteraction["interaction_type"]
) {
  if (type === "call") {
    return <Phone size={16} />;
  }

  if (type === "whatsapp") {
    return <MessageCircle size={16} />;
  }

  if (type === "email") {
    return <Mail size={16} />;
  }

  if (type === "meeting") {
    return <UsersRound size={16} />;
  }

  return <FileText size={16} />;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Maceio",
  }).format(new Date(value));
}

function toLocalDateTimeInput(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const hour = String(
    date.getHours()
  ).padStart(2, "0");

  const minute = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function isOverdue(value: string | null) {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() < Date.now();
}

export function CompanyHistory({
  leadId,
  interactions,
}: CompanyHistoryProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] =
    useActionState(
      createInteractionAction,
      initialState
    );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <section className="company-history-grid">
      <article className="company-panel">
        <div className="company-panel-header">
          <div>
            <span className="panel-kicker">
              NOVA INTERAÇÃO
            </span>

            <h3>Registrar atividade comercial</h3>
          </div>

          <Plus size={20} />
        </div>

        <form
          action={formAction}
          className="interaction-form"
          ref={formRef}
        >
          <input
            name="lead_id"
            type="hidden"
            value={leadId}
          />

          <div className="interaction-form-grid">
            <label>
              Tipo de interação
              <select
                defaultValue="whatsapp"
                name="interaction_type"
              >
                <option value="call">
                  Ligação
                </option>

                <option value="whatsapp">
                  WhatsApp
                </option>

                <option value="email">
                  E-mail
                </option>

                <option value="meeting">
                  Reunião
                </option>

                <option value="note">
                  Observação
                </option>
              </select>
            </label>

            <label>
              Data da interação
              <input
                defaultValue={toLocalDateTimeInput(
                  new Date()
                )}
                name="occurred_at"
                type="datetime-local"
              />
            </label>

            <label className="field-full">
              Resumo da interação *
              <input
                name="subject"
                placeholder="Ex.: Primeiro contato realizado"
                required
                type="text"
              />
            </label>

            <label className="field-full">
              Detalhes
              <textarea
                name="description"
                placeholder="Descreva o que foi conversado, objeções, oportunidades e informações importantes."
                rows={5}
              />
            </label>

            <label className="field-full">
              Próximo follow-up
              <input
                name="follow_up_at"
                type="datetime-local"
              />

              <small>
                Ao preencher esta data, a próxima ação da
                empresa também será atualizada.
              </small>
            </label>
          </div>

          {state.message && (
            <div
              className={
                state.success
                  ? "form-success"
                  : "form-error"
              }
              role="status"
            >
              {state.success ? (
                <CheckCircle2 size={16} />
              ) : null}

              {state.message}
            </div>
          )}

          <button
            className="primary-button interaction-submit"
            disabled={isPending}
            type="submit"
          >
            {isPending ? (
              <>
                <LoaderCircle
                  className="loading-icon"
                  size={17}
                />

                Salvando...
              </>
            ) : (
              <>
                <Plus size={17} />
                Registrar interação
              </>
            )}
          </button>
        </form>
      </article>

      <article className="company-panel">
        <div className="company-panel-header">
          <div>
            <span className="panel-kicker">
              HISTÓRICO COMERCIAL
            </span>

            <h3>Linha do tempo</h3>
          </div>

          <Clock3 size={20} />
        </div>

        {interactions.length === 0 ? (
          <div className="interaction-empty-state">
            <CalendarClock size={25} />

            <strong>
              Nenhuma interação registrada
            </strong>

            <span>
              Registre o primeiro contato para iniciar o
              histórico comercial desta empresa.
            </span>
          </div>
        ) : (
          <div className="interaction-timeline">
            {interactions.map((interaction) => {
              const overdue = isOverdue(
                interaction.follow_up_at
              );

              return (
                <div
                  className="interaction-item"
                  key={interaction.id}
                >
                  <div
                    className={`interaction-icon ${interaction.interaction_type}`}
                  >
                    {getTypeIcon(
                      interaction.interaction_type
                    )}
                  </div>

                  <div className="interaction-content">
                    <div className="interaction-item-header">
                      <div>
                        <span className="interaction-type">
                          {
                            typeLabels[
                              interaction.interaction_type
                            ]
                          }
                        </span>

                        <strong>
                          {interaction.subject}
                        </strong>
                      </div>

                      <form
                        action={
                          deleteInteractionAction
                        }
                        onSubmit={(event) => {
                          const confirmed =
                            window.confirm(
                              "Excluir esta interação do histórico?"
                            );

                          if (!confirmed) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input
                          name="interaction_id"
                          type="hidden"
                          value={interaction.id}
                        />

                        <input
                          name="lead_id"
                          type="hidden"
                          value={leadId}
                        />

                        <button
                          aria-label="Excluir interação"
                          className="interaction-delete"
                          title="Excluir interação"
                          type="submit"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>

                    {interaction.description && (
                      <p>
                        {interaction.description}
                      </p>
                    )}

                    <div className="interaction-meta">
                      <span>
                        <Clock3 size={13} />
                        {formatDateTime(
                          interaction.occurred_at
                        )}
                      </span>

                      <span>
                        Responsável:{" "}
                        {interaction.created_by_email ??
                          "Usuário comercial"}
                      </span>
                    </div>

                    {interaction.follow_up_at && (
                      <div
                        className={`interaction-follow-up ${
                          overdue ? "overdue" : ""
                        }`}
                      >
                        <CalendarClock size={14} />

                        <div>
                          <span>
                            {overdue
                              ? "Follow-up atrasado"
                              : "Próximo follow-up"}
                          </span>

                          <strong>
                            {formatDateTime(
                              interaction.follow_up_at
                            )}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}