import Link from "next/link";

import type {
  Prisma,
} from "@prisma/client";

import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  LayoutGrid,
  Palette,
  Send,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Video,
} from "lucide-react";

import {
  prisma,
} from "@/lib/prisma";

import {
  requireCurrentUser,
} from "@/lib/auth";


type ContentWithClient =
  Prisma.ContentGetPayload<{
    include: {
      client: true;
    };
  }>;


type ClientWithCount =
  Prisma.ClientGetPayload<{
    include: {
      _count: {
        select: {
          contents: true;
        };
      };
    };
  }>;


const DAY =
  1000 *
  60 *
  60 *
  24;


const planningStatuses = [
  "IDEIA",
  "PLANEJAMENTO",
  "APROVADO",
];


const productionStatuses = [
  "DESIGN_FAZENDO",
  "FILMMAKER_PRE_PRODUCAO",
  "FILMMAKER_AGENDAMENTO",
  "FILMMAKER_GRAVANDO",
  "FILMMAKER_EDICAO",
];


const reviewStatuses = [
  "DESIGN_ANALISE",
  "DESIGN_DUVIDA",
  "FILMMAKER_ANALISE",
  "FILMMAKER_DUVIDA_SOCIAL",
  "ALTERACAO_SOLICITADA",
];


const completedStatuses = [
  "PRONTO_PARA_POSTAR",
  "PUBLICADO_MANUALMENTE",
];


const unresolvedStatuses = [
  ...planningStatuses,
  ...productionStatuses,
  ...reviewStatuses,
  "ENVIADO_CLIENTE",
];


const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];


const weekDays = [
  "SEG",
  "TER",
  "QUA",
  "QUI",
  "SEX",
  "SÁB",
  "DOM",
];


function startOfDay(
  value:
    Date
) {
  const copy =
    new Date(
      value
    );

  copy.setHours(
    0,
    0,
    0,
    0
  );

  return copy;
}


function cleanName(
  value:
    string
) {
  return value.replace(
    /^\[DEMO\]\s*/i,
    ""
  );
}


function cleanTitle(
  value:
    string
) {
  return value.replace(
    /^\[DEMO\]\s*/i,
    ""
  );
}


function isDemo(
  value:
    string
) {
  return /^\[DEMO\]/i.test(
    value
  );
}


function formatShortDate(
  value:
    Date
    | null
) {
  if (!value) {
    return "Sem data";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "2-digit",
    }
  );
}


function relativeDate(
  value:
    Date
    | null,
  today:
    Date
) {
  if (!value) {
    return "Sem data";
  }

  const target =
    startOfDay(
      new Date(
        value
      )
    );

  const diff =
    Math.round(
      (
        target.getTime() -
        today.getTime()
      ) /
      DAY
    );

  if (diff < 0) {
    return `${Math.abs(diff)}d atrasado`;
  }

  if (diff === 0) {
    return "Hoje";
  }

  if (diff === 1) {
    return "Amanhã";
  }

  return `Em ${diff} dias`;
}


function percentageDelta(
  current:
    number,
  previous:
    number
) {
  if (
    previous === 0
  ) {
    if (
      current === 0
    ) {
      return 0;
    }

    return 100;
  }

  return Math.round(
    (
      (
        current -
        previous
      ) /
      previous
    ) *
      100
  );
}


function monthsActive(
  createdAt:
    Date,
  now:
    Date
) {
  const months =
    (
      now.getFullYear() -
      createdAt.getFullYear()
    ) *
      12 +
    (
      now.getMonth() -
      createdAt.getMonth()
    );

  return Math.max(
    1,
    months
  );
}


function statusLabel(
  status:
    string
) {
  const labels:
    Record<
      string,
      string
    > = {
      IDEIA:
        "Briefing",

      PLANEJAMENTO:
        "Planejamento",

      APROVADO:
        "Liberado",

      DESIGN_FAZENDO:
        "Em design",

      DESIGN_ANALISE:
        "Em revisão",

      DESIGN_DUVIDA:
        "Dúvida",

      FILMMAKER_PRE_PRODUCAO:
        "Pré-produção",

      FILMMAKER_AGENDAMENTO:
        "Agendamento",

      FILMMAKER_GRAVANDO:
        "Gravando",

      FILMMAKER_EDICAO:
        "Em edição",

      FILMMAKER_ANALISE:
        "Em revisão",

      FILMMAKER_DUVIDA_SOCIAL:
        "Dúvida",

      ENVIADO_CLIENTE:
        "Aprovação",

      ALTERACAO_SOLICITADA:
        "Em ajuste",

      PRONTO_PARA_POSTAR:
        "Concluído",

      PUBLICADO_MANUALMENTE:
        "Publicado",
    };

  return (
    labels[
      status
    ] ||
    status
      .replaceAll(
        "_",
        " "
      )
      .toLowerCase()
  );
}


function progressForStatus(
  status:
    string
) {
  const progress:
    Record<
      string,
      number
    > = {
      IDEIA:
        10,

      PLANEJAMENTO:
        15,

      APROVADO:
        25,

      DESIGN_FAZENDO:
        40,

      DESIGN_ANALISE:
        55,

      DESIGN_DUVIDA:
        48,

      FILMMAKER_PRE_PRODUCAO:
        35,

      FILMMAKER_AGENDAMENTO:
        45,

      FILMMAKER_GRAVANDO:
        55,

      FILMMAKER_EDICAO:
        72,

      FILMMAKER_ANALISE:
        82,

      FILMMAKER_DUVIDA_SOCIAL:
        68,

      ENVIADO_CLIENTE:
        92,

      ALTERACAO_SOLICITADA:
        84,

      PRONTO_PARA_POSTAR:
        100,

      PUBLICADO_MANUALMENTE:
        100,
    };

  return (
    progress[
      status
    ] ||
    20
  );
}


function approvalStage(
  status:
    string
) {
  if (
    status ===
      "ENVIADO_CLIENTE" ||
    status ===
      "ALTERACAO_SOLICITADA"
  ) {
    return "2ª Etapa";
  }

  if (
    status ===
      "DESIGN_ANALISE" ||
    status ===
      "FILMMAKER_ANALISE"
  ) {
    return "Revisão";
  }

  return "1ª Etapa";
}


function KpiCard({
  label,
  value,
  delta,
  helper,
  icon,
  tone,
  invertTrend = false,
}: {
  label:
    string;

  value:
    number;

  delta:
    number;

  helper:
    string;

  icon:
    React.ReactNode;

  tone:
    "violet"
    | "blue"
    | "orange"
    | "green";

  invertTrend?:
    boolean;
}) {
  const iconTones = {
    violet:
      "bg-violet-50 text-violet-600",

    blue:
      "bg-blue-50 text-blue-600",

    orange:
      "bg-orange-50 text-orange-600",

    green:
      "bg-emerald-50 text-emerald-600",
  };


  const good =
    invertTrend
      ? delta <= 0
      : delta >= 0;


  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold text-slate-700">
            {label}
          </p>

          <div className="mt-2 flex items-end gap-2">
            <strong className="text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </strong>

            <span
              className={[
                "mb-1",
                "inline-flex",
                "items-center",
                "gap-0.5",
                "text-[11px]",
                "font-bold",
                good
                  ? "text-emerald-600"
                  : "text-red-500",
              ].join(" ")}
            >
              {delta >=
              0 ? (
                <TrendingUp
                  size={10}
                />
              ) : (
                <TrendingDown
                  size={10}
                />
              )}

              {delta >=
              0
                ? "+"
                : ""}
              {delta}%
            </span>
          </div>

          <p className="mt-1 text-[11px] text-slate-400">
            {helper}
          </p>
        </div>

        <div
          className={[
            "flex",
            "h-10",
            "w-10",
            "items-center",
            "justify-center",
            "rounded-xl",
            iconTones[
              tone
            ],
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}


function Thumb({
  content,
}: {
  content:
    ContentWithClient;
}) {
  const src =
    content.coverImageUrl ||
    content.finalCoverUrl;

  if (src) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
      {content.area ===
      "FILMMAKER" ? (
        <Video
          size={15}
        />
      ) : (
        <FileText
          size={15}
        />
      )}
    </div>
  );
}


function ClientAvatar({
  client,
}: {
  client:
    ClientWithCount;
}) {
  if (
    client.logoUrl
  ) {
    return (
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        <img
          src={
            client.logoUrl
          }
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const initials =
    cleanName(
      client.name
    )
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (
          item
        ) =>
          item[0]
      )
      .join("")
      .toUpperCase();

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white">
      {initials}
    </div>
  );
}


export default async function OperacaoPage() {
  await requireCurrentUser();

  const now =
    new Date();

  const today =
    startOfDay(
      now
    );

  const monthStart =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

  const nextMonthStart =
    new Date(
      now.getFullYear(),
      now.getMonth() +
        1,
      1
    );

  const previousMonthStart =
    new Date(
      now.getFullYear(),
      now.getMonth() -
        1,
      1
    );


  const [
    monthContents,
    previousMonthContents,
    nextSchedule,
    approvalQueue,
    allClients,
    approvalsThisMonth,
    approvalsPreviousMonth,
    briefingCount,
    productionCount,
    reviewCount,
    clientApprovalCount,
    concludedCount,
    projectContents,
  ] =
    await prisma.$transaction([
      prisma.content.findMany({
        where: {
          plannedDate: {
            gte:
              monthStart,

            lt:
              nextMonthStart,
          },
        },

        include: {
          client:
            true,
        },

        orderBy: {
          plannedDate:
            "asc",
        },
      }),


      prisma.content.findMany({
        where: {
          plannedDate: {
            gte:
              previousMonthStart,

            lt:
              monthStart,
          },
        },

        include: {
          client:
            true,
        },
      }),


      prisma.content.findMany({
        where: {
          plannedDate: {
            gte:
              today,
          },

          status: {
            notIn: [
              "PUBLICADO_MANUALMENTE",
              "ARQUIVADO",
            ],
          },
        },

        include: {
          client:
            true,
        },

        orderBy: {
          plannedDate:
            "asc",
        },

        take:
          3,
      }),


      prisma.content.findMany({
        where: {
          status: {
            in: [
              "DESIGN_ANALISE",
              "FILMMAKER_ANALISE",
              "ENVIADO_CLIENTE",
              "ALTERACAO_SOLICITADA",
            ],
          },
        },

        include: {
          client:
            true,
        },

        orderBy: [
          {
            plannedDate:
              "asc",
          },
          {
            updatedAt:
              "desc",
          },
        ],

        take:
          4,
      }),


      prisma.client.findMany({
        include: {
          _count: {
            select: {
              contents:
                true,
            },
          },
        },

        orderBy: {
          updatedAt:
            "desc",
        },
      }),


      prisma.approval.count({
        where: {
          status:
            "APROVADO",

          updatedAt: {
            gte:
              monthStart,

            lt:
              nextMonthStart,
          },
        },
      }),


      prisma.approval.count({
        where: {
          status:
            "APROVADO",

          updatedAt: {
            gte:
              previousMonthStart,

            lt:
              monthStart,
          },
        },
      }),


      prisma.content.count({
        where: {
          status: {
            in:
              planningStatuses,
          },
        },
      }),


      prisma.content.count({
        where: {
          status: {
            in:
              productionStatuses,
          },
        },
      }),


      prisma.content.count({
        where: {
          status: {
            in:
              reviewStatuses,
          },
        },
      }),


      prisma.content.count({
        where: {
          status:
            "ENVIADO_CLIENTE",
        },
      }),


      prisma.content.count({
        where: {
          status: {
            in:
              completedStatuses,
          },
        },
      }),


      prisma.content.findMany({
        where: {
          status: {
            in:
              unresolvedStatuses,
          },
        },

        include: {
          client:
            true,
        },

        orderBy: [
          {
            updatedAt:
              "desc",
          },
          {
            plannedDate:
              "asc",
          },
        ],

        take:
          3,
      }),
    ]);


  const currentClientIds =
    new Set(
      monthContents.map(
        (
          content
        ) =>
          content.clientId
      )
    );


  const previousClientIds =
    new Set(
      previousMonthContents.map(
        (
          content
        ) =>
          content.clientId
      )
    );


  const currentPending =
    monthContents.filter(
      (
        content
      ) =>
        Boolean(
          content.plannedDate
        ) &&
        new Date(
          content.plannedDate as Date
        ) <
          today &&
        unresolvedStatuses.includes(
          content.status
        )
    ).length;


  const previousPending =
    previousMonthContents.filter(
      (
        content
      ) =>
        unresolvedStatuses.includes(
          content.status
        )
    ).length;


  const contentDelta =
    percentageDelta(
      monthContents.length,
      previousMonthContents.length
    );


  const clientsDelta =
    percentageDelta(
      currentClientIds.size,
      previousClientIds.size
    );


  const pendingDelta =
    percentageDelta(
      currentPending,
      previousPending
    );


  const approvalDelta =
    percentageDelta(
      approvalsThisMonth,
      approvalsPreviousMonth
    );


  const contentsByClient =
    new Map<
      string,
      number
    >();


  for (
    const content
    of monthContents
  ) {
    contentsByClient.set(
      content.clientId,
      (
        contentsByClient.get(
          content.clientId
        ) ||
        0
      ) +
        1
    );
  }


  const focusClients =
    [...allClients]
      .sort(
        (
          a,
          b
        ) =>
          (
            contentsByClient.get(
              b.id
            ) ||
            0
          ) -
          (
            contentsByClient.get(
              a.id
            ) ||
            0
          )
      )
      .slice(
        0,
        5
      );


  const daysInMonth =
    new Date(
      now.getFullYear(),
      now.getMonth() +
        1,
      0
    ).getDate();


  const firstWeekDay =
    (
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).getDay() +
      6
    ) %
    7;


  const calendarCells:
    Array<
      number
      | null
    > = [];


  for (
    let index = 0;
    index <
    firstWeekDay;
    index++
  ) {
    calendarCells.push(
      null
    );
  }


  for (
    let day = 1;
    day <=
    daysInMonth;
    day++
  ) {
    calendarCells.push(
      day
    );
  }


  while (
    calendarCells.length %
      7 !==
    0
  ) {
    calendarCells.push(
      null
    );
  }


  const contentCountByDay =
    new Map<
      number,
      number
    >();


  for (
    const content
    of monthContents
  ) {
    if (
      !content.plannedDate
    ) {
      continue;
    }

    const date =
      new Date(
        content.plannedDate
      );

    const day =
      date.getDate();

    contentCountByDay.set(
      day,
      (
        contentCountByDay.get(
          day
        ) ||
        0
      ) +
        1
    );
  }


  const currentProductionContents =
    monthContents.filter(
      (
        content
      ) =>
        productionStatuses.includes(
          content.status
        )
    ).length;


  const currentCompletedContents =
    monthContents.filter(
      (
        content
      ) =>
        completedStatuses.includes(
          content.status
        )
    ).length;


  const dailyCounts =
    Array.from(
      {
        length:
          daysInMonth,
      },
      () =>
        0
    );


  for (
    const content
    of monthContents
  ) {
    if (
      !content.plannedDate
    ) {
      continue;
    }

    const day =
      new Date(
        content.plannedDate
      ).getDate();

    dailyCounts[
      day -
        1
    ] +=
      1;
  }


  let running =
    0;


  const cumulative =
    dailyCounts.map(
      (
        value
      ) => {
        running +=
          value;

        return running;
      }
    );


  const graphMax =
    Math.max(
      ...cumulative,
      1
    );


  const graphPoints =
    cumulative
      .map(
        (
          value,
          index
        ) => {
          const x =
            24 +
            (
              index /
              Math.max(
                daysInMonth -
                  1,
                1
              )
            ) *
              552;

          const y =
            150 -
            (
              value /
              graphMax
            ) *
              112;

          return `${x.toFixed(
            1
          )},${y.toFixed(
            1
          )}`;
        }
      )
      .join(
        " "
      );


  const pipeline = [
    {
      label:
        "Briefing",

      value:
        briefingCount,

      icon:
        <LayoutGrid
          size={15}
        />,

      tone:
        "bg-violet-50 text-violet-600",
    },

    {
      label:
        "Em produção",

      value:
        productionCount,

      icon:
        <Video
          size={15}
        />,

      tone:
        "bg-blue-50 text-blue-600",
    },

    {
      label:
        "Em revisão",

      value:
        reviewCount,

      icon:
        <Palette
          size={15}
        />,

      tone:
        "bg-orange-50 text-orange-600",
    },

    {
      label:
        "Aprovação",

      value:
        clientApprovalCount,

      icon:
        <Send
          size={15}
        />,

      tone:
        "bg-emerald-50 text-emerald-600",
    },

    {
      label:
        "Concluído",

      value:
        concludedCount,

      icon:
        <CheckCircle2
          size={15}
        />,

      tone:
        "bg-emerald-50 text-emerald-600",
    },
  ];


  return (
    <div className="space-y-4">
      {/* ===================================================
          KPIS
          =================================================== */}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Conteúdos do mês"
          value={
            monthContents.length
          }
          delta={
            contentDelta
          }
          helper="vs. mês anterior"
          icon={
            <FileText
              size={18}
            />
          }
          tone="violet"
        />

        <KpiCard
          label="Clientes ativos"
          value={
            currentClientIds.size
          }
          delta={
            clientsDelta
          }
          helper="com conteúdo neste mês"
          icon={
            <UsersRound
              size={18}
            />
          }
          tone="blue"
        />

        <KpiCard
          label="Pendências"
          value={
            currentPending
          }
          delta={
            pendingDelta
          }
          helper="vs. mês anterior"
          icon={
            <Clock3
              size={18}
            />
          }
          tone="orange"
          invertTrend
        />

        <KpiCard
          label="Aprovações concluídas"
          value={
            approvalsThisMonth
          }
          delta={
            approvalDelta
          }
          helper="vs. mês anterior"
          icon={
            <CheckCircle2
              size={18}
            />
          }
          tone="green"
        />
      </section>


      {/* ===================================================
          CALENDARIO + APROVACOES + CLIENTES
          =================================================== */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* CALENDARIO */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays
                size={16}
                className="text-slate-700"
              />

              <h2 className="text-[15px] font-bold text-slate-900">
                Calendário editorial
              </h2>
            </div>

            <Link
              href={`/calendario-editorial?mes=${now.getMonth() + 1}&ano=${now.getFullYear()}`}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            >
              Ver calendário
            </Link>
          </div>


          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-slate-300">
              ‹
            </span>

            <p className="text-[13px] font-bold text-slate-700">
              {monthNames[
                now.getMonth()
              ]}{" "}
              {now.getFullYear()}
            </p>

            <span className="text-slate-300">
              ›
            </span>
          </div>


          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekDays.map(
              (
                day
              ) => (
                <div
                  key={
                    day
                  }
                  className="py-1 text-center text-[9px] font-bold text-slate-400"
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
                  day ===
                  null
                ) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="h-7"
                    />
                  );
                }

                const active =
                  day ===
                    now.getDate();

                const count =
                  contentCountByDay.get(
                    day
                  ) ||
                  0;

                return (
                  <div
                    key={
                      day
                    }
                    className="relative flex h-7 items-center justify-center"
                  >
                    <span
                      className={[
                        "flex",
                        "h-6",
                        "w-6",
                        "items-center",
                        "justify-center",
                        "rounded-full",
                        "text-[10px]",
                        "font-semibold",
                        active
                          ? "bg-violet-600 text-white"
                          : "text-slate-600",
                      ].join(
                        " "
                      )}
                    >
                      {day}
                    </span>

                    {count >
                    0 ? (
                      <span
                        className={[
                          "absolute",
                          "bottom-0",
                          "h-1",
                          "w-1",
                          "rounded-full",
                          active
                            ? "bg-violet-200"
                            : "bg-blue-500",
                        ].join(
                          " "
                        )}
                      />
                    ) : null}
                  </div>
                );
              }
            )}
          </div>


          <div className="mt-4 space-y-1">
            {nextSchedule.length ===
            0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-5 text-center text-[11px] text-slate-400">
                Nenhum conteúdo próximo.
              </div>
            ) : (
              nextSchedule.map(
                (
                  content
                ) => (
                  <Link
                    key={
                      content.id
                    }
                    href={`/conteudos/${content.id}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                  >
                    <span className="w-10 shrink-0 text-[11px] font-bold text-slate-700">
                      {content.plannedDate
                        ? new Date(
                            content.plannedDate
                          ).toLocaleTimeString(
                            "pt-BR",
                            {
                              hour:
                                "2-digit",

                              minute:
                                "2-digit",
                            }
                          )
                        : "--:--"}
                    </span>

                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                      {content.area ===
                      "FILMMAKER" ? (
                        <Video
                          size={11}
                        />
                      ) : (
                        <FileText
                          size={11}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-slate-800">
                        {cleanTitle(
                          content.title
                        )}
                      </p>

                      <p className="mt-0.5 truncate text-[9px] text-slate-400">
                        Cliente:{" "}
                        {cleanName(
                          content.client.name
                        )}
                      </p>
                    </div>

                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-600">
                      {statusLabel(
                        content.status
                      )}
                    </span>
                  </Link>
                )
              )
            )}
          </div>


          <Link
            href="/conteudos"
            className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
          >
            Ver todos os conteúdos

            <ArrowUpRight
              size={10}
            />
          </Link>
        </div>


        {/* APROVACOES */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={16}
                className="text-slate-700"
              />

              <h2 className="text-[15px] font-bold text-slate-900">
                Próximas aprovações
              </h2>

              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-50 px-1.5 text-[10px] font-bold text-violet-600">
                {approvalQueue.length}
              </span>
            </div>

            <Link
              href="/aprovacoes"
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Ver todas
            </Link>
          </div>


          <div className="mt-3 space-y-1">
            {approvalQueue.length ===
            0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-[11px] text-slate-400">
                Nenhuma aprovação pendente.
              </div>
            ) : (
              approvalQueue.map(
                (
                  content
                ) => (
                  <Link
                    key={
                      content.id
                    }
                    href={`/conteudos/${content.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"
                  >
                    <Thumb
                      content={
                        content
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[11px] font-bold text-slate-800">
                          {cleanTitle(
                            content.title
                          )}
                        </p>

                        {isDemo(
                          content.client.name
                        ) ? (
                          <span className="rounded bg-violet-50 px-1 py-0.5 text-[6px] font-bold text-violet-600">
                            DEMO
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 truncate text-[9px] text-slate-400">
                        Cliente:{" "}
                        {cleanName(
                          content.client.name
                        )}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[9px] text-slate-400">
                          Entrega:{" "}
                          {formatShortDate(
                            content.plannedDate
                          )}
                        </span>

                        <span
                          className={[
                            "text-[9px]",
                            "font-bold",
                            content.plannedDate &&
                            new Date(
                              content.plannedDate
                            ) <
                              today
                              ? "text-red-500"
                              : "text-orange-500",
                          ].join(
                            " "
                          )}
                        >
                          {relativeDate(
                            content.plannedDate,
                            today
                          )}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-md bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-600">
                      {approvalStage(
                        content.status
                      )}
                    </span>
                  </Link>
                )
              )
            )}
          </div>


          <Link
            href="/aprovacoes"
            className="mt-3 flex items-center justify-center gap-1 border-t border-slate-100 pt-3 text-[11px] font-bold text-blue-600 hover:underline"
          >
            Ver todas as aprovações

            <ArrowUpRight
              size={10}
            />
          </Link>
        </div>


        {/* CLIENTES */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-slate-900">
              Clientes ativos
            </h2>

            <Link
              href="/clientes"
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Ver todos
            </Link>
          </div>


          <div className="mt-3 space-y-1">
            {focusClients.map(
              (
                client
              ) => (
                <Link
                  key={
                    client.id
                  }
                  href={`/clientes/${client.id}`}
                  className="flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-slate-50"
                >
                  <ClientAvatar
                    client={
                      client
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-slate-800">
                      {cleanName(
                        client.name
                      )}
                    </p>

                    <p className="mt-0.5 truncate text-[9px] text-slate-400">
                      {client._count.contents} projetos
                      {" • "}
                      ativo há{" "}
                      {monthsActive(
                        client.createdAt,
                        now
                      )}{" "}
                      meses
                    </p>
                  </div>

                  <span className="text-slate-300">
                    ⋮
                  </span>
                </Link>
              )
            )}
          </div>


          <Link
            href="/clientes"
            className="mt-3 flex items-center justify-center gap-1 border-t border-slate-100 pt-3 text-[11px] font-bold text-blue-600 hover:underline"
          >
            Ver todos os clientes

            <ArrowUpRight
              size={10}
            />
          </Link>
        </div>
      </section>


      {/* ===================================================
          PRODUCAO + PERFORMANCE
          =================================================== */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* STATUS PRODUCAO */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-900">
              Status da produção
            </h2>

            <Link
              href="/conteudos/kanban"
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Ver todos
            </Link>
          </div>


          <div className="mt-4 grid grid-cols-5 gap-2">
            {pipeline.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    item.label
                  }
                  className="relative text-center"
                >
                  <div
                    className={[
                      "mx-auto",
                      "flex",
                      "h-9",
                      "w-9",
                      "items-center",
                      "justify-center",
                      "rounded-full",
                      item.tone,
                    ].join(
                      " "
                    )}
                  >
                    {item.icon}
                  </div>

                  <p className="mt-2 text-[10px] font-semibold text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-0.5 text-lg font-bold text-slate-900">
                    {item.value}
                  </p>

                  <p className="text-[9px] text-slate-400">
                    projetos
                  </p>

                  {index <
                  pipeline.length -
                    1 ? (
                    <span className="absolute right-[-8px] top-4 text-slate-300">
                      →
                    </span>
                  ) : null}
                </div>
              )
            )}
          </div>


          <div className="mt-5 border-t border-slate-100 pt-3">
            {projectContents.length ===
            0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-[11px] text-slate-400">
                Nenhum projeto em andamento.
              </div>
            ) : (
              projectContents.map(
                (
                  content
                ) => {
                  const progress =
                    progressForStatus(
                      content.status
                    );

                  return (
                    <Link
                      key={
                        content.id
                      }
                      href={`/conteudos/${content.id}`}
                      className="grid grid-cols-[minmax(0,1fr)_150px_80px] items-center gap-3 border-b border-slate-100 py-2.5 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FolderOpen
                          size={13}
                          className="shrink-0 text-slate-400"
                        />

                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-slate-800">
                            {cleanTitle(
                              content.title
                            )}
                          </p>

                          <p className="mt-0.5 truncate text-[9px] text-slate-400">
                            {cleanName(
                              content.client.name
                            )}
                          </p>
                        </div>
                      </div>


                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-violet-600"
                            style={{
                              width:
                                `${progress}%`,
                            }}
                          />
                        </div>

                        <span className="w-7 text-right text-[9px] font-bold text-slate-500">
                          {progress}%
                        </span>
                      </div>


                      <span className="rounded-md bg-slate-50 px-2 py-1 text-center text-[9px] font-bold text-slate-500">
                        {statusLabel(
                          content.status
                        )}
                      </span>
                    </Link>
                  );
                }
              )
            )}
          </div>


          <Link
            href="/conteudos/kanban"
            className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
          >
            Ver todos os projetos

            <ArrowUpRight
              size={10}
            />
          </Link>
        </div>


        {/* PERFORMANCE */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">
                Performance operacional
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Evolução da produção no mês atual.
              </p>
            </div>

            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
              Este mês
            </span>
          </div>


          <div className="mt-4 grid grid-cols-4 gap-2">
            <div>
              <p className="text-[9px] text-slate-400">
                Planejados
              </p>

              <p className="mt-1 text-[15px] font-bold text-slate-900">
                {monthContents.length}
              </p>
            </div>

            <div>
              <p className="text-[9px] text-slate-400">
                Em produção
              </p>

              <p className="mt-1 text-[15px] font-bold text-slate-900">
                {currentProductionContents}
              </p>
            </div>

            <div>
              <p className="text-[9px] text-slate-400">
                Aprovações
              </p>

              <p className="mt-1 text-[15px] font-bold text-slate-900">
                {approvalsThisMonth}
              </p>
            </div>

            <div>
              <p className="text-[9px] text-slate-400">
                Concluídos
              </p>

              <p className="mt-1 text-[15px] font-bold text-slate-900">
                {currentCompletedContents}
              </p>
            </div>
          </div>


          <div className="mt-4 overflow-hidden rounded-lg border border-slate-100 bg-slate-50/50 p-2">
            <svg
              viewBox="0 0 600 180"
              className="h-[175px] w-full"
              role="img"
              aria-label="Evolução de conteúdos planejados no mês"
            >
              <line
                x1="24"
                x2="576"
                y1="150"
                y2="150"
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              <line
                x1="24"
                x2="576"
                y1="112"
                y2="112"
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              <line
                x1="24"
                x2="576"
                y1="74"
                y2="74"
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              <line
                x1="24"
                x2="576"
                y1="36"
                y2="36"
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              <polygon
                points={`24,150 ${graphPoints} 576,150`}
                fill="rgba(124,58,237,0.08)"
              />

              <polyline
                points={
                  graphPoints
                }
                fill="none"
                stroke="#6d4aff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {cumulative.map(
                (
                  value,
                  index
                ) => {
                  if (
                    index %
                      4 !==
                      0 &&
                    index !==
                      cumulative.length -
                        1
                  ) {
                    return null;
                  }

                  const x =
                    24 +
                    (
                      index /
                      Math.max(
                        daysInMonth -
                          1,
                        1
                      )
                    ) *
                      552;

                  const y =
                    150 -
                    (
                      value /
                      graphMax
                    ) *
                      112;

                  return (
                    <circle
                      key={
                        index
                      }
                      cx={
                        x
                      }
                      cy={
                        y
                      }
                      r="3.5"
                      fill="white"
                      stroke="#6d4aff"
                      strokeWidth="2"
                    />
                  );
                }
              )}

              <text
                x="24"
                y="173"
                fontSize="9"
                fill="#94a3b8"
              >
                1{" "}
                {monthNames[
                  now.getMonth()
                ].slice(
                  0,
                  3
                )}
              </text>

              <text
                x="190"
                y="173"
                fontSize="9"
                fill="#94a3b8"
              >
                10
              </text>

              <text
                x="372"
                y="173"
                fontSize="9"
                fill="#94a3b8"
              >
                20
              </text>

              <text
                x="552"
                y="173"
                fontSize="9"
                fill="#94a3b8"
              >
                {daysInMonth}
              </text>
            </svg>
          </div>


          <Link
            href="/relatorios"
            className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
          >
            Ver relatório completo

            <ArrowUpRight
              size={10}
            />
          </Link>
        </div>
      </section>
    </div>
  );
}