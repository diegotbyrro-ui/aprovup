"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";


type EditorialCalendarContent = {
  id: string;
  title: string;
  clientName: string;
  dateKey: string;
  format: string | null;
  area: string;
  priority: string;
  status: string;
};


type DesktopEditorialCalendarProps = {
  month: number;
  year: number;
  selectedClient: string;
  contents: EditorialCalendarContent[];
};


const weekDays = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];


const priorityLabels:
  Record<string, string> = {
    BAIXA:
      "Baixa",

    MEDIA:
      "Média",

    ALTA:
      "Alta",

    URGENTE:
      "Urgente",
  };


const priorityClasses:
  Record<string, string> = {
    BAIXA:
      "bg-slate-100 text-slate-600 border-slate-200",

    MEDIA:
      "bg-blue-50 text-blue-700 border-blue-100",

    ALTA:
      "bg-orange-100 text-orange-700 border-orange-200",

    URGENTE:
      "bg-red-100 text-red-700 border-red-200",
  };


const areaLabels:
  Record<string, string> = {
    GERAL:
      "Geral",

    SOCIAL_DESIGN:
      "Social",

    DESIGN:
      "Design",

    AUDIOVISUAL:
      "Audiovisual",

    FILMMAKER:
      "Filmmaker",
  };


function pad(
  value: number
) {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}


function makeDateKey(
  year: number,
  month: number,
  day: number
) {
  return [
    year,
    pad(
      month + 1
    ),
    pad(
      day
    ),
  ].join(
    "-"
  );
}


function parseDateKey(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split(
        "-"
      )
      .map(
        Number
      );

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0
  );
}


function isPastDate(
  dateKey: string
) {
  const target =
    parseDateKey(
      dateKey
    );

  target.setHours(
    0,
    0,
    0,
    0
  );

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return target <
    today;
}


function isTodayDate(
  dateKey: string
) {
  const target =
    parseDateKey(
      dateKey
    );

  const today =
    new Date();

  return (
    target.getFullYear() ===
      today.getFullYear() &&
    target.getMonth() ===
      today.getMonth() &&
    target.getDate() ===
      today.getDate()
  );
}


function formatPtBr(
  dateKey: string
) {
  return parseDateKey(
    dateKey
  ).toLocaleDateString(
    "pt-BR"
  );
}


export function DesktopEditorialCalendar({
  month,
  year,
  selectedClient,
  contents,
}: DesktopEditorialCalendarProps) {
  const router =
    useRouter();


  const [
    localContents,
    setLocalContents,
  ] =
    useState(
      contents
    );


  const [
    draggingId,
    setDraggingId,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    dropTarget,
    setDropTarget,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    savingId,
    setSavingId,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    feedback,
    setFeedback,
  ] =
    useState<{
      type:
        "success" |
        "error" |
        "loading";

      message:
        string;
    } | null>(
      null
    );


  useEffect(
    () => {
      setLocalContents(
        contents
      );
    },
    [
      contents,
    ]
  );


  const numberOfDays =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  const firstDayOffset =
    new Date(
      year,
      month,
      1,
      12,
      0,
      0
    ).getDay();


  const calendarCells =
    useMemo(
      () => {
        const cells:
          Array<
            number |
            null
          > = [];

        for (
          let index = 0;
          index <
          firstDayOffset;
          index++
        ) {
          cells.push(
            null
          );
        }

        for (
          let day = 1;
          day <=
          numberOfDays;
          day++
        ) {
          cells.push(
            day
          );
        }

        while (
          cells.length %
            7 !==
          0
        ) {
          cells.push(
            null
          );
        }

        return cells;
      },
      [
        firstDayOffset,
        numberOfDays,
      ]
    );


  const contentsByDay =
    useMemo(
      () => {
        const grouped =
          new Map<
            string,
            EditorialCalendarContent[]
          >();

        for (
          const content
          of localContents
        ) {
          if (
            !content.dateKey
          ) {
            continue;
          }

          const current =
            grouped.get(
              content.dateKey
            ) ||
            [];

          current.push(
            content
          );

          grouped.set(
            content.dateKey,
            current
          );
        }

        return grouped;
      },
      [
        localContents,
      ]
    );


  function handleDragStart(
    event:
      React.DragEvent<HTMLElement>,
    contentId:
      string
  ) {
    if (
      savingId
    ) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      contentId
    );

    setDraggingId(
      contentId
    );

    setFeedback(
      null
    );
  }


  function handleDragEnd() {
    setDraggingId(
      null
    );

    setDropTarget(
      null
    );
  }


  async function moveContent(
    contentId:
      string,
    targetDate:
      string
  ) {
    const content =
      localContents.find(
        (
          item
        ) =>
          item.id ===
          contentId
      );

    if (
      !content ||
      content.dateKey ===
        targetDate
    ) {
      setDraggingId(
        null
      );

      setDropTarget(
        null
      );

      return;
    }


    const previousDate =
      content.dateKey;


    setSavingId(
      contentId
    );

    setFeedback({
      type:
        "loading",

      message:
        `Movendo "${content.title}" para ${formatPtBr(
          targetDate
        )}...`,
    });


    setLocalContents(
      (
        current
      ) =>
        current.map(
          (
            item
          ) =>
            item.id ===
            contentId
              ? {
                  ...item,
                  dateKey:
                    targetDate,
                }
              : item
        )
    );


    try {
      const response =
        await fetch(
          `/api/conteudos/${contentId}/planned-date`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                plannedDate:
                  targetDate,
              }),
          }
        );


      const result =
        await response
          .json()
          .catch(
            () => ({
              ok:
                false,

              message:
                "Resposta inválida do servidor.",
            })
          );


      if (
        !response.ok ||
        !result?.ok
      ) {
        throw new Error(
          result?.message ||
          "Não foi possível alterar a data."
        );
      }


      setFeedback({
        type:
          "success",

        message:
          `"${content.title}" movido para ${formatPtBr(
            targetDate
          )}.`,
      });


      router.refresh();
    }
    catch (
      error
    ) {
      setLocalContents(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              contentId
                ? {
                    ...item,
                    dateKey:
                      previousDate,
                  }
                : item
          )
      );


      setFeedback({
        type:
          "error",

        message:
          error instanceof
            Error
            ? error.message
            : "Não foi possível alterar a data.",
      });
    }
    finally {
      setSavingId(
        null
      );

      setDraggingId(
        null
      );

      setDropTarget(
        null
      );
    }
  }


  function handleDrop(
    event:
      React.DragEvent<HTMLDivElement>,
    targetDate:
      string
  ) {
    event.preventDefault();

    const contentId =
      event.dataTransfer.getData(
        "text/plain"
      ) ||
      draggingId;

    if (
      !contentId
    ) {
      return;
    }

    void moveContent(
      contentId,
      targetDate
    );
  }


  return (
    <div className="mt-5 hidden lg:block">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <div>
          <p className="text-xs font-bold text-blue-800">
            Calendário com arrastar e soltar
          </p>

          <p className="mt-0.5 text-[11px] text-blue-600">
            Segure um conteúdo, arraste para outro dia e solte para alterar a data prevista.
          </p>
        </div>

        {feedback ? (
          <span
            className={[
              "rounded-full",
              "px-3",
              "py-1.5",
              "text-[10px]",
              "font-bold",
              feedback.type ===
              "success"
                ? "bg-emerald-100 text-emerald-700"
                : feedback.type ===
                    "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-white text-blue-700",
            ].join(
              " "
            )}
          >
            {feedback.message}
          </span>
        ) : null}
      </div>


      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(
          (
            day
          ) => (
            <div
              key={day}
              className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              {day}
            </div>
          )
        )}


        {calendarCells.map(
          (
            day,
            index
          ) => {
            if (
              !day
            ) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-44 rounded-xl border border-dashed border-slate-200 bg-slate-50/70"
                />
              );
            }


            const dateKey =
              makeDateKey(
                year,
                month,
                day
              );


            const dayContents =
              contentsByDay.get(
                dateKey
              ) ||
              [];


            const todayDay =
              isTodayDate(
                dateKey
              );


            const pastDay =
              isPastDate(
                dateKey
              );


            const isDropTarget =
              dropTarget ===
              dateKey &&
              Boolean(
                draggingId
              );


            return (
              <div
                key={dateKey}
                onDragOver={(
                  event
                ) => {
                  if (
                    !draggingId
                  ) {
                    return;
                  }

                  event.preventDefault();

                  event.dataTransfer.dropEffect =
                    "move";

                  setDropTarget(
                    dateKey
                  );
                }}
                onDragEnter={(
                  event
                ) => {
                  if (
                    !draggingId
                  ) {
                    return;
                  }

                  event.preventDefault();

                  setDropTarget(
                    dateKey
                  );
                }}
                onDragLeave={(
                  event
                ) => {
                  const nextTarget =
                    event.relatedTarget as
                      Node |
                      null;

                  if (
                    nextTarget &&
                    event.currentTarget.contains(
                      nextTarget
                    )
                  ) {
                    return;
                  }

                  if (
                    dropTarget ===
                    dateKey
                  ) {
                    setDropTarget(
                      null
                    );
                  }
                }}
                onDrop={(
                  event
                ) =>
                  handleDrop(
                    event,
                    dateKey
                  )
                }
                className={[
                  "min-h-44",
                  "rounded-xl",
                  "border",
                  "p-3",
                  "transition-all",
                  "duration-150",
                  isDropTarget
                    ? "border-blue-500 bg-blue-100 ring-2 ring-blue-200"
                    : todayDay
                      ? "border-blue-300 bg-blue-50"
                      : pastDay
                        ? "border-slate-200 bg-slate-50"
                        : "border-slate-200 bg-white",
                ].join(
                  " "
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={[
                      "flex",
                      "h-8",
                      "w-8",
                      "items-center",
                      "justify-center",
                      "rounded-full",
                      "text-sm",
                      "font-bold",
                      todayDay
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700",
                    ].join(
                      " "
                    )}
                  >
                    {day}
                  </div>

                  <Link
                    href={
                      selectedClient !==
                      "TODOS"
                        ? `/conteudos/novo?cliente=${selectedClient}&data=${dateKey}`
                        : "/clientes"
                    }
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100"
                  >
                    +
                  </Link>
                </div>


                <div className="space-y-2">
                  {dayContents.length ===
                  0 ? (
                    <p
                      className={[
                        "rounded-lg",
                        "border",
                        "border-dashed",
                        "px-2",
                        "py-3",
                        "text-center",
                        "text-[10px]",
                        isDropTarget
                          ? "border-blue-300 text-blue-600"
                          : "border-transparent text-slate-400",
                      ].join(
                        " "
                      )}
                    >
                      {isDropTarget
                        ? "Solte aqui"
                        : "Sem conteúdo"}
                    </p>
                  ) : (
                    dayContents.map(
                      (
                        content
                      ) => {
                        const priority =
                          content.priority ||
                          "MEDIA";

                        const area =
                          content.area ||
                          "GERAL";

                        const late =
                          pastDay &&
                          ![
                            "PUBLICADO_MANUALMENTE",
                            "ARQUIVADO",
                          ].includes(
                            content.status
                          );

                        const isDragging =
                          draggingId ===
                          content.id;

                        const isSaving =
                          savingId ===
                          content.id;

                        return (
                          <Link
                            key={
                              content.id
                            }
                            href={`/conteudos/${content.id}`}
                            draggable={
                              !savingId
                            }
                            onDragStart={(
                              event
                            ) =>
                              handleDragStart(
                                event,
                                content.id
                              )
                            }
                            onDragEnd={
                              handleDragEnd
                            }
                            title="Arraste para outro dia ou clique para abrir"
                            className={[
                              "block",
                              "cursor-grab",
                              "rounded-lg",
                              "border",
                              "p-2",
                              "text-xs",
                              "transition",
                              "hover:shadow-sm",
                              "active:cursor-grabbing",
                              isDragging
                                ? "scale-[0.98] opacity-40"
                                : "",
                              isSaving
                                ? "pointer-events-none opacity-60"
                                : "",
                              late
                                ? "border-red-200 bg-red-50"
                                : priority ===
                                    "URGENTE"
                                  ? "border-red-200 bg-white"
                                  : priority ===
                                      "ALTA"
                                    ? "border-orange-200 bg-white"
                                    : "border-slate-100 bg-white",
                            ].join(
                              " "
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-[11px] font-black text-slate-300"
                              >
                                ⋮⋮
                              </span>

                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 font-bold text-slate-900">
                                  {
                                    content.title
                                  }
                                </p>

                                <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                                  {
                                    content.clientName ||
                                    "Cliente não informado"
                                  }
                                </p>

                                <div className="mt-2 flex flex-wrap gap-1">
                                  <span
                                    className={[
                                      "rounded-full",
                                      "border",
                                      "px-1.5",
                                      "py-0.5",
                                      "text-[9px]",
                                      "font-bold",
                                      "uppercase",
                                      priorityClasses[
                                        priority
                                      ] ||
                                        priorityClasses.MEDIA,
                                    ].join(
                                      " "
                                    )}
                                  >
                                    {
                                      priorityLabels[
                                        priority
                                      ] ||
                                      priority
                                    }
                                  </span>

                                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                                    {
                                      areaLabels[
                                        area
                                      ] ||
                                      area
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
