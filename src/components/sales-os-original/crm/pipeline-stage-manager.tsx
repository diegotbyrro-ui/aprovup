"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  createPipelineStageAction,
  deletePipelineStageAction,
  reorderPipelineStagesAction,
  updatePipelineStageAction,
} from "@/app/(sales)/crm/actions/pipeline-stage-actions";

type Stage = {
  id: string;
  name: string;
  position: number;
  color: string | null;
  is_closed: boolean;
};

type LeadReference = {
  stage_id: string | null;
};

type Props = {
  stages: Stage[];
  leads: LeadReference[];
};

type Feedback = {
  type: "success" | "error";
  text: string;
} | null;

function sortStages(stages: Stage[]) {
  return [...stages].sort(
    (a, b) => Number(a.position) - Number(b.position)
  );
}

export function PipelineStageManager({
  stages,
  leads,
}: Props) {
  const router = useRouter();

  const [isOpen, setIsOpen] =
    useState(false);

  const [showCreate, setShowCreate] =
    useState(false);

  const [newName, setNewName] =
    useState("");

  const [newColor, setNewColor] =
    useState("#2f6df6");

  const [orderedStages, setOrderedStages] =
    useState<Stage[]>(() => sortStages(stages));

  const [draftNames, setDraftNames] =
    useState<Record<string, string>>({});

  const [draftColors, setDraftColors] =
    useState<Record<string, string>>({});

  const [deleteTargetId, setDeleteTargetId] =
    useState<string | null>(null);

  const [
    destinationStageId,
    setDestinationStageId,
  ] = useState("");

  const [feedback, setFeedback] =
    useState<Feedback>(null);

  const [isPending, startTransition] =
    useTransition();

  const leadCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const lead of leads) {
      if (!lead.stage_id) {
        continue;
      }

      counts[lead.stage_id] =
        (counts[lead.stage_id] ?? 0) + 1;
    }

    return counts;
  }, [leads]);

  useEffect(() => {
    const sorted = sortStages(stages);

    setOrderedStages(sorted);

    setDraftNames(
      Object.fromEntries(
        sorted.map((stage) => [
          stage.id,
          stage.name,
        ])
      )
    );

    setDraftColors(
      Object.fromEntries(
        sorted.map((stage) => [
          stage.id,
          stage.color ?? "#2f6df6",
        ])
      )
    );
  }, [stages]);

  useEffect(() => {
    if (!deleteTargetId) {
      setDestinationStageId("");
      return;
    }

    const fallbackStage = orderedStages.find(
      (stage) => stage.id !== deleteTargetId
    );

    setDestinationStageId(
      fallbackStage?.id ?? ""
    );
  }, [deleteTargetId, orderedStages]);

  const deleteTarget =
    orderedStages.find(
      (stage) => stage.id === deleteTargetId
    ) ?? null;

  const deleteTargetLeadCount =
    deleteTarget
      ? leadCounts[deleteTarget.id] ?? 0
      : 0;

  function openManager(create = false) {
    setFeedback(null);
    setShowCreate(create);
    setIsOpen(true);
  }

  function closeManager() {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setDeleteTargetId(null);
    setFeedback(null);
  }

  function handleCreate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result =
        await createPipelineStageAction({
          name: newName,
          color: newColor,
        });

      setFeedback({
        type: result.success
          ? "success"
          : "error",
        text: result.message,
      });

      if (!result.success) {
        return;
      }

      setNewName("");
      setNewColor("#2f6df6");
      setShowCreate(false);

      router.refresh();
    });
  }

  function saveStage(stageId: string) {
    if (isPending) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result =
        await updatePipelineStageAction(
          stageId,
          {
            name:
              draftNames[stageId] ?? "",
            color:
              draftColors[stageId] ??
              "#2f6df6",
          }
        );

      setFeedback({
        type: result.success
          ? "success"
          : "error",
        text: result.message,
      });

      if (result.success) {
        router.refresh();
      }
    });
  }

  function moveStage(
    index: number,
    direction: -1 | 1
  ) {
    const nextIndex =
      index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= orderedStages.length ||
      isPending
    ) {
      return;
    }

    const previousOrder =
      [...orderedStages];

    const nextOrder =
      [...orderedStages];

    const [stage] =
      nextOrder.splice(index, 1);

    nextOrder.splice(
      nextIndex,
      0,
      stage
    );

    setOrderedStages(nextOrder);
    setFeedback(null);

    startTransition(async () => {
      const result =
        await reorderPipelineStagesAction(
          nextOrder.map(
            (item) => item.id
          )
        );

      setFeedback({
        type: result.success
          ? "success"
          : "error",
        text: result.message,
      });

      if (!result.success) {
        setOrderedStages(previousOrder);
        return;
      }

      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget || isPending) {
      return;
    }

    if (
      deleteTargetLeadCount > 0 &&
      !destinationStageId
    ) {
      setFeedback({
        type: "error",
        text:
          "Escolha para onde as oportunidades serão movidas.",
      });

      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result =
        await deletePipelineStageAction(
          deleteTarget.id,
          deleteTargetLeadCount > 0
            ? destinationStageId
            : null
        );

      setFeedback({
        type: result.success
          ? "success"
          : "error",
        text: result.message,
      });

      if (!result.success) {
        return;
      }

      setDeleteTargetId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="crm-stage-manager-actions-v2">
        <button
          className="crm-stage-new-button-v2"
          onClick={() => openManager(true)}
          type="button"
        >
          <Plus size={16} />
          Nova coluna
        </button>

        <button
          className="crm-stage-manage-button-v2"
          onClick={() => openManager(false)}
          type="button"
        >
          <Settings2 size={16} />
          Colunas
        </button>
      </div>

      {isOpen ? (
        <div
          className="crm-stage-manager-backdrop-v2"
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              closeManager();
            }
          }}
          role="presentation"
        >
          <section
            aria-label="Gerenciar colunas da pipeline"
            aria-modal="true"
            className="crm-stage-manager-modal-v2"
            role="dialog"
          >
            <header className="crm-stage-manager-header-v2">
              <div>
                <span>
                  Pipeline comercial
                </span>

                <h2>
                  Gerenciar colunas
                </h2>

                <p>
                  Crie, renomeie, organize e personalize
                  as etapas do seu processo comercial.
                </p>
              </div>

              <button
                aria-label="Fechar"
                className="crm-stage-manager-close-v2"
                disabled={isPending}
                onClick={closeManager}
                type="button"
              >
                <X size={19} />
              </button>
            </header>

            <div className="crm-stage-manager-body-v2">
              <div className="crm-stage-create-head-v2">
                <div>
                  <strong>
                    Etapas da pipeline
                  </strong>

                  <span>
                    {orderedStages.length}{" "}
                    {orderedStages.length === 1
                      ? "coluna"
                      : "colunas"}
                  </span>
                </div>

                {!showCreate ? (
                  <button
                    className="crm-stage-inline-add-v2"
                    disabled={isPending}
                    onClick={() =>
                      setShowCreate(true)
                    }
                    type="button"
                  >
                    <Plus size={15} />
                    Adicionar coluna
                  </button>
                ) : null}
              </div>

              {showCreate ? (
                <form
                  className="crm-stage-create-form-v2"
                  onSubmit={handleCreate}
                >
                  <div className="crm-stage-create-title-v2">
                    <div>
                      <Plus size={16} />
                    </div>

                    <div>
                      <strong>
                        Nova coluna
                      </strong>

                      <span>
                        Adicione uma nova etapa ao final da pipeline.
                      </span>
                    </div>
                  </div>

                  <div className="crm-stage-create-fields-v2">
                    <label>
                      <span>Nome</span>

                      <input
                        autoFocus
                        disabled={isPending}
                        maxLength={80}
                        onChange={(event) =>
                          setNewName(
                            event.target.value
                          )
                        }
                        placeholder="Ex.: Reunião agendada"
                        value={newName}
                      />
                    </label>

                    <label className="crm-stage-color-field-v2">
                      <span>Cor</span>

                      <input
                        aria-label="Cor da nova coluna"
                        disabled={isPending}
                        onChange={(event) =>
                          setNewColor(
                            event.target.value
                          )
                        }
                        type="color"
                        value={newColor}
                      />
                    </label>

                    <button
                      className="crm-stage-create-submit-v2"
                      disabled={
                        isPending ||
                        newName.trim().length < 2
                      }
                      type="submit"
                    >
                      {isPending ? (
                        <Loader2
                          className="crm-spin-v2"
                          size={16}
                        />
                      ) : (
                        <Check size={16} />
                      )}

                      Criar
                    </button>

                    <button
                      className="crm-stage-create-cancel-v2"
                      disabled={isPending}
                      onClick={() => {
                        setShowCreate(false);
                        setNewName("");
                      }}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="crm-stage-editor-list-v2">
                {orderedStages.map(
                  (stage, index) => {
                    const count =
                      leadCounts[stage.id] ??
                      0;

                    return (
                      <article
                        className="crm-stage-editor-row-v2"
                        key={stage.id}
                      >
                        <div className="crm-stage-order-v2">
                          <button
                            aria-label={`Mover ${stage.name} para a esquerda`}
                            disabled={
                              isPending ||
                              index === 0
                            }
                            onClick={() =>
                              moveStage(
                                index,
                                -1
                              )
                            }
                            title="Mover para a esquerda"
                            type="button"
                          >
                            <ChevronUp
                              size={16}
                            />
                          </button>

                          <button
                            aria-label={`Mover ${stage.name} para a direita`}
                            disabled={
                              isPending ||
                              index ===
                                orderedStages.length -
                                  1
                            }
                            onClick={() =>
                              moveStage(
                                index,
                                1
                              )
                            }
                            title="Mover para a direita"
                            type="button"
                          >
                            <ChevronDown
                              size={16}
                            />
                          </button>
                        </div>

                        <label className="crm-stage-editor-color-v2">
                          <input
                            aria-label={`Cor da coluna ${stage.name}`}
                            disabled={isPending}
                            onChange={(
                              event
                            ) =>
                              setDraftColors(
                                (current) => ({
                                  ...current,
                                  [stage.id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            type="color"
                            value={
                              draftColors[
                                stage.id
                              ] ??
                              "#2f6df6"
                            }
                          />
                        </label>

                        <div className="crm-stage-editor-main-v2">
                          <input
                            aria-label={`Nome da coluna ${stage.name}`}
                            disabled={isPending}
                            maxLength={80}
                            onChange={(
                              event
                            ) =>
                              setDraftNames(
                                (current) => ({
                                  ...current,
                                  [stage.id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            value={
                              draftNames[
                                stage.id
                              ] ??
                              stage.name
                            }
                          />

                          <div>
                            <span>
                              {count}{" "}
                              {count === 1
                                ? "oportunidade"
                                : "oportunidades"}
                            </span>

                            {stage.is_closed ? (
                              <b>
                                Etapa fechada
                              </b>
                            ) : null}
                          </div>
                        </div>

                        <button
                          className="crm-stage-save-v2"
                          disabled={isPending}
                          onClick={() =>
                            saveStage(stage.id)
                          }
                          title="Salvar nome e cor"
                          type="button"
                        >
                          {isPending ? (
                            <Loader2
                              className="crm-spin-v2"
                              size={16}
                            />
                          ) : (
                            <Check size={16} />
                          )}

                          Salvar
                        </button>

                        <button
                          aria-label={`Excluir coluna ${stage.name}`}
                          className="crm-stage-delete-v2"
                          disabled={
                            isPending ||
                            orderedStages.length <=
                              1
                          }
                          onClick={() =>
                            setDeleteTargetId(
                              stage.id
                            )
                          }
                          title={
                            orderedStages.length <=
                            1
                              ? "A pipeline precisa manter ao menos uma coluna"
                              : "Excluir coluna"
                          }
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    );
                  }
                )}
              </div>

              {feedback ? (
                <div
                  className={`crm-stage-feedback-v2 ${feedback.type}`}
                >
                  {feedback.text}
                </div>
              ) : null}
            </div>

            <footer className="crm-stage-manager-footer-v2">
              <span>
                A ordem definida aqui também será usada na pipeline.
              </span>

              <button
                disabled={isPending}
                onClick={closeManager}
                type="button"
              >
                Concluir
              </button>
            </footer>

            {deleteTarget ? (
              <div className="crm-stage-delete-layer-v2">
                <div className="crm-stage-delete-dialog-v2">
                  <div className="crm-stage-delete-icon-v2">
                    <Trash2 size={20} />
                  </div>

                  <div>
                    <span>
                      Excluir coluna
                    </span>

                    <h3>
                      {deleteTarget.name}
                    </h3>

                    {deleteTargetLeadCount > 0 ? (
                      <p>
                        Esta coluna possui{" "}
                        <strong>
                          {deleteTargetLeadCount}
                        </strong>{" "}
                        {deleteTargetLeadCount ===
                        1
                          ? "oportunidade"
                          : "oportunidades"}.
                        Escolha para qual etapa
                        elas devem ser movidas antes
                        da exclusão.
                      </p>
                    ) : (
                      <p>
                        Esta coluna está vazia.
                        Confirme para removê-la da
                        pipeline.
                      </p>
                    )}
                  </div>

                  {deleteTargetLeadCount > 0 ? (
                    <label className="crm-stage-delete-destination-v2">
                      <span>
                        Mover oportunidades para
                      </span>

                      <select
                        disabled={isPending}
                        onChange={(event) =>
                          setDestinationStageId(
                            event.target.value
                          )
                        }
                        value={
                          destinationStageId
                        }
                      >
                        {orderedStages
                          .filter(
                            (stage) =>
                              stage.id !==
                              deleteTarget.id
                          )
                          .map((stage) => (
                            <option
                              key={stage.id}
                              value={stage.id}
                            >
                              {stage.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : null}

                  <div className="crm-stage-delete-actions-v2">
                    <button
                      className="secondary"
                      disabled={isPending}
                      onClick={() =>
                        setDeleteTargetId(
                          null
                        )
                      }
                      type="button"
                    >
                      Cancelar
                    </button>

                    <button
                      className="danger"
                      disabled={isPending}
                      onClick={confirmDelete}
                      type="button"
                    >
                      {isPending ? (
                        <Loader2
                          className="crm-spin-v2"
                          size={16}
                        />
                      ) : (
                        <Trash2 size={16} />
                      )}

                      Excluir coluna
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}