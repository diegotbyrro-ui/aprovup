import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  Film,
  FolderOpen,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Scissors,
  Send,
  Trash2,
  Video,
} from "lucide-react";

import {
  formatLabel,
} from "@/lib/formatLabel";

import {
  prisma,
} from "@/lib/prisma";

import {
  isDirector,
  requireCurrentUser,
} from "@/lib/auth";

import {
  FilmmakerCaptureAgenda,
} from "@/components/filmmaker/FilmmakerCaptureAgenda";

import {
  archiveFilmmakerColumnAction,
  createFilmmakerColumnAction,
  ensureDefaultFilmmakerColumns,
  moveFilmmakerColumnAction,
  sendFilmmakerQuestionAction,
  updateFilmmakerColumnTitleAction,
} from "./actions";

import DraggableColumn from "./DraggableColumn";

import {
  DraggableContentCard,
  DroppableFilmmakerColumn,
} from "./DraggableContentCard";


function normalizeRole(
  role?:
    | string
    | null
) {
  return String(
    role ||
    ""
  )
    .trim()
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}


function isFilmmaker(
  role?:
    | string
    | null
) {
  const value =
    normalizeRole(
      role
    );

  return (
    value ===
      "filmmaker" ||
    value ===
      "audiovisual" ||
    value ===
      "video"
  );
}


function cleanDemoName(
  value?:
    | string
    | null
) {
  return String(
    value ||
    ""
  ).replace(
    /^\[DEMO\]\s*/i,
    ""
  );
}


function isDemoName(
  value?:
    | string
    | null
) {
  return /^\[DEMO\]/i.test(
    String(
      value ||
      ""
    )
  );
}


function getInitials(
  name?:
    | string
    | null
) {
  const value =
    cleanDemoName(
      name
    ) ||
    "Cliente";

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (
        part
      ) =>
        part[0]
    )
    .join("")
    .toUpperCase();
}


function formatDate(
  date?:
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


function isLate(
  content:
    any
) {
  if (
    !content.plannedDate
  ) {
    return false;
  }

  if (
    [
      "PRONTO_PARA_POSTAR",
      "PUBLICADO",
      "PUBLICADO_MANUALMENTE",
    ].includes(
      String(
        content.status
      )
    )
  ) {
    return false;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const date =
    new Date(
      content.plannedDate
    );

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date < today;
}


function getColumnDescription(
  statusKey:
    string,
  title:
    string
) {
  const descriptions:
    Record<
      string,
      string
    > = {
      APROVADO:
        "Liberados para audiovisual.",

      FILMMAKER_PRE_PRODUCAO:
        "Roteiro e preparação.",

      FILMMAKER_AGENDAMENTO:
        "Aguardando data de captação.",

      FILMMAKER_GRAVANDO:
        "Captação em andamento.",

      FILMMAKER_EDICAO:
        "Material em edição.",

      FILMMAKER_ANALISE:
        "Aguardando conferência.",

      FILMMAKER_DUVIDA_SOCIAL:
        "Dependem da Social Media.",

      ALTERACAO_SOLICITADA:
        "Voltaram para ajustes.",

      PRONTO_PARA_POSTAR:
        "Vídeos finalizados.",
    };

  return (
    descriptions[
      statusKey
    ] ||
    `Fluxo: ${title}.`
  );
}


function getColumnAccent(
  statusKey:
    string
) {
  const colors:
    Record<
      string,
      string
    > = {
      APROVADO:
        "bg-blue-500",

      FILMMAKER_PRE_PRODUCAO:
        "bg-violet-500",

      FILMMAKER_AGENDAMENTO:
        "bg-sky-500",

      FILMMAKER_GRAVANDO:
        "bg-red-500",

      FILMMAKER_EDICAO:
        "bg-fuchsia-500",

      FILMMAKER_ANALISE:
        "bg-amber-500",

      FILMMAKER_DUVIDA_SOCIAL:
        "bg-orange-500",

      ALTERACAO_SOLICITADA:
        "bg-rose-500",

      PRONTO_PARA_POSTAR:
        "bg-emerald-500",
    };

  return (
    colors[
      statusKey
    ] ||
    "bg-slate-400"
  );
}


function getClientLinks(
  client:
    any
) {
  const usefulLinks =
    String(
      client?.usefulLinks ||
      ""
    )
      .split(
        /\r?\n|,|;/
      )
      .map(
        (
          item
        ) =>
          item.trim()
      )
      .filter(Boolean);

  return {
    database:
      client?.databaseLink ||
      usefulLinks[0] ||
      "",

    drive:
      client?.driveLink ||
      usefulLinks[1] ||
      usefulLinks[0] ||
      "",

    logo:
      client?.logoLink ||
      client?.logoUrl ||
      usefulLinks[2] ||
      "",
  };
}


function ColumnMenu({
  column,
}: {
  column:
    any;
}) {
  return (
    <details className="relative">
      <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal
          size={16}
        />
      </summary>

      <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <form
          action={
            updateFilmmakerColumnTitleAction.bind(
              null,
              column.id
            )
          }
          className="space-y-2"
        >
          <label className="block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Nome da coluna
          </label>

          <input
            name="title"
            defaultValue={
              column.title
            }
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-[10px] font-bold text-white hover:bg-slate-800"
          >
            <Pencil
              size={13}
            />

            Salvar
          </button>
        </form>


        <div className="mt-3 grid grid-cols-2 gap-2">
          <form
            action={
              moveFilmmakerColumnAction.bind(
                null,
                column.id,
                "left"
              )
            }
          >
            <button
              type="submit"
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft
                size={13}
              />

              Esquerda
            </button>
          </form>

          <form
            action={
              moveFilmmakerColumnAction.bind(
                null,
                column.id,
                "right"
              )
            }
          >
            <button
              type="submit"
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50"
            >
              Direita

              <ArrowRight
                size={13}
              />
            </button>
          </form>
        </div>


        <form
          action={
            archiveFilmmakerColumnAction.bind(
              null,
              column.id
            )
          }
          className="mt-2"
        >
          <button
            type="submit"
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 text-[10px] font-bold text-red-600 hover:bg-red-100"
          >
            <Trash2
              size={13}
            />

            Excluir coluna
          </button>
        </form>


        <p className="mt-3 text-[8px] leading-relaxed text-slate-400">
          A coluna também pode ser arrastada pelo puxador.
        </p>
      </div>
    </details>
  );
}


function ClientResource({
  client,
}: {
  client:
    any;
}) {
  const links =
    getClientLinks(
      client
    );

  const visualLogo =
    client.logoUrl ||
    "";

  return (
    <div className="flex min-w-[260px] max-w-[300px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {visualLogo ? (
          <img
            src={
              visualLogo
            }
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-bold text-slate-500">
            {getInitials(
              client.name
            )}
          </span>
        )}
      </div>


      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[11px] font-bold text-slate-900">
            {cleanDemoName(
              client.name
            )}
          </p>

          {isDemoName(
            client.name
          ) ? (
            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[7px] font-bold text-violet-700">
              DEMO
            </span>
          ) : null}
        </div>

        <p className="mt-0.5 truncate text-[9px] text-slate-400">
          {client.segment ||
            "Sem segmento"}
        </p>


        <div className="mt-2 flex items-center gap-1">
          {links.database ? (
            <a
              href={
                links.database
              }
              target="_blank"
              rel="noreferrer"
              title="Banco de dados"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <Database
                size={12}
              />
            </a>
          ) : null}


          {links.drive ? (
            <a
              href={
                links.drive
              }
              target="_blank"
              rel="noreferrer"
              title="Drive"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <FolderOpen
                size={12}
              />
            </a>
          ) : null}


          {links.logo ? (
            <a
              href={
                links.logo
              }
              target="_blank"
              rel="noreferrer"
              title="Logo"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <ImageIcon
                size={12}
              />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}


function PriorityBadge({
  priority,
}: {
  priority:
    string;
}) {
  const styles:
    Record<
      string,
      string
    > = {
      URGENTE:
        "border-red-200 bg-red-50 text-red-700",

      ALTA:
        "border-orange-200 bg-orange-50 text-orange-700",

      MEDIA:
        "border-blue-100 bg-blue-50 text-blue-600",

      BAIXA:
        "border-slate-200 bg-slate-50 text-slate-500",
    };

  return (
    <span
      className={[
        "rounded-md",
        "border",
        "px-1.5",
        "py-0.5",
        "text-[8px]",
        "font-bold",
        styles[
          priority
        ] ||
          styles.MEDIA,
      ].join(" ")}
    >
      {formatLabel(
        priority
      )}
    </span>
  );
}


function FilmmakerCard({
  content,
}: {
  content:
    any;
}) {
  const clientName =
    cleanDemoName(
      content.client?.name
    ) ||
    "Cliente";

  const demo =
    isDemoName(
      content.client?.name
    );

  const previewUrl =
    content.coverImageUrl ||
    content.finalCoverUrl ||
    "";

  const late =
    isLate(
      content
    );

  const clientLogo =
    content.client?.logoUrl ||
    "";

  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-slate-100 bg-slate-100">
        {previewUrl ? (
          <img
            src={
              previewUrl
            }
            alt=""
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
            <Video
              size={22}
            />

            <span className="text-[9px] font-bold uppercase tracking-[0.08em]">
              Sem preview
            </span>
          </div>
        )}


        <div className="absolute left-2 top-2 flex items-center gap-1">
          <PriorityBadge
            priority={
              content.priority ||
              "MEDIA"
            }
          />

          {late ? (
            <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[8px] font-bold text-red-600">
              ATRASADO
            </span>
          ) : null}
        </div>


        {demo ? (
          <span className="absolute right-2 top-2 rounded-md bg-violet-600 px-1.5 py-0.5 text-[7px] font-bold text-white shadow-sm">
            DEMO
          </span>
        ) : null}
      </div>


      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            {clientLogo ? (
              <img
                src={
                  clientLogo
                }
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[8px] font-bold text-slate-500">
                {getInitials(
                  clientName
                )}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold text-slate-500">
              {clientName}
            </p>

            <p className="truncate text-[8px] text-slate-400">
              {content.client?.segment ||
                "Cliente"}
            </p>
          </div>
        </div>


        <h3 className="mt-3 line-clamp-2 min-h-[34px] text-[12px] font-bold leading-[1.4] text-slate-900">
          {cleanDemoName(
            content.title
          )}
        </h3>


        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-500">
            <Clock3
              size={10}
            />

            {formatDate(
              content.plannedDate
            )}
          </span>

          <span className="rounded-md border border-violet-100 bg-violet-50 px-1.5 py-1 text-[8px] font-bold text-violet-600">
            {formatLabel(
              content.format ||
              "VIDEO"
            )}
          </span>
        </div>


        {(content.script ||
          content.briefing) ? (
          <p className="mt-3 line-clamp-2 text-[9px] leading-relaxed text-slate-500">
            {content.script ||
              content.briefing}
          </p>
        ) : null}


        <div className="mt-3 border-t border-slate-100 pt-3">
          <details>
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-[9px] font-bold text-amber-700 [&::-webkit-details-marker]:hidden">
              <span>
                Dúvida para Social
              </span>

              <Send
                size={11}
              />
            </summary>

            <form
              action={
                sendFilmmakerQuestionAction.bind(
                  null,
                  content.id
                )
              }
              className="mt-2 space-y-2"
            >
              <textarea
                name="question"
                rows={3}
                required
                placeholder="Escreva a dúvida..."
                className="w-full resize-none rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-[9px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
              />

              <button
                type="submit"
                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 text-[9px] font-bold text-white hover:bg-amber-600"
              >
                <Send
                  size={11}
                />

                Enviar dúvida
              </button>
            </form>
          </details>


          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              href={`/captacoes/nova?cliente=${content.clientId}&conteudo=${content.id}`}
              className="flex h-9 items-center justify-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 text-[8px] font-bold text-blue-600 hover:bg-blue-100"
            >
              <CalendarDays
                size={11}
              />

              Captação
            </Link>

            <Link
              href={`/conteudos/${content.id}/visualizar`}
              className="flex h-9 items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 text-[8px] font-bold text-white hover:bg-slate-800"
            >
              Abrir

              <ExternalLink
                size={10}
              />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}


function CompactMetric({
  label,
  value,
  tone,
}: {
  label:
    string;

  value:
    number;

  tone:
    "blue"
    | "violet"
    | "sky"
    | "red"
    | "fuchsia"
    | "amber"
    | "green";
}) {
  const dots = {
    blue:
      "bg-blue-500",

    violet:
      "bg-violet-500",

    sky:
      "bg-sky-500",

    red:
      "bg-red-500",

    fuchsia:
      "bg-fuchsia-500",

    amber:
      "bg-amber-500",

    green:
      "bg-emerald-500",
  };


  return (
    <div className="flex min-w-[128px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
      <span
        className={[
          "h-2",
          "w-2",
          "rounded-full",
          dots[
            tone
          ],
        ].join(" ")}
      />

      <div>
        <p className="text-lg font-bold leading-none text-slate-900">
          {value}
        </p>

        <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.07em] text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}


export default async function FilmmakerPage() {
  const currentUser =
    await requireCurrentUser();


  if (
    !isDirector(
      currentUser.role
    ) &&
    !isFilmmaker(
      currentUser.role
    )
  ) {
    redirect(
      "/clientes"
    );
  }


  await ensureDefaultFilmmakerColumns();


  const [
    clients,
    columns,
  ] =
    await Promise.all([
      prisma.client.findMany({
        orderBy: {
          name:
            "asc",
        },
      }),

      prisma.filmmakerKanbanColumn.findMany({
        where: {
          isActive:
            true,
        },

        orderBy: {
          order:
            "asc",
        },
      }),
    ]);


  const statusKeys =
    columns.map(
      (
        column
      ) =>
        column.statusKey
    );


  const contents =
    await prisma.content.findMany({
      where: {
        area:
          "FILMMAKER",

        status: {
          in:
            statusKeys,
        },
      },

      include: {
        client:
          true,

        comments: {
          orderBy: {
            createdAt:
              "desc",
          },
        },
      },

      orderBy: [
        {
          plannedDate:
            "asc",
        },

        {
          createdAt:
            "desc",
        },
      ],
    });


  const preProduction =
    contents.filter(
      (
        item
      ) =>
        item.status ===
        "FILMMAKER_PRE_PRODUCAO"
    ).length;


  const scheduled =
    contents.filter(
      (
        item
      ) =>
        item.status ===
        "FILMMAKER_AGENDAMENTO"
    ).length;


  const recording =
    contents.filter(
      (
        item
      ) =>
        item.status ===
        "FILMMAKER_GRAVANDO"
    ).length;


  const editing =
    contents.filter(
      (
        item
      ) =>
        item.status ===
        "FILMMAKER_EDICAO"
    ).length;


  const finished =
    contents.filter(
      (
        item
      ) =>
        item.status ===
        "PRONTO_PARA_POSTAR"
    ).length;


  const late =
    contents.filter(
      (
        item
      ) =>
        isLate(
          item
        )
    ).length;


  return (
    <div className="space-y-4">
      {/* ===================================================
          HEADER
          =================================================== */}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-sky-600">
            Produção audiovisual
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Filmmaker
          </h1>

          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
            Organize pré-produção, captações, edição e entrega sem perder o contexto de cada conteúdo.
          </p>
        </div>


        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/captacoes/nova"
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          >
            <Camera
              size={14}
            />

            Nova captação
          </Link>

          <Link
            href="/conteudos/novo"
            className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white hover:bg-blue-700"
          >
            <Plus
              size={14}
            />

            Nova demanda
          </Link>
        </div>
      </section>


      {/* ===================================================
          METRICAS
          =================================================== */}

      <section className="flex flex-wrap gap-2">
        <CompactMetric
          label="Demandas"
          value={
            contents.length
          }
          tone="blue"
        />

        <CompactMetric
          label="Pré-produção"
          value={
            preProduction
          }
          tone="violet"
        />

        <CompactMetric
          label="Agendadas"
          value={
            scheduled
          }
          tone="sky"
        />

        <CompactMetric
          label="Gravando"
          value={
            recording
          }
          tone="red"
        />

        <CompactMetric
          label="Em edição"
          value={
            editing
          }
          tone="fuchsia"
        />

        <CompactMetric
          label="Finalizadas"
          value={
            finished
          }
          tone="green"
        />


        {late >
        0 ? (
          <div className="flex min-w-[160px] items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
            <AlertTriangle
              size={15}
              className="text-red-600"
            />

            <div>
              <p className="text-lg font-bold leading-none text-red-700">
                {late}
              </p>

              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.07em] text-red-500">
                Fora do prazo
              </p>
            </div>
          </div>
        ) : null}
      </section>


      {/* ===================================================
          RECURSOS
          =================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database
                size={14}
                className="text-slate-500"
              />

              <h2 className="text-[11px] font-bold text-slate-900">
                Recursos dos clientes
              </h2>
            </div>

            <p className="mt-0.5 text-[9px] text-slate-400">
              Banco de dados, Drive e logos disponíveis antes da captação.
            </p>
          </div>

          <span className="text-[9px] font-semibold text-slate-400">
            {clients.length} clientes
          </span>
        </div>


        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {clients.map(
            (
              client
            ) => (
              <ClientResource
                key={
                  client.id
                }
                client={
                  client
                }
              />
            )
          )}
        </div>
      </section>


      {/* ===================================================
          AGENDA
          =================================================== */}

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <CalendarDays
                size={15}
              />
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-800">
                Agenda de captações
              </p>

              <p className="mt-0.5 text-[8px] text-slate-400">
                Datas sugeridas, confirmadas e reagendamentos.
              </p>
            </div>
          </div>

          <span className="text-[9px] font-bold text-blue-600">
            Abrir agenda
          </span>
        </summary>

        <div className="border-t border-slate-100 p-3">
          <FilmmakerCaptureAgenda />
        </div>
      </details>


      {/* ===================================================
          PERSONALIZAR
          =================================================== */}

      <details className="group rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-[10px] font-bold text-slate-700">
              Personalizar Kanban
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              Crie etapas extras para o fluxo audiovisual.
            </p>
          </div>

          <Plus
            size={14}
            className="text-slate-400"
          />
        </summary>


        <form
          action={
            createFilmmakerColumnAction
          }
          className="grid grid-cols-1 gap-2 border-t border-slate-100 p-3 md:grid-cols-[1fr_130px]"
        >
          <input
            name="title"
            required
            placeholder="Ex: Separar equipamento, Falta gravar..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
          />

          <button
            type="submit"
            className="h-9 rounded-lg bg-slate-900 px-4 text-[10px] font-bold text-white hover:bg-slate-800"
          >
            Criar coluna
          </button>
        </form>
      </details>


      {/* ===================================================
          KANBAN
          =================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4 px-1">
          <div>
            <h2 className="text-[12px] font-bold text-slate-900">
              Fluxo audiovisual
            </h2>

            <p className="mt-0.5 text-[9px] text-slate-400">
              Arraste cards entre etapas e colunas para reorganizar o fluxo.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
            <Film
              size={13}
            />

            {contents.length} demandas
          </div>
        </div>


        <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
          <div className="flex min-h-[640px] gap-3">
            {columns.map(
              (
                column
              ) => {
                const items =
                  contents.filter(
                    (
                      content
                    ) =>
                      content.status ===
                      column.statusKey
                  );

                return (
                  <DraggableColumn
                    key={
                      column.id
                    }
                    columnId={
                      column.id
                    }
                  >
                    <div className="flex w-[292px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <div className="border-b border-slate-200 bg-white px-3 py-3 pl-10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={[
                                  "h-2",
                                  "w-2",
                                  "shrink-0",
                                  "rounded-full",
                                  getColumnAccent(
                                    column.statusKey
                                  ),
                                ].join(" ")}
                              />

                              <h3 className="truncate text-[11px] font-bold text-slate-900">
                                {column.title}
                              </h3>

                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">
                                {items.length}
                              </span>
                            </div>

                            <p className="mt-1 truncate text-[8px] text-slate-400">
                              {getColumnDescription(
                                column.statusKey,
                                column.title
                              )}
                            </p>
                          </div>


                          <ColumnMenu
                            column={
                              column
                            }
                          />
                        </div>
                      </div>


                      <DroppableFilmmakerColumn
                        statusKey={
                          column.statusKey
                        }
                      >
                        <div className="min-h-[560px] space-y-3 p-3">
                          {items.length ===
                          0 ? (
                            <div className="flex min-h-[130px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 text-center">
                              <div>
                                <CheckCircle2
                                  size={18}
                                  className="mx-auto text-slate-300"
                                />

                                <p className="mt-2 text-[9px] font-semibold text-slate-400">
                                  Nenhuma demanda aqui
                                </p>
                              </div>
                            </div>
                          ) : (
                            items.map(
                              (
                                content
                              ) => (
                                <DraggableContentCard
                                  key={
                                    content.id
                                  }
                                  contentId={
                                    content.id
                                  }
                                >
                                  <FilmmakerCard
                                    content={
                                      content
                                    }
                                  />
                                </DraggableContentCard>
                              )
                            )
                          )}
                        </div>
                      </DroppableFilmmakerColumn>
                    </div>
                  </DraggableColumn>
                );
              }
            )}
          </div>
        </div>
      </section>
    </div>
  );
}