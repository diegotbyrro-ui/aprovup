import Link from "next/link";

import type {
  Prisma,
} from "@prisma/client";

import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutGrid,
  Palette,
  Send,
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


const DAY =
  1000 * 60 * 60 * 24;


const planningStatuses = [
  "IDEIA",
  "PLANEJAMENTO",
  "APROVADO",
];


const designStatuses = [
  "DESIGN_FAZENDO",
  "DESIGN_ANALISE",
  "DESIGN_DUVIDA",
];


const filmmakerStatuses = [
  "FILMMAKER_PRE_PRODUCAO",
  "FILMMAKER_AGENDAMENTO",
  "FILMMAKER_GRAVANDO",
  "FILMMAKER_EDICAO",
  "FILMMAKER_ANALISE",
  "FILMMAKER_DUVIDA_SOCIAL",
];


const clientStatuses = [
  "ENVIADO_CLIENTE",
  "ALTERACAO_SOLICITADA",
];


const readyStatuses = [
  "PRONTO_PARA_POSTAR",
  "PUBLICADO_MANUALMENTE",
];


function startOfDay(
  date: Date
) {
  const copy =
    new Date(date);

  copy.setHours(
    0,
    0,
    0,
    0
  );

  return copy;
}


function addDays(
  date: Date,
  days: number
) {
  const copy =
    new Date(date);

  copy.setDate(
    copy.getDate() +
    days
  );

  return copy;
}


function formatShortDate(
  date:
    | Date
    | null
) {
  if (!date) {
    return "Sem data";
  }

  return new Date(
    date
  ).toLocaleDateString(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "short",
    }
  );
}


function relativeDate(
  date:
    | Date
    | null,
  today: Date
) {
  if (!date) {
    return "Sem data";
  }

  const target =
    startOfDay(
      new Date(date)
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


function cleanName(
  name: string
) {
  return name.replace(
    /^\[DEMO\]\s*/i,
    ""
  );
}


function cleanContentTitle(
  title: string
) {
  return title.replace(
    /^\[DEMO\]\s*/i,
    ""
  );
}


function isDemo(
  name: string
) {
  return /^\[DEMO\]/i.test(
    name
  );
}


function historyActionLabel(
  action: string
) {
  const labels:
    Record<string, string> = {
      CREATE:
        "Criado",

      UPDATE:
        "Atualizado",

      DESIGN_STATUS_UPDATED:
        "Design atualizado",

      FILMMAKER_STATUS_UPDATED:
        "Filmmaker atualizado",

      STATUS_UPDATED:
        "Status atualizado",

      APPROVAL:
        "Aprovação",

      COMMENT:
        "Comentário",
    };

  return (
    labels[action] ||
    action
      .replaceAll(
        "_",
        " "
      )
      .toLowerCase()
      .replace(
        /^./,
        (letter) =>
          letter.toUpperCase()
      )
  );
}


function cleanHistoryDescription(
  description: string
) {
  return description
    .replace(
      /^\[DEMO\]\s*/i,
      ""
    )
    .replace(
      /Conteúdo demo criado:/gi,
      "Conteúdo criado:"
    );
}


function areaLabel(
  area:
    | string
    | null
) {
  if (
    area === "DESIGN"
  ) {
    return "Design";
  }

  if (
    area === "FILMMAKER"
  ) {
    return "Filmmaker";
  }

  if (
    area === "SOCIAL_MEDIA"
  ) {
    return "Social Media";
  }

  return (
    area ||
    "Conteúdo"
  );
}


function statusMeta(
  status: string
) {
  const map:
    Record<
      string,
      {
        label: string;
        tone: string;
      }
    > = {
      IDEIA: {
        label:
          "Ideia",
        tone:
          "slate",
      },

      APROVADO: {
        label:
          "Liberado",
        tone:
          "blue",
      },

      DESIGN_FAZENDO: {
        label:
          "Em design",
        tone:
          "blue",
      },

      DESIGN_ANALISE: {
        label:
          "Revisão design",
        tone:
          "amber",
      },

      DESIGN_DUVIDA: {
        label:
          "Dúvida design",
        tone:
          "amber",
      },

      FILMMAKER_PRE_PRODUCAO: {
        label:
          "Pré-produção",
        tone:
          "violet",
      },

      FILMMAKER_AGENDAMENTO: {
        label:
          "Agendamento",
        tone:
          "violet",
      },

      FILMMAKER_GRAVANDO: {
        label:
          "Gravando",
        tone:
          "violet",
      },

      FILMMAKER_EDICAO: {
        label:
          "Em edição",
        tone:
          "violet",
      },

      FILMMAKER_ANALISE: {
        label:
          "Revisão vídeo",
        tone:
          "amber",
      },

      ENVIADO_CLIENTE: {
        label:
          "Com cliente",
        tone:
          "orange",
      },

      ALTERACAO_SOLICITADA: {
        label:
          "Alteração",
        tone:
          "red",
      },

      PRONTO_PARA_POSTAR: {
        label:
          "Pronto",
        tone:
          "green",
      },

      PUBLICADO_MANUALMENTE: {
        label:
          "Publicado",
        tone:
          "green",
      },
    };

  return (
    map[status] || {
      label:
        status
          .replaceAll(
            "_",
            " "
          )
          .toLowerCase(),

      tone:
        "slate",
    }
  );
}


function StatusPill({
  status,
}: {
  status: string;
}) {
  const meta =
    statusMeta(
      status
    );

  const tones:
    Record<
      string,
      string
    > = {
      slate:
        "border-slate-200 bg-slate-50 text-slate-600",

      blue:
        "border-blue-100 bg-blue-50 text-blue-700",

      amber:
        "border-amber-200 bg-amber-50 text-amber-700",

      orange:
        "border-orange-200 bg-orange-50 text-orange-700",

      red:
        "border-red-200 bg-red-50 text-red-700",

      green:
        "border-emerald-200 bg-emerald-50 text-emerald-700",

      violet:
        "border-violet-200 bg-violet-50 text-violet-700",
    };


  return (
    <span
      className={[
        "inline-flex",
        "items-center",
        "rounded-md",
        "border",
        "px-2",
        "py-1",
        "text-[9px]",
        "font-bold",
        "leading-none",
        tones[
          meta.tone
        ] ||
          tones.slate,
      ].join(" ")}
    >
      {meta.label}
    </span>
  );
}


function ContentThumb({
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
      <div className="h-16 w-14 flex-none overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <img
          alt=""
          src={src}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }


  const label =
    areaLabel(
      content.area
    );


  return (
    <div className="flex h-16 w-14 flex-none items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
      {label ===
      "Filmmaker" ? (
        <Video
          size={18}
        />
      ) : (
        <FileText
          size={18}
        />
      )}
    </div>
  );
}


function ContentListRow({
  content,
  today,
}: {
  content:
    ContentWithClient;

  today:
    Date;
}) {
  return (
    <Link
      href={`/conteudos/${content.id}`}
      className="group flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
    >
      <ContentThumb
        content={content}
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-[12px] font-bold text-slate-900 transition group-hover:text-blue-600">
            {cleanContentTitle(
              content.title
            )}
          </p>

          {isDemo(
            content.client.name
          ) ? (
            <span className="flex-none rounded-md bg-violet-50 px-1.5 py-0.5 text-[8px] font-bold text-violet-700">
              DEMO
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
          <span className="truncate">
            {cleanName(
              content.client.name
            )}
          </span>

          <span>
            •
          </span>

          <span>
            {areaLabel(
              content.area
            )}
          </span>

          <span>
            •
          </span>

          <span>
            {relativeDate(
              content.plannedDate,
              today
            )}
          </span>
        </div>
      </div>

      <StatusPill
        status={
          content.status
        }
      />

      <ArrowUpRight
        size={14}
        className="flex-none text-slate-300 transition group-hover:text-slate-700"
      />
    </Link>
  );
}


function DashboardCard({
  label,
  value,
  description,
  icon,
  accent,
}: {
  label:
    string;

  value:
    number;

  description:
    string;

  icon:
    React.ReactNode;

  accent:
    "blue"
    | "green"
    | "orange"
    | "red";
}) {
  const tones = {
    blue: {
      icon:
        "bg-blue-50 text-blue-600",
    },

    green: {
      icon:
        "bg-emerald-50 text-emerald-600",
    },

    orange: {
      icon:
        "bg-orange-50 text-orange-600",
    },

    red: {
      icon:
        "bg-red-50 text-red-600",
    },
  };


  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={[
            "flex",
            "h-9",
            "w-9",
            "items-center",
            "justify-center",
            "rounded-lg",
            tones[
              accent
            ].icon,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-slate-500">
        {description}
      </p>
    </div>
  );
}


export default async function OperacaoPage() {
  const user =
    await requireCurrentUser();

  const now =
    new Date();

  const today =
    startOfDay(
      now
    );

  const weekEnd =
    addDays(
      today,
      7
    );


  const [
    activeClients,
    totalContents,
    lateCount,
    planningCount,
    designCount,
    filmmakerCount,
    awaitingClientCount,
    readyCount,
    priorityContents,
    weekContents,
    pendingClientContents,
    focusClients,
    recentHistory,
  ] =
    await Promise.all([
      prisma.client.count(),

      prisma.content.count(),

      prisma.content.count({
        where: {
          plannedDate: {
            lt:
              today,
          },

          status: {
            notIn: [
              "PRONTO_PARA_POSTAR",
              "PUBLICADO_MANUALMENTE",
              "ARQUIVADO",
            ],
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
              designStatuses,
          },
        },
      }),

      prisma.content.count({
        where: {
          status: {
            in:
              filmmakerStatuses,
          },
        },
      }),

      prisma.content.count({
        where: {
          status: {
            in:
              clientStatuses,
          },
        },
      }),

      prisma.content.count({
        where: {
          status: {
            in:
              readyStatuses,
          },
        },
      }),

      prisma.content.findMany({
        where: {
          status: {
            notIn: [
              "PRONTO_PARA_POSTAR",
              "PUBLICADO_MANUALMENTE",
              "ARQUIVADO",
            ],
          },

          OR: [
            {
              priority:
                "URGENTE",
            },

            {
              priority:
                "ALTA",
            },

            {
              plannedDate: {
                lt:
                  today,
              },
            },
          ],
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
          5,
      }),

      prisma.content.findMany({
        where: {
          plannedDate: {
            gte:
              today,

            lte:
              weekEnd,
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
          5,
      }),

      prisma.content.findMany({
        where: {
          status: {
            in:
              clientStatuses,
          },
        },

        include: {
          client:
            true,
        },

        orderBy: {
          updatedAt:
            "desc",
        },

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

        take:
          4,
      }),

      prisma.historyLog.findMany({
        orderBy: {
          createdAt:
            "desc",
        },

        take:
          5,
      }),
    ]);


  const productionCount =
    designCount +
    filmmakerCount;


  const firstName =
    (
      user.name ||
      "equipe"
    )
      .trim()
      .split(/\s+/)[0];


  const todayLabel =
    now.toLocaleDateString(
      "pt-BR",
      {
        weekday:
          "long",

        day:
          "2-digit",

        month:
          "long",
      }
    );


  const formattedTodayLabel =
    todayLabel
      .charAt(0)
      .toUpperCase() +
    todayLabel.slice(1);


  const flow = [
    {
      label:
        "Planejamento",

      value:
        planningCount,

      icon:
        <LayoutGrid
          size={15}
        />,

      color:
        "var(--ap-blue)",
    },

    {
      label:
        "Design",

      value:
        designCount,

      icon:
        <Palette
          size={15}
        />,

      color:
        "var(--ap-purple)",
    },

    {
      label:
        "Filmmaker",

      value:
        filmmakerCount,

      icon:
        <Video
          size={15}
        />,

      color:
        "var(--ap-cyan)",
    },

    {
      label:
        "Com cliente",

      value:
        awaitingClientCount,

      icon:
        <Send
          size={15}
        />,

      color:
        "var(--ap-orange)",
    },

    {
      label:
        "Prontos",

      value:
        readyCount,

      icon:
        <CheckCircle2
          size={15}
        />,

      color:
        "var(--ap-green)",
    },
  ];


  return (
    <div className="space-y-5">
      {/* ===================================================
          CABECALHO
          =================================================== */}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold capitalize tracking-[0.03em] text-slate-400">
            {formattedTodayLabel}
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Olá, {firstName}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Aqui está o que merece atenção na operação agora.
          </p>
        </div>


        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/calendario-editorial"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <CalendarDays
              size={15}
            />

            Calendário
          </Link>

          <Link
            href="/conteudos/novo"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-[11px] font-bold text-white transition hover:bg-blue-700"
          >
            <FileText
              size={15}
            />

            Novo conteúdo
          </Link>
        </div>
      </section>


      {/* ===================================================
          RESUMO / ALERTA
          =================================================== */}

      {lateCount >
      0 ? (
        <Link
          href="/entregas-semana"
          className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-decoration-none"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <AlertTriangle
                size={16}
              />
            </div>

            <div>
              <p className="text-[11px] font-bold text-red-700">
                {lateCount} conteúdos precisam de atenção
              </p>

              <p className="mt-0.5 text-[9px] text-red-500">
                Há itens vencidos ou pendentes que merecem revisão.
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
            Revisar

            <ArrowUpRight
              size={13}
            />
          </span>
        </Link>
      ) : null}


      {/* ===================================================
          KPIS
          =================================================== */}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <DashboardCard
          label="Clientes ativos"
          value={activeClients}
          description={`${totalContents} conteúdos na operação`}
          icon={
            <UsersRound
              size={17}
            />
          }
          accent="blue"
        />

        <DashboardCard
          label="Em produção"
          value={productionCount}
          description={`${designCount} design • ${filmmakerCount} audiovisual`}
          icon={
            <Clock3
              size={17}
            />
          }
          accent="orange"
        />

        <DashboardCard
          label="Aguardando cliente"
          value={awaitingClientCount}
          description="Materiais enviados para retorno"
          icon={
            <Send
              size={17}
            />
          }
          accent="blue"
        />

        <DashboardCard
          label="Prontos"
          value={readyCount}
          description={`${lateCount} itens ainda precisam de atenção`}
          icon={
            <CheckCircle2
              size={17}
            />
          }
          accent="green"
        />
      </section>


      {/* ===================================================
          FLUXO
          =================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-bold text-slate-900">
              Fluxo de produção
            </h2>

            <p className="mt-0.5 text-[10px] text-slate-500">
              Distribuição atual das demandas.
            </p>
          </div>

          <Link
            href="/conteudos/kanban"
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
          >
            Abrir Kanban

            <ArrowUpRight
              size={13}
            />
          </Link>
        </div>


        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {flow.map(
            (
              item,
              index
            ) => (
              <div
                key={
                  item.label
                }
                className="relative rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{
                      color:
                        item.color,

                      background:
                        `color-mix(in srgb, ${item.color} 10%, transparent)`,
                    }}
                  >
                    {item.icon}
                  </span>

                  <span className="text-xl font-bold text-slate-900">
                    {item.value}
                  </span>
                </div>

                <p className="mt-3 text-[10px] font-semibold text-slate-600">
                  {item.label}
                </p>

                {index <
                flow.length -
                  1 ? (
                  <span className="absolute -right-[7px] top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 md:block">
                    ›
                  </span>
                ) : null}
              </div>
            )
          )}
        </div>
      </section>


      {/* ===================================================
          PRINCIPAL
          =================================================== */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-bold text-slate-900">
                Prioridades
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Demandas que precisam de atenção primeiro.
              </p>
            </div>

            <Link
              href="/entregas-semana"
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Ver todas
            </Link>
          </div>


          <div className="mt-2">
            {priorityContents.length ===
            0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-200 py-8 text-center text-[11px] text-slate-400">
                Nenhuma prioridade no momento.
              </div>
            ) : (
              priorityContents.map(
                (
                  content
                ) => (
                  <ContentListRow
                    key={
                      content.id
                    }
                    content={
                      content
                    }
                    today={
                      today
                    }
                  />
                )
              )
            )}
          </div>
        </div>


        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-bold text-slate-900">
                Próximas entregas
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Agenda dos próximos 7 dias.
              </p>
            </div>

            <CalendarDays
              size={16}
              className="text-slate-400"
            />
          </div>


          <div className="mt-2">
            {weekContents.length ===
            0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-200 py-8 text-center text-[11px] text-slate-400">
                Nenhuma entrega prevista.
              </div>
            ) : (
              weekContents.map(
                (
                  content
                ) => (
                  <ContentListRow
                    key={
                      content.id
                    }
                    content={
                      content
                    }
                    today={
                      today
                    }
                  />
                )
              )
            )}
          </div>
        </div>
      </section>


      {/* ===================================================
          CLIENTE + CARTEIRA
          =================================================== */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-bold text-slate-900">
                Aguardando cliente
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Materiais enviados e ainda sem conclusão.
              </p>
            </div>

            <Link
              href="/aprovacoes"
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Aprovações
            </Link>
          </div>


          <div className="mt-2">
            {pendingClientContents.length ===
            0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-200 py-8 text-center text-[11px] text-slate-400">
                Nenhum retorno pendente.
              </div>
            ) : (
              pendingClientContents.map(
                (
                  content
                ) => (
                  <ContentListRow
                    key={
                      content.id
                    }
                    content={
                      content
                    }
                    today={
                      today
                    }
                  />
                )
              )
            )}
          </div>
        </div>


        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-bold text-slate-900">
                Clientes em foco
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Carteira com atividade recente.
              </p>
            </div>

            <Link
              href="/clientes"
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Ver carteira
            </Link>
          </div>


          <div className="mt-3 space-y-2">
            {focusClients.map(
              (
                client
              ) => (
                <Link
                  key={
                    client.id
                  }
                  href={`/clientes/${client.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {client.logoUrl ? (
                      <img
                        alt=""
                        src={
                          client.logoUrl
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500">
                        {cleanName(
                          client.name
                        )
                          .slice(
                            0,
                            2
                          )
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[11px] font-bold text-slate-900">
                        {cleanName(
                          client.name
                        )}
                      </p>

                      {isDemo(
                        client.name
                      ) ? (
                        <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[8px] font-bold text-violet-700">
                          DEMO
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-0.5 truncate text-[9px] text-slate-500">
                      {client.segment ||
                        "Segmento não informado"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[13px] font-bold text-slate-900">
                      {
                        client
                          ._count
                          .contents
                      }
                    </p>

                    <p className="text-[8px] text-slate-400">
                      conteúdos
                    </p>
                  </div>

                  <ArrowUpRight
                    size={13}
                    className="text-slate-300 transition group-hover:text-slate-700"
                  />
                </Link>
              )
            )}
          </div>
        </div>
      </section>


      {/* ===================================================
          ATIVIDADE
          =================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-bold text-slate-900">
              Atividade recente
            </h2>

            <p className="mt-0.5 text-[10px] text-slate-500">
              Últimas movimentações registradas no AprovUp.
            </p>
          </div>

          <Clock3
            size={16}
            className="text-slate-400"
          />
        </div>


        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          {recentHistory.length ===
          0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-slate-200 py-7 text-center text-[11px] text-slate-400">
              Nenhuma atividade registrada.
            </div>
          ) : (
            recentHistory.map(
              (
                item
              ) => (
                <div
                  key={
                    item.id
                  }
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />

                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      {historyActionLabel(
                        item.action
                      )}
                    </p>
                  </div>

                  <p className="mt-2 line-clamp-2 text-[10px] font-medium leading-relaxed text-slate-700">
                    {cleanHistoryDescription(
                      item.description
                    )}
                  </p>

                  <p className="mt-2 text-[8px] text-slate-400">
                    {item.authorName}
                  </p>
                </div>
              )
            )
          )}
        </div>
      </section>
    </div>
  );
}