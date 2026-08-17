"use client";

import {
  deleteLeadAction,
  moveLeadAction,
} from "@/app/(sales)/crm/actions/lead-actions";
import {
  Building2,
  Camera,
  Globe2,
  GripVertical,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { EditLeadForm } from "./edit-lead-form";

export type PipelineStage = {
  id: string;
  name: string;
  position: number;
  color: string | null;
  is_closed: boolean;
};

export type Lead = {
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
  created_at: string;
};

type CrmBoardProps = {
  stages: PipelineStage[];
  leads: Lead[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTemperatureLabel(
  temperature: Lead["temperature"]
) {
  const labels = {
    cold: "Frio",
    warm: "Morno",
    hot: "Quente",
  };

  return labels[temperature];
}

function getPriorityLabel(priority: Lead["priority"]) {
  const labels = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
  };

  return labels[priority];
}

function normalizeSearchText(value: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function CrmBoard({
  stages,
  leads,
}: CrmBoardProps) {
  const [localLeads, setLocalLeads] = useState(leads);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingLead, setEditingLead] =
    useState<Lead | null>(null);

  const [draggedLeadId, setDraggedLeadId] =
    useState<string | null>(null);

  const [dragOverStageId, setDragOverStageId] =
    useState<string | null>(null);

  const [isMoving, startMoving] = useTransition();
const filteredLeads = useMemo(() => {
    const normalizedTerm = normalizeSearchText(searchTerm);

    if (!normalizedTerm) {
      return localLeads;
    }

    return localLeads.filter((lead) => {
      const searchableContent = [
        lead.company_name,
        lead.segment,
        lead.city,
        lead.state,
        lead.decision_maker_name,
        lead.decision_maker_role,
        lead.email,
        lead.phone,
        lead.whatsapp,
      ]
        .map(normalizeSearchText)
        .join(" ");

      return searchableContent.includes(normalizedTerm);
    });
  }, [localLeads, searchTerm]);

  function moveLeadLocally(
    leadId: string,
    stageId: string
  ) {
    setLocalLeads((currentLeads) =>
      currentLeads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              stage_id: stageId,
            }
          : lead
      )
    );
  }

  function persistLeadStage(
    leadId: string,
    stageId: string,
    previousStageId: string | null
  ) {
    moveLeadLocally(leadId, stageId);

    startMoving(async () => {
      try {
        const formData = new FormData();

        formData.set("lead_id", leadId);
        formData.set("stage_id", stageId);

        await moveLeadAction(formData);
      } catch (error) {
        moveLeadLocally(
          leadId,
          previousStageId ?? stageId
        );

        console.error(
          "Não foi possível mover o lead:",
          error
        );

        window.alert(
          "Não foi possível salvar a nova etapa. Tente novamente."
        );
      }
    });
  }

  function handleDrop(stageId: string) {
    if (!draggedLeadId) {
      return;
    }

    const draggedLead = localLeads.find(
      (lead) => lead.id === draggedLeadId
    );

    setDragOverStageId(null);
    setDraggedLeadId(null);

    if (
      !draggedLead ||
      draggedLead.stage_id === stageId
    ) {
      return;
    }

    persistLeadStage(
      draggedLead.id,
      stageId,
      draggedLead.stage_id
    );
  }

  return (
    <>
      <section className="crm-search-panel">
        <Search size={18} />

        <input
          aria-label="Pesquisar empresas"
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
          placeholder="Pesquisar por empresa, segmento, cidade ou decisor..."
          type="search"
          value={searchTerm}
        />

        {isMoving && (
          <span className="kanban-saving-status">
            Salvando...
          </span>
        )}

        {searchTerm && (
          <span className="crm-search-result-count">
            {filteredLeads.length} resultado(s)
          </span>
        )}
      </section>

      {filteredLeads.length === 0 ? (
        <section className="crm-empty-state">
          <div className="crm-empty-icon">
            <Building2 size={27} />
          </div>

          <span className="panel-kicker">
            NENHUM RESULTADO
          </span>

          <h3>Nenhuma empresa encontrada.</h3>

          <p>
            Tente pesquisar usando outro nome, segmento,
            cidade ou decisor.
          </p>
        </section>
      ) : (
        <section className="real-kanban-board">
          {stages.map((stage) => {
            const stageLeads = filteredLeads.filter(
              (lead) => lead.stage_id === stage.id
            );

            const stageValue = stageLeads.reduce(
              (total, lead) =>
                total +
                Number(lead.estimated_value ?? 0),
              0
            );

            const isDragTarget =
              dragOverStageId === stage.id;

            return (
              <div
                className={`real-kanban-column ${
                  isDragTarget
                    ? "kanban-column-drag-over"
                    : ""
                }`}
                key={stage.id}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOverStageId(stage.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();

                  event.dataTransfer.dropEffect =
                    "move";

                  setDragOverStageId(stage.id);
                }}
                onDragLeave={(event) => {
                  if (
                    event.currentTarget.contains(
                      event.relatedTarget as Node
                    )
                  ) {
                    return;
                  }

                  setDragOverStageId(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(stage.id);
                }}
              >
                <div className="real-kanban-header">
                  <div>
                    <span
                      className="stage-color"
                      style={{
                        backgroundColor:
                          stage.color ?? "#64748b",
                      }}
                    />

                    <strong>{stage.name}</strong>
                  </div>

                  <span className="stage-counter">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="stage-total">
                  {formatMoney(stageValue)}
                </div>

                <div className="real-kanban-list">
                  {stageLeads.map((lead) => {
                    const isDragging =
                      draggedLeadId === lead.id;

                    return (
                      <article
                        className={`real-lead-card ${
                          isDragging
                            ? "lead-card-dragging"
                            : ""
                        }`}
                        draggable
                        key={lead.id}
                        onDragEnd={() => {
                          setDraggedLeadId(null);
                          setDragOverStageId(null);
                        }}
                        onDragStart={(event) => {
                          setDraggedLeadId(lead.id);

                          event.dataTransfer.effectAllowed =
                            "move";

                          event.dataTransfer.setData(
                            "text/plain",
                            lead.id
                          );
                        }}
                      >
                        <div className="lead-drag-handle">
                          <GripVertical size={15} />
                          <span>
                            Arraste para mudar de etapa
                          </span>
                        </div>

                        <div className="real-lead-card-top">
                          <div className="real-lead-logo">
                            {lead.company_name
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <div className="lead-card-title">
                            <strong>
                              {lead.company_name}
                            </strong>

                            <span>
                              {lead.segment ??
                                "Segmento não informado"}
                            </span>
                          </div>

                          <div className="lead-card-actions">
                            <button
                              aria-label={`Editar ${lead.company_name}`}
                              className="delete-lead-button"
                              onClick={() =>
                                setEditingLead(lead)
                              }
                              title="Editar empresa"
                              type="button"
                            >
                              <Pencil size={15} />
                            </button>

                            <button
  aria-label={`Excluir ${lead.company_name}`}
  className="delete-lead-button"
  onClick={async () => {
    const confirmed = window.confirm(
      `Excluir definitivamente a empresa "${lead.company_name}"?`
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("lead_id", lead.id);

    try {
      await deleteLeadAction(formData);
      window.location.reload();
    } catch (error) {
      console.error("Erro ao excluir empresa:", error);

      window.alert(
        "Não foi possível excluir a empresa. Tente novamente."
      );
    }
  }}
  title="Excluir empresa"
  type="button"
>
  <Trash2 size={15} />
</button>
                          </div>
                        </div>

                        <div className="lead-badges">
                          <span
                            className={`temperature-badge ${lead.temperature}`}
                          >
                            {getTemperatureLabel(
                              lead.temperature
                            )}
                          </span>

                          <span
                            className={`lead-priority ${lead.priority}`}
                          >
                            Prioridade{" "}
                            {getPriorityLabel(
                              lead.priority
                            )}
                          </span>
                        </div>

                        <div className="lead-detail-list">
                          {lead.decision_maker_name && (
                            <span>
                              <UserRound size={14} />

                              {lead.decision_maker_name}

                              {lead.decision_maker_role
                                ? ` · ${lead.decision_maker_role}`
                                : ""}
                            </span>
                          )}

                          {(lead.city || lead.state) && (
                            <span>
                              <MapPin size={14} />

                              {[lead.city, lead.state]
                                .filter(Boolean)
                                .join(" - ")}
                            </span>
                          )}

                          {lead.phone && (
                            <span>
                              <Phone size={14} />
                              {lead.phone}
                            </span>
                          )}

                          {lead.email && (
                            <span>
                              <Mail size={14} />
                              {lead.email}
                            </span>
                          )}
                        </div>

                        <Link
                          className="lead-open-company-button"
                          href={`/crm/${lead.id}`}
                        >
                          <Building2 size={14} />
                          Ver empresa
                        </Link>

                        <div className="lead-social-actions">
                          {lead.whatsapp && (
                            <a
                              href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                              rel="noreferrer"
                              target="_blank"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle size={16} />
                            </a>
                          )}

                          {lead.instagram && (
                            <a
                              href={
                                lead.instagram.startsWith(
                                  "http"
                                )
                                  ? lead.instagram
                                  : `https://instagram.com/${lead.instagram.replace("@", "")}`
                              }
                              rel="noreferrer"
                              target="_blank"
                              title="Abrir Instagram"
                            >
                              <Camera size={16} />
                            </a>
                          )}

                          {lead.website && (
                            <a
                              href={lead.website}
                              rel="noreferrer"
                              target="_blank"
                              title="Abrir site"
                            >
                              <Globe2 size={16} />
                            </a>
                          )}
                        </div>

                        <form
                          action={moveLeadAction}
                          className="pipeline-stage-form"
                        >
                          <input
                            name="lead_id"
                            type="hidden"
                            value={lead.id}
                          />

                          <label>
                            Etapa do pipeline

                            <select
                              key={lead.stage_id}
                              defaultValue={
                                lead.stage_id ?? ""
                              }
                              disabled={isMoving}
                              name="stage_id"
                              onChange={(event) => {
                                const nextStageId =
                                  event.currentTarget.value;

                                const previousStageId =
                                  lead.stage_id;

                                persistLeadStage(
                                  lead.id,
                                  nextStageId,
                                  previousStageId
                                );
                              }}
                            >
                              {stages.map(
                                (availableStage) => (
                                  <option
                                    key={
                                      availableStage.id
                                    }
                                    value={
                                      availableStage.id
                                    }
                                  >
                                    {
                                      availableStage.name
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        </form>

                        <div className="lead-card-footer">
                          <div>
                            <span>Valor estimado</span>

                            <strong>
                              {formatMoney(
                                Number(
                                  lead.estimated_value ??
                                    0
                                )
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>Próxima ação</span>

                            <strong>
                              {lead.next_action ??
                                "Ainda não definida"}
                            </strong>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {stageLeads.length === 0 && (
                    <div
                      className={`empty-stage ${
                        isDragTarget
                          ? "empty-stage-drag-over"
                          : ""
                      }`}
                    >
                      {draggedLeadId
                        ? "Solte o card aqui."
                        : "Nenhuma oportunidade nesta etapa."}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {editingLead && (
        <EditLeadForm
          lead={editingLead}
          onClose={() => setEditingLead(null)}
        />
      )}
    </>
  );
}