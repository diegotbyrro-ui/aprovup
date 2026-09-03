import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FolderOpen,
  ImageIcon,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";

import {
  formatLabel,
} from "@/lib/formatLabel";

import {
  prisma,
} from "@/lib/prisma";

import {
  SyncedHorizontalScroll,
} from "@/components/kanban/SyncedHorizontalScroll";

import {
  requireAgencyContext,
} from "@/lib/tenant";

import {
  archiveDesignColumnAction,
  createDesignColumnAction,
  moveDesignColumnAction,
  sendDesignQuestionAction,
  updateDesignColumnTitleAction,
} from "./actions";

import {
  DraggableDesignCard,
  DroppableDesignColumn,
} from "./DraggableDesignCard";


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



function getReturnNotice(
  content:
    any
) {
  const comments =
    Array.isArray(
      content.comments
    )
      ? content.comments
      : [];


  for (
    const item
    of comments
  ) {
    const message =
      String(
        item.message ||
        ""
      );


    if (
      item.authorRole ===
        "CLIENTE" &&
      message.startsWith(
        "ALTERACAO FINAL SOLICITADA PELO CLIENTE:"
      )
    ) {
      return {
        source:
          "CLIENTE",

        label:
          "Cliente pediu ajuste",

        message:
          message
            .replace(
              "ALTERACAO FINAL SOLICITADA PELO CLIENTE:",
              ""
            )
            .trim(),

        audioUrl:
          item.audioUrl ||
          "",

        audioMimeType:
          item.audioMimeType ||
          "",

        audioDurationMs:
          item.audioDurationMs ||
          null,
      };
    }


    if (
      item.authorRole ===
        "SOCIAL_MEDIA" &&
      message.startsWith(
        "AJUSTE INTERNO SOLICITADO PELA SOCIAL MEDIA:"
      )
    ) {
      return {
        source:
          "SOCIAL_MEDIA",

        label:
          "Social Media pediu ajuste",

        message:
          message
            .replace(
              "AJUSTE INTERNO SOLICITADO PELA SOCIAL MEDIA:",
              ""
            )
            .trim(),

        audioUrl:
          item.audioUrl ||
          "",

        audioMimeType:
          item.audioMimeType ||
          "",

        audioDurationMs:
          item.audioDurationMs ||
          null,
      };
    }

    if (
      item.authorRole ===
        "SOCIAL_MEDIA" &&
      message.startsWith(
        "RESPOSTA DA SOCIAL MEDIA:"
      )
    ) {
      return {
        source:
          "SOCIAL_MEDIA",

        label:
          "Social Media respondeu",

        message:
          message
            .replace(
              "RESPOSTA DA SOCIAL MEDIA:",
              ""
            )
            .trim(),
      };
    }
  }


  return null;
}


function shouldEmphasizeReturn(
  content:
    any
) {
  const notice =
    getReturnNotice(
      content
    );


  if (!notice) {
    return false;
  }


  if (
    content.area ===
      "DESIGN"
  ) {
    return (
      content.status ===
      "DESIGN_FAZENDO"
    );
  }


  if (
    content.area ===
      "FILMMAKER"
  ) {
    return [
      "FILMMAKER_PRE_PRODUCAO",
      "FILMMAKER_AGENDAMENTO",
      "FILMMAKER_GRAVANDO",
      "FILMMAKER_EDICAO",
    ].includes(
      content.status
    );
  }


  return false;
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


function isLate(
  content:
    any
) {
  return Boolean(
    content.plannedDate &&
    new Date(
      content.plannedDate
    ) <
      new Date() &&
    content.status !==
      "PRONTO_PARA_POSTAR"
  );
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
        "Liberadas para iniciar.",

      DESIGN_FAZENDO:
        "Em produção agora.",

      DESIGN_ANALISE:
        "Aguardando conferência.",

      DESIGN_DUVIDA:
        "Dependem da Social Media.",

      PRONTO_PARA_POSTAR:
        "Peças finalizadas.",
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

      DESIGN_FAZENDO:
        "bg-violet-500",

      DESIGN_ANALISE:
        "bg-amber-500",

      DESIGN_DUVIDA:
        "bg-orange-500",

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
            updateDesignColumnTitleAction.bind(
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
              moveDesignColumnAction.bind(
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
              moveDesignColumnAction.bind(
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
            archiveDesignColumnAction.bind(
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
  const databaseLink =
    client.databaseLink ||
    "";

  const driveLink =
    client.driveLink ||
    "";

  const logoLink =
    client.logoLink ||
    client.logoUrl ||
    "";

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
          {databaseLink ? (
            <a
              href={
                databaseLink
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


          {driveLink ? (
            <a
              href={
                driveLink
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


          {logoLink ? (
            <a
              href={
                logoLink
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


function DesignCard({
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


  const returnNotice =
    getReturnNotice(
      content
    );


  const emphasizeReturn =
    shouldEmphasizeReturn(
      content
    );


  return (
    <article
      className={[
        "group",
        "overflow-hidden",
        "rounded-xl",
        "border",
        "bg-white",
        "shadow-sm",
        "transition",
        "hover:shadow-md",

        emphasizeReturn
          ? returnNotice?.source ===
              "CLIENTE"
            ? "border-orange-300 ring-2 ring-orange-100 shadow-md"
            : "border-blue-300 ring-2 ring-blue-100 shadow-md"
          : "border-slate-200 hover:border-slate-300",
      ].join(" ")}
    >
      {emphasizeReturn &&
      returnNotice ? (
        <div
          className={[
            "flex",
            "items-center",
            "justify-between",
            "gap-2",
            "px-3",
            "py-2",
            "text-[8px]",
            "font-black",
            "uppercase",
            "tracking-[0.08em]",
            returnNotice.source ===
              "CLIENTE"
              ? "bg-orange-500 text-white"
              : "bg-blue-600 text-white",
          ].join(" ")}
        >
          <span>
            RETORNO RECEBIDO
          </span>

          <span className="opacity-90">
            {returnNotice.source ===
            "CLIENTE"
              ? "CLIENTE"
              : "SOCIAL MEDIA"}
          </span>
        </div>
      ) : null}


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
            <ImageIcon
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
        {content.format === "DEMANDA_EMERGENCIAL" ? (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2">
            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-red-700">
              DEMANDA EMERGENCIAL
            </p>

            <p className="mt-1 text-[9px] font-semibold text-red-900">
              Solicitado por: {content.responsible || "Social Media"}
            </p>
          </div>
        ) : null}


        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-500">
            <Clock3
              size={10}
            />

            {formatDate(
              content.plannedDate
            )}
          </span>

          <span className="rounded-md border border-blue-100 bg-blue-50 px-1.5 py-1 text-[8px] font-bold text-blue-600">
            {formatLabel(
              content.format ||
              "DESIGN"
            )}
          </span>
        </div>


        {(content.objective ||
          content.briefing) ? (
          <p className="mt-3 line-clamp-2 text-[9px] leading-relaxed text-slate-500">
            {content.objective ||
              content.briefing}
          </p>
        ) : null}

        {emphasizeReturn &&
        returnNotice ? (
          <div
            className={[
              "mt-3",
              "rounded-lg",
              "border",
              "p-2.5",

              returnNotice.source ===
                "CLIENTE"
                ? "border-orange-200 bg-orange-50"
                : "border-blue-200 bg-blue-50",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <p
                className={[
                  "text-[8px]",
                  "font-black",
                  "uppercase",
                  "tracking-[0.07em]",

                  returnNotice.source ===
                    "CLIENTE"
                    ? "text-orange-700"
                    : "text-blue-700",
                ].join(" ")}
              >
                {returnNotice.label}
              </p>

              <span
                className={[
                  "rounded-md",
                  "px-1.5",
                  "py-0.5",
                  "text-[7px]",
                  "font-black",

                  returnNotice.source ===
                    "CLIENTE"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700",
                ].join(" ")}
              >
                AÇÃO NECESSÁRIA
              </span>
            </div>

            <p
              className={[
                "mt-1.5",
                "line-clamp-4",
                "text-[9px]",
                "font-medium",
                "leading-relaxed",

                returnNotice.source ===
                  "CLIENTE"
                  ? "text-orange-900"
                  : "text-blue-900",
              ].join(" ")}
            >
              {returnNotice.message}
            </p>

            {returnNotice.audioUrl ? (
              <audio
                controls
                preload="metadata"
                src={
                  returnNotice.audioUrl
                }
                className="mt-2 h-8 w-full"
              >
                Seu navegador não suporta áudio.
              </audio>
            ) : null}
          </div>
        ) : null}



        <div className="mt-3 border-t border-slate-100 pt-3">
          <details className="group/question">
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
                sendDesignQuestionAction.bind(
                  null,
                  content.id
                )
              }
              className="mt-2 space-y-2"
            >
              <textarea
                name="message"
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


          <Link
            href={`/conteudos/${content.id}/visualizar`}
            className="mt-2 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-[9px] font-bold text-white transition hover:bg-slate-800"
          >
            Abrir conteúdo

            <ExternalLink
              size={11}
            />
          </Link>
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
    | "amber"
    | "orange"
    | "green";
}) {
  const dots = {
    blue:
      "bg-blue-500",

    violet:
      "bg-violet-500",

    amber:
      "bg-amber-500",

    orange:
      "bg-orange-500",

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


export default async function DesignPage() {
  const {
    agencyId,
  } =
    await requireAgencyContext();


  const columnCount =
    await prisma.designKanbanColumn.count();


  if (
    columnCount === 0
  ) {
    await prisma.designKanbanColumn.createMany({
      data: [
        {
          title:
            "Demandas",

          statusKey:
            "APROVADO",

          order:
            1,

          isActive:
            true,
        },

        {
          title:
            "Fazendo",

          statusKey:
            "DESIGN_FAZENDO",

          order:
            2,

          isActive:
            true,
        },

        {
          title:
            "Análise",

          statusKey:
            "DESIGN_ANALISE",

          order:
            3,

          isActive:
            true,
        },

        {
          title:
            "Dúvidas",

          statusKey:
            "DESIGN_DUVIDA",

          order:
            4,

          isActive:
            true,
        },

        {
          title:
            "Finalizado",

          statusKey:
            "PRONTO_PARA_POSTAR",

          order:
            5,

          isActive:
            true,
        },
      ],
    });
  }


  const columns =
    await prisma.designKanbanColumn.findMany({
      where: {
        isActive:
          true,
      },

      orderBy: {
        order:
          "asc",
      },
    });


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
        client: {
          agencyId,
        },
        area:
          "DESIGN",

        status: {
          in:
            statusKeys,
        },
      },

      include: {
        client:
          true,

        comments: {
          where: {
            authorRole: {
              in: [
                "CLIENTE",
                "SOCIAL_MEDIA",
              ],
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take:
            8,
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


  const clients =
    await prisma.client.findMany({
      where: {
        agencyId,
      },

      orderBy: {
        name:
          "asc",
      },
    });


  const doingCount =
    contents.filter(
      (
        content
      ) =>
        content.status ===
        "DESIGN_FAZENDO"
    ).length;


  const analysisCount =
    contents.filter(
      (
        content
      ) =>
        content.status ===
        "DESIGN_ANALISE"
    ).length;


  const questionCount =
    contents.filter(
      (
        content
      ) =>
        content.status ===
        "DESIGN_DUVIDA"
    ).length;


  const doneCount =
    contents.filter(
      (
        content
      ) =>
        content.status ===
        "PRONTO_PARA_POSTAR"
    ).length;


  const lateCount =
    contents.filter(
      (
        content
      ) =>
        isLate(
          content
        )
    ).length;


  return (
    <div className="space-y-4">
      {/* ===================================================
          HEADER
          =================================================== */}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-violet-600">
            Produção criativa
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Design
          </h1>

          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
            Organize as peças, acompanhe o fluxo e mova as demandas entre as etapas de produção.
          </p>
        </div>


        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/conteudos"
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          >
            Ver conteúdos
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
          RESUMO
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
          label="Fazendo"
          value={
            doingCount
          }
          tone="violet"
        />

        <CompactMetric
          label="Análise"
          value={
            analysisCount
          }
          tone="amber"
        />

        <CompactMetric
          label="Dúvidas"
          value={
            questionCount
          }
          tone="orange"
        />

        <CompactMetric
          label="Finalizadas"
          value={
            doneCount
          }
          tone="green"
        />


        {lateCount >
        0 ? (
          <div className="flex min-w-[160px] items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
            <AlertTriangle
              size={15}
              className="text-red-600"
            />

            <div>
              <p className="text-lg font-bold leading-none text-red-700">
                {lateCount}
              </p>

              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.07em] text-red-500">
                Fora do prazo
              </p>
            </div>
          </div>
        ) : null}
      </section>


      {/* ===================================================
          RECURSOS DOS CLIENTES
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
              Banco de dados, Drive e logos sem ocupar uma coluna do Kanban.
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
          CRIAR COLUNA
          =================================================== */}

      <details className="group rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-[10px] font-bold text-slate-700">
              Personalizar Kanban
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              Crie uma etapa personalizada quando necessário.
            </p>
          </div>

          <Plus
            size={14}
            className="text-slate-400"
          />
        </summary>


        <form
          action={
            createDesignColumnAction
          }
          className="grid grid-cols-1 gap-2 border-t border-slate-100 p-3 md:grid-cols-[1fr_130px]"
        >
          <input
            name="title"
            required
            placeholder="Ex: Banco de imagens, Programado..."
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
              Fluxo de produção
            </h2>

            <p className="mt-0.5 text-[9px] text-slate-400">
              Arraste os cards entre as colunas para atualizar o status.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
            <Palette
              size={13}
            />

            {contents.length} demandas
          </div>
        </div>


        <SyncedHorizontalScroll
          alwaysShowTop
          className="pb-2 [scrollbar-width:thin]"
        >
          <div className="flex min-h-[620px] gap-3">
            {columns.map(
              (
                column
              ) => {
                const items =
                  contents
                    .filter(
                      (
                        content
                      ) =>
                        content.status ===
                        column.statusKey
                    )
                    .sort(
                      (
                        a,
                        b
                      ) => {
                        const aPriority =
                          shouldEmphasizeReturn(
                            a
                          )
                            ? 1
                            : 0;

                        const bPriority =
                          shouldEmphasizeReturn(
                            b
                          )
                            ? 1
                            : 0;

                        return (
                          bPriority -
                          aPriority
                        );
                      }
                    );

                return (
                  <div
                    key={
                      column.id
                    }
                    className="flex w-[292px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <div className="border-b border-slate-200 bg-white px-3 py-3">
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


                    <DroppableDesignColumn
                      statusKey={
                        column.statusKey
                      }
                    >
                      <div className="min-h-[540px] space-y-3 p-3">
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
                              <DraggableDesignCard
                                key={
                                  content.id
                                }
                                contentId={
                                  content.id
                                }
                              >
                                <DesignCard
                                  content={
                                    content
                                  }
                                />
                              </DraggableDesignCard>
                            )
                          )
                        )}
                      </div>
                    </DroppableDesignColumn>
                  </div>
                );
              }
            )}
          </div>
        </SyncedHorizontalScroll>
      </section>
    </div>
  );
}