"use client";

import {
  deleteLeadAction,
  moveLeadAction,
} from "@/app/(sales)/crm/actions/lead-actions";

import {
  Building2,
  CalendarClock,
  Camera,
  CircleDollarSign,
  Flame,
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
  X,
} from "lucide-react";

import Link from "next/link";

import {
  SyncedHorizontalScroll,
} from "@/components/kanban/SyncedHorizontalScroll";

import {
  PipelineStageManager,
} from "./pipeline-stage-manager";

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  EditLeadForm,
} from "./edit-lead-form";


export type PipelineStage = {
  id:
    string;

  name:
    string;

  position:
    number;

  color:
    string | null;

  is_closed:
    boolean;
};


export type Lead = {
  id:
    string;

  company_name:
    string;

  segment:
    string | null;

  website:
    string | null;

  instagram:
    string | null;

  phone:
    string | null;

  whatsapp:
    string | null;

  email:
    string | null;

  city:
    string | null;

  state:
    string | null;

  decision_maker_name:
    string | null;

  decision_maker_role:
    string | null;

  estimated_value:
    number;

  temperature:
    "cold" |
    "warm" |
    "hot";

  priority:
    "low" |
    "medium" |
    "high";

  next_action:
    string | null;

  notes:
    string | null;

  stage_id:
    string | null;

  created_at:
    string;
};


type CrmBoardProps = {
  stages:
    PipelineStage[];

  leads:
    Lead[];
};


type TemperatureFilter =
  "all" |
  Lead["temperature"];


type PriorityFilter =
  "all" |
  Lead["priority"];


function formatMoney(
  value:
    number
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


function getTemperatureLabel(
  temperature:
    Lead["temperature"]
) {

  const labels = {
    cold:
      "Frio",

    warm:
      "Morno",

    hot:
      "Quente",
  };


  return labels[
    temperature
  ];
}


function getPriorityLabel(
  priority:
    Lead["priority"]
) {

  const labels = {
    low:
      "Baixa",

    medium:
      "Média",

    high:
      "Alta",
  };


  return labels[
    priority
  ];
}


function normalizeSearchText(
  value:
    string | null
) {

  return (
    value ??
    ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}


function companyInitials(
  value:
    string
) {

  const words =
    value
      .trim()
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );


  if (
    words.length ===
    0
  ) {
    return "??";
  }


  if (
    words.length ===
    1
  ) {
    return words[0]
      .slice(
        0,
        2
      )
      .toUpperCase();
  }


  return (
    words[0][0] +
    words[
      words.length -
      1
    ][0]
  ).toUpperCase();
}


export function CrmBoard({
  stages,
  leads,
}: CrmBoardProps) {

  const [
    localLeads,
    setLocalLeads,
  ] =
    useState(
      leads
    );


  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  useEffect(
    () => {
      setLocalLeads(
        leads
      );
    },
    [
      leads,
    ]
  );


  useEffect(
    () => {
      function handleSearchShortcut(
        event: KeyboardEvent
      ) {
        if (
          (
            event.ctrlKey ||
            event.metaKey
          ) &&
          event.key.toLowerCase() ===
            "k"
        ) {
          event.preventDefault();

          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }


      window.addEventListener(
        "keydown",
        handleSearchShortcut
      );


      return () => {
        window.removeEventListener(
          "keydown",
          handleSearchShortcut
        );
      };
    },
    []
  );


  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState(
      ""
    );


  const [
    temperatureFilter,
    setTemperatureFilter,
  ] =
    useState<TemperatureFilter>(
      "all"
    );


  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState<PriorityFilter>(
      "all"
    );


  const [
    editingLead,
    setEditingLead,
  ] =
    useState<Lead | null>(
      null
    );


  const [
    draggedLeadId,
    setDraggedLeadId,
  ] =
    useState<string | null>(
      null
    );


  const [
    dragOverStageId,
    setDragOverStageId,
  ] =
    useState<string | null>(
      null
    );


  const [
    isMoving,
    startMoving,
  ] =
    useTransition();


  const filteredLeads =
    useMemo(
      () => {

        const normalizedTerm =
          normalizeSearchText(
            searchTerm
          );


        return localLeads.filter(
          (
            lead
          ) => {

            if (
              temperatureFilter !==
                "all" &&
              lead.temperature !==
                temperatureFilter
            ) {
              return false;
            }


            if (
              priorityFilter !==
                "all" &&
              lead.priority !==
                priorityFilter
            ) {
              return false;
            }


            if (
              !normalizedTerm
            ) {
              return true;
            }


            const searchableContent =
              [
                lead.company_name,
                lead.segment,
                lead.website,
                lead.instagram,
                lead.city,
                lead.state,
                lead.decision_maker_name,
                lead.decision_maker_role,
                lead.email,
                lead.phone,
                lead.whatsapp,
              ]
                .map(
                  normalizeSearchText
                )
                .join(
                  " "
                );


            return searchableContent.includes(
              normalizedTerm
            );
          }
        );
      },
      [
        localLeads,
        priorityFilter,
        searchTerm,
        temperatureFilter,
      ]
    );


  const filteredValue =
    useMemo(
      () =>
        filteredLeads.reduce(
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
        ),
      [
        filteredLeads,
      ]
    );


  const hasFilters =
    Boolean(
      searchTerm.trim()
    ) ||
    temperatureFilter !==
      "all" ||
    priorityFilter !==
      "all";


  function clearFilters() {

    setSearchTerm(
      ""
    );

    setTemperatureFilter(
      "all"
    );

    setPriorityFilter(
      "all"
    );
  }


  function moveLeadLocally(
    leadId:
      string,

    stageId:
      string
  ) {

    setLocalLeads(
      (
        currentLeads
      ) =>
        currentLeads.map(
          (
            lead
          ) =>
            lead.id ===
            leadId
              ? {
                  ...lead,

                  stage_id:
                    stageId,
                }
              : lead
        )
    );
  }


  function persistLeadStage(
    leadId:
      string,

    stageId:
      string,

    previousStageId:
      string | null
  ) {

    moveLeadLocally(
      leadId,
      stageId
    );


    startMoving(
      async () => {

        try {

          const formData =
            new FormData();


          formData.set(
            "lead_id",
            leadId
          );

          formData.set(
            "stage_id",
            stageId
          );


          await moveLeadAction(
            formData
          );

        }
        catch (
          error
        ) {

          if (
            previousStageId
          ) {
            moveLeadLocally(
              leadId,
              previousStageId
            );
          }


          console.error(
            "Não foi possível mover o lead:",
            error
          );


          window.alert(
            "Não foi possível salvar a nova etapa. Tente novamente."
          );
        }
      }
    );
  }


  function handleDrop(
    stageId:
      string
  ) {

    if (
      !draggedLeadId
    ) {
      return;
    }


    const draggedLead =
      localLeads.find(
        (
          lead
        ) =>
          lead.id ===
          draggedLeadId
      );


    setDragOverStageId(
      null
    );

    setDraggedLeadId(
      null
    );


    if (
      !draggedLead ||
      draggedLead.stage_id ===
        stageId
    ) {
      return;
    }


    persistLeadStage(
      draggedLead.id,
      stageId,
      draggedLead.stage_id
    );
  }


  async function removeLead(
    lead:
      Lead
  ) {

    const confirmed =
      window.confirm(
        `Excluir definitivamente a empresa "${lead.company_name}"?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    const formData =
      new FormData();


    formData.set(
      "lead_id",
      lead.id
    );


    try {

      await deleteLeadAction(
        formData
      );


      setLocalLeads(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              lead.id
          )
      );

    }
    catch (
      error
    ) {

      console.error(
        "Erro ao excluir empresa:",
        error
      );


      window.alert(
        "Não foi possível excluir a empresa. Tente novamente."
      );
    }
  }


  return (
    <>

      <section className="crm-board-v2">

        <div className="crm-board-toolbar-v2">

          <div className="crm-board-search-v2">

            <Search size={18} />

            <input
              ref={searchInputRef}
              aria-label="Pesquisar oportunidades"
              onChange={
                (
                  event
                ) =>
                  setSearchTerm(
                    event.target.value
                  )
              }
              placeholder="Buscar empresa, contato, cidade, segmento ou responsável..."
              type="search"
              value={searchTerm}
            />

            <kbd className="crm-search-shortcut-v2">
              Ctrl K
            </kbd>

          </div>


          <select
            aria-label="Filtrar por temperatura"
            className="crm-board-filter-v2"
            onChange={
              (
                event
              ) =>
                setTemperatureFilter(
                  event.target.value as
                    TemperatureFilter
                )
            }
            value={temperatureFilter}
          >

            <option value="all">
              Todas as temperaturas
            </option>

            <option value="hot">
              🔥 Quentes
            </option>

            <option value="warm">
              Mornos
            </option>

            <option value="cold">
              Frios
            </option>

          </select>


          <select
            aria-label="Filtrar por prioridade"
            className="crm-board-filter-v2"
            onChange={
              (
                event
              ) =>
                setPriorityFilter(
                  event.target.value as
                    PriorityFilter
                )
            }
            value={priorityFilter}
          >

            <option value="all">
              Todas as prioridades
            </option>

            <option value="high">
              Prioridade alta
            </option>

            <option value="medium">
              Prioridade média
            </option>

            <option value="low">
              Prioridade baixa
            </option>

          </select>


          {
            hasFilters
              ? (
                  <button
                    className="crm-clear-filters-v2"
                    onClick={
                      clearFilters
                    }
                    type="button"
                  >

                    <X size={15} />

                    Limpar

                  </button>
                )
              : null
          }


          <PipelineStageManager
            leads={localLeads}
            stages={stages}
          />


          <div className="crm-board-result-v2">

            <strong>
              {filteredLeads.length}
            </strong>

            <span>
              oportunidades
            </span>

            <i />

            <strong>
              {formatMoney(
                filteredValue
              )}
            </strong>

          </div>

        </div>


        {
          isMoving
            ? (
                <div className="crm-saving-v2">
                  Salvando alteração...
                </div>
              )
            : null
        }


        {
          hasFilters &&
          filteredLeads.length ===
            0
            ? (
                <div className="crm-filter-empty-v2">

                  <Search size={17} />

                  Nenhuma oportunidade corresponde aos filtros selecionados.

                </div>
              )
            : null
        }


        <div className="crm-kanban-navigation-v2">

          <SyncedHorizontalScroll
            alwaysShowTop
            className="crm-kanban-scroll-v2"
          >

            <div className="crm-kanban-v2">

          {
            stages.map(
              (
                stage
              ) => {

                const stageLeads =
                  filteredLeads.filter(
                    (
                      lead
                    ) =>
                      lead.stage_id ===
                      stage.id
                  );


                const stageValue =
                  stageLeads.reduce(
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


                const isDragTarget =
                  dragOverStageId ===
                  stage.id;


                const stageStyle = {
                  "--crm-stage-color":
                    stage.color ??
                    "#2f6df6",
                } as CSSProperties;


                return (
                  <section
                    className={[
                      "crm-stage-v2",
                      isDragTarget
                        ? "crm-stage-drag-over-v2"
                        : "",
                      stage.is_closed
                        ? "crm-stage-closed-v2"
                        : "",
                    ].join(
                      " "
                    )}
                    key={stage.id}
                    onDragEnter={
                      (
                        event
                      ) => {

                        event.preventDefault();

                        setDragOverStageId(
                          stage.id
                        );
                      }
                    }
                    onDragLeave={
                      (
                        event
                      ) => {

                        if (
                          event.currentTarget.contains(
                            event.relatedTarget as
                              Node
                          )
                        ) {
                          return;
                        }


                        setDragOverStageId(
                          null
                        );
                      }
                    }
                    onDragOver={
                      (
                        event
                      ) => {

                        event.preventDefault();

                        event.dataTransfer.dropEffect =
                          "move";

                        setDragOverStageId(
                          stage.id
                        );
                      }
                    }
                    onDrop={
                      (
                        event
                      ) => {

                        event.preventDefault();

                        handleDrop(
                          stage.id
                        );
                      }
                    }
                    style={stageStyle}
                  >

                    <div className="crm-stage-accent-v2" />


                    <header className="crm-stage-header-v2">

                      <div className="crm-stage-name-v2">

                        <span className="crm-stage-dot-v2" />

                        <strong>
                          {stage.name}
                        </strong>

                        <span className="crm-stage-count-v2">
                          {stageLeads.length}
                        </span>

                      </div>


                      <div className="crm-stage-total-v2">

                        <span>
                          Potencial
                        </span>

                        <strong>
                          {formatMoney(
                            stageValue
                          )}
                        </strong>

                      </div>

                    </header>


                    <div className="crm-stage-list-v2">

                      {
                        stageLeads.map(
                          (
                            lead
                          ) => {

                            const isDragging =
                              draggedLeadId ===
                              lead.id;


                            return (
                              <article
                                className={[
                                  "crm-lead-card-v2",
                                  isDragging
                                    ? "crm-lead-dragging-v2"
                                    : "",
                                ].join(
                                  " "
                                )}
                                draggable
                                key={lead.id}
                                onDragEnd={
                                  () => {

                                    setDraggedLeadId(
                                      null
                                    );

                                    setDragOverStageId(
                                      null
                                    );
                                  }
                                }
                                onDragStart={
                                  (
                                    event
                                  ) => {

                                    setDraggedLeadId(
                                      lead.id
                                    );

                                    event.dataTransfer.effectAllowed =
                                      "move";

                                    event.dataTransfer.setData(
                                      "text/plain",
                                      lead.id
                                    );
                                  }
                                }
                              >

                                <div className="crm-card-drag-v2">

                                  <GripVertical size={14} />

                                  arraste para mover

                                </div>


                                <div className="crm-card-header-v2">

                                  <div className="crm-company-avatar-v2">

                                    {
                                      companyInitials(
                                        lead.company_name
                                      )
                                    }

                                  </div>


                                  <div className="crm-company-title-v2">

                                    <Link
                                      href={`/crm/${lead.id}`}
                                    >
                                      {lead.company_name}
                                    </Link>

                                    <span>
                                      {
                                        lead.segment ??
                                        "Segmento não informado"
                                      }
                                    </span>

                                  </div>


                                  <div className="crm-card-actions-v2">

                                    <button
                                      aria-label={`Editar ${lead.company_name}`}
                                      onClick={
                                        () =>
                                          setEditingLead(
                                            lead
                                          )
                                      }
                                      title="Editar"
                                      type="button"
                                    >

                                      <Pencil size={14} />

                                    </button>


                                    <button
                                      aria-label={`Excluir ${lead.company_name}`}
                                      className="danger"
                                      onClick={
                                        () =>
                                          removeLead(
                                            lead
                                          )
                                      }
                                      title="Excluir"
                                      type="button"
                                    >

                                      <Trash2 size={14} />

                                    </button>

                                  </div>

                                </div>


                                <div className="crm-card-chips-v2">

                                  <span
                                    className={`crm-temperature-v2 ${lead.temperature}`}
                                  >

                                    {
                                      lead.temperature ===
                                        "hot"
                                        ? (
                                            <Flame size={12} />
                                          )
                                        : null
                                    }

                                    {
                                      getTemperatureLabel(
                                        lead.temperature
                                      )
                                    }

                                  </span>


                                  <span
                                    className={`crm-priority-v2 ${lead.priority}`}
                                  >

                                    Prioridade{" "}
                                    {
                                      getPriorityLabel(
                                        lead.priority
                                      )
                                    }

                                  </span>

                                </div>


                                <div className="crm-card-value-v2">

                                  <div>

                                    <CircleDollarSign size={15} />

                                    <span>
                                      Potencial mensal
                                    </span>

                                  </div>

                                  <strong>
                                    {
                                      formatMoney(
                                        Number(
                                          lead.estimated_value ??
                                          0
                                        )
                                      )
                                    }
                                  </strong>

                                </div>


                                {
                                  lead.decision_maker_name ||
                                  lead.city ||
                                  lead.state
                                    ? (
                                        <div className="crm-card-meta-v2">

                                          {
                                            lead.decision_maker_name
                                              ? (
                                                  <span>

                                                    <UserRound size={14} />

                                                    <b>
                                                      {lead.decision_maker_name}
                                                    </b>

                                                    {
                                                      lead.decision_maker_role
                                                        ? ` · ${lead.decision_maker_role}`
                                                        : ""
                                                    }

                                                  </span>
                                                )
                                              : null
                                          }


                                          {
                                            lead.city ||
                                            lead.state
                                              ? (
                                                  <span>

                                                    <MapPin size={14} />

                                                    {
                                                      [
                                                        lead.city,
                                                        lead.state,
                                                      ]
                                                        .filter(
                                                          Boolean
                                                        )
                                                        .join(
                                                          " - "
                                                        )
                                                    }

                                                  </span>
                                                )
                                              : null
                                          }

                                        </div>
                                      )
                                    : null
                                }


                                <div
                                  className={[
                                    "crm-next-action-v2",
                                    lead.next_action
                                      ? "has-action"
                                      : "",
                                  ].join(
                                    " "
                                  )}
                                >

                                  <CalendarClock size={16} />

                                  <div>

                                    <span>
                                      Próxima ação
                                    </span>

                                    <strong>
                                      {
                                        lead.next_action ??
                                        "Ainda não definida"
                                      }
                                    </strong>

                                  </div>

                                </div>


                                <div className="crm-card-footer-v2">

                                  <div className="crm-quick-actions-v2">

                                    {
                                      lead.whatsapp
                                        ? (
                                            <a
                                              href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                                              rel="noreferrer"
                                              target="_blank"
                                              title="WhatsApp"
                                            >
                                              <MessageCircle size={15} />
                                            </a>
                                          )
                                        : null
                                    }


                                    {
                                      lead.phone
                                        ? (
                                            <a
                                              href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
                                              title="Ligar"
                                            >
                                              <Phone size={15} />
                                            </a>
                                          )
                                        : null
                                    }


                                    {
                                      lead.email
                                        ? (
                                            <a
                                              href={`mailto:${lead.email}`}
                                              title="E-mail"
                                            >
                                              <Mail size={15} />
                                            </a>
                                          )
                                        : null
                                    }


                                    {
                                      lead.instagram
                                        ? (
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
                                              title="Instagram"
                                            >
                                              <Camera size={15} />
                                            </a>
                                          )
                                        : null
                                    }


                                    {
                                      lead.website
                                        ? (
                                            <a
                                              href={
                                                lead.website.startsWith(
                                                  "http"
                                                )
                                                  ? lead.website
                                                  : `https://${lead.website}`
                                              }
                                              rel="noreferrer"
                                              target="_blank"
                                              title="Site"
                                            >
                                              <Globe2 size={15} />
                                            </a>
                                          )
                                        : null
                                    }


                                    <Link
                                      href={`/crm/${lead.id}`}
                                      title="Abrir empresa"
                                    >
                                      <Building2 size={15} />
                                    </Link>

                                  </div>


                                  <select
                                    aria-label={`Mover ${lead.company_name} para outra etapa`}
                                    disabled={isMoving}
                                    onChange={
                                      (
                                        event
                                      ) => {

                                        const nextStageId =
                                          event.currentTarget.value;

                                        const previousStageId =
                                          lead.stage_id;


                                        persistLeadStage(
                                          lead.id,
                                          nextStageId,
                                          previousStageId
                                        );
                                      }
                                    }
                                    value={
                                      lead.stage_id ??
                                      ""
                                    }
                                  >

                                    <option
                                      disabled
                                      value=""
                                    >
                                      Etapa
                                    </option>

                                    {
                                      stages.map(
                                        (
                                          availableStage
                                        ) => (
                                          <option
                                            key={availableStage.id}
                                            value={availableStage.id}
                                          >
                                            {availableStage.name}
                                          </option>
                                        )
                                      )
                                    }

                                  </select>

                                </div>

                              </article>
                            );
                          }
                        )
                      }


                      {
                        stageLeads.length ===
                        0
                          ? (
                              <div
                                className={[
                                  "crm-empty-stage-v2",
                                  isDragTarget
                                    ? "active"
                                    : "",
                                ].join(
                                  " "
                                )}
                              >

                                <div>
                                  <Building2 size={18} />
                                </div>

                                <strong>
                                  {
                                    draggedLeadId
                                      ? "Solte aqui"
                                      : "Sem oportunidades"
                                  }
                                </strong>

                                <span>
                                  {
                                    draggedLeadId
                                      ? "Mova a oportunidade para esta etapa."
                                      : "Os novos cards aparecerão aqui."
                                  }
                                </span>

                              </div>
                            )
                          : null
                      }

                    </div>

                  </section>
                );
              }
            )
          }

            </div>

          </SyncedHorizontalScroll>

        </div>

      </section>


      {
        editingLead
          ? (
              <EditLeadForm
                lead={editingLead}
                onClose={
                  () =>
                    setEditingLead(
                      null
                    )
                }
              />
            )
          : null
      }

    </>
  );
}