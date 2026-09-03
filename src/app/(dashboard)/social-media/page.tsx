import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  MessageCircleQuestion,
  Plus,
  Send,
  UsersRound,
  Video,
} from "lucide-react";

import {
  prisma,
} from "@/lib/prisma";

import {
  hasPermission,
  requirePermission,
} from "@/lib/userAccess";

import {
  isDirector,
  isSocialMedia,
  requireCurrentUser,
} from "@/lib/auth";

import {
  answerDesignQuestionAction,
  answerFilmmakerQuestionAction,
  sendContentToFinalApprovalAction,
} from "./actions";

import {
  SocialApprovalLinkButton,
} from "./SocialApprovalLinkButton";

import {
  InternalReviewAdjustment,
} from "./InternalReviewAdjustment";


function normalizeText(
  value?:
    | string
    | null
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[̀-ͯ]/g,
      ""
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
  value?:
    | string
    | null
) {
  const name =
    cleanDemoName(
      value
    ) ||
    "Cliente";

  return name
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


function relativeDate(
  date?:
    | Date
    | null
) {
  if (!date) {
    return "Sem data";
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const target =
    new Date(
      date
    );

  target.setHours(
    0,
    0,
    0,
    0
  );

  const diff =
    Math.round(
      (
        target.getTime() -
        today.getTime()
      ) /
      86400000
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


function statusLabel(
  status:
    string
) {
  const labels:
    Record<
      string,
      string
    > = {
      APROVADO:
        "Aprovado",

      DESIGN_FAZENDO:
        "Em design",

      DESIGN_ANALISE:
        "Revisão design",

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
        "Revisão vídeo",

      FILMMAKER_DUVIDA_SOCIAL:
        "Dúvida",

      ENVIADO_CLIENTE:
        "Com cliente",

      ALTERACAO_SOLICITADA:
        "Alteração",

      PRONTO_PARA_POSTAR:
        "Pronto",
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


function statusStyle(
  status:
    string
) {
  if (
    status ===
    "PRONTO_PARA_POSTAR"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }


  if (
    status ===
    "ENVIADO_CLIENTE"
  ) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }


  if (
    status ===
    "ALTERACAO_SOLICITADA"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }


  if (
    status.includes(
      "FILMMAKER"
    )
  ) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }


  if (
    status.includes(
      "DESIGN"
    )
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }


  return "border-slate-200 bg-slate-50 text-slate-600";
}


function MetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label:
    string;

  value:
    number;

  description:
    string;

  icon:
    React.ReactNode;

  tone:
    "blue"
    | "amber"
    | "orange"
    | "green";
}) {
  const styles = {
    blue:
      "bg-blue-50 text-blue-600",

    amber:
      "bg-amber-50 text-amber-600",

    orange:
      "bg-orange-50 text-orange-600",

    green:
      "bg-emerald-50 text-emerald-600",
  };


  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
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
            styles[
              tone
            ],
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <p className="mt-2 text-[9px] text-slate-400">
        {description}
      </p>
    </div>
  );
}


type ContentPreviewData = {
  area: string | null;
  coverImageUrl: string | null;
  finalCoverUrl: string | null;
};

type ContentRowData =
  ContentPreviewData & {
    id: string;
    title: string | null;
    status: string;
    plannedDate: Date | null;

    client?:
      | {
          name: string | null;
        }
      | null;
  };

type QuestionContentData =
  ContentRowData & {
    comments: Array<{
      message: string;
    }>;
  };


function ContentPreview({
  content,
}: {
  content:
    ContentPreviewData;
}) {
  const preview =
    content.coverImageUrl ||
    content.finalCoverUrl ||
    "";

  if (preview) {
    return (
      <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <img
          src={
            preview
          }
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }


  return (
    <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
      {content.area ===
      "FILMMAKER" ? (
        <Video
          size={16}
        />
      ) : (
        <ImageIcon
          size={16}
        />
      )}
    </div>
  );
}


function ContentRow({
  content,
}: {
  content:
    ContentRowData;
}) {
  return (
    <Link
      href={`/conteudos/${content.id}`}
      className="group flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
    >
      <ContentPreview
        content={
          content
        }
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[11px] font-bold text-slate-900 group-hover:text-blue-600">
            {cleanDemoName(
              content.title
            )}
          </p>

          {isDemoName(
            content.client?.name
          ) ? (
            <span className="shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[7px] font-bold text-violet-700">
              DEMO
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[8px] text-slate-400">
          <span>
            {cleanDemoName(
              content.client?.name
            )}
          </span>

          <span>
            •
          </span>

          <span>
            {content.area ===
            "FILMMAKER"
              ? "Filmaker"
              : "Design"}
          </span>

          <span>
            •
          </span>

          <span>
            {relativeDate(
              content.plannedDate
            )}
          </span>
        </div>
      </div>


      <span
        className={[
          "shrink-0",
          "rounded-md",
          "border",
          "px-2",
          "py-1",
          "text-[8px]",
          "font-bold",
          statusStyle(
            content.status
          ),
        ].join(" ")}
      >
        {statusLabel(
          content.status
        )}
      </span>

      <ArrowUpRight
        size={13}
        className="shrink-0 text-slate-300 group-hover:text-slate-600"
      />
    </Link>
  );
}


function DesignQuestionCard({
  content,
}: {
  content:
    QuestionContentData;
}) {
  const filmmakerQuestion =
    content.status ===
      "FILMMAKER_DUVIDA_SOCIAL" ||
    content.area ===
      "FILMMAKER";


  const lastQuestion =
    content.comments.find(
      (comment) =>
        comment.message.startsWith(
          "DÚVIDA DO DESIGN:"
        ) ||
        comment.message.startsWith(
          "DÚVIDA PARA SOCIAL MEDIA:"
        )
    );


  const question =
    lastQuestion
      ? lastQuestion.message
          .replace(
            "DÚVIDA DO DESIGN:",
            ""
          )
          .replace(
            "DÚVIDA PARA SOCIAL MEDIA:",
            ""
          )
          .trim()
      : "Sem descrição da dúvida.";


  const preview =
    content.coverImageUrl ||
    content.finalCoverUrl ||
    "";


  return (
    <article className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-amber-100 bg-amber-50/60 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-amber-100 bg-white">
          {preview ? (
            <img
              src={
                preview
              }
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <MessageCircleQuestion
              size={16}
              className="text-amber-600"
            />
          )}
        </div>


        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[7px] font-bold text-amber-700">
              {filmmakerQuestion
                ? "FILMMAKER"
                : "DESIGN"}
            </span>

            {isDemoName(
              content.client?.name
            ) ? (
              <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[7px] font-bold text-violet-700">
                DEMO
              </span>
            ) : null}
          </div>


          <h3 className="mt-1.5 truncate text-[11px] font-bold text-slate-900">
            {cleanDemoName(
              content.title
            )}
          </h3>

          <p className="mt-0.5 truncate text-[8px] text-slate-400">
            {cleanDemoName(
              content.client?.name
            )}
          </p>
        </div>
      </div>


      <div className="p-3">
        <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-amber-600">
          Dúvida recebida
        </p>

        <p className="mt-1.5 min-h-[42px] text-[10px] leading-relaxed text-slate-700">
          {question}
        </p>


        <form
          action={
            filmmakerQuestion
              ? answerFilmmakerQuestionAction.bind(
                  null,
                  content.id
                )
              : answerDesignQuestionAction.bind(
                  null,
                  content.id
                )
          }
          className="mt-3 space-y-2"
        >
          <textarea
            name="answer"
            required
            rows={3}
            placeholder={
              filmmakerQuestion
                ? "Responda para liberar o Filmmaker..."
                : "Responda para liberar o Design..."
            }
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[9px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
          />

          <button
            type="submit"
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-[9px] font-bold text-white hover:bg-slate-800"
          >
            <Send
              size={11}
            />

            Responder e devolver
          </button>
        </form>


        <Link
          href={`/conteudos/${content.id}`}
          className="mt-2 flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[8px] font-bold text-slate-500 hover:bg-slate-50"
        >
          Abrir conteúdo

          <ExternalLink
            size={10}
          />
        </Link>
      </div>
    </article>
  );
}


export default async function SocialMediaPage({
  searchParams,
}: {
  searchParams?: Promise<{
    cliente?: string;
  }>;
}) {
  const currentUser =
    await requirePermission(
      "social.view"
    );

  const canManageSocial =
    hasPermission(
      currentUser,
      "social.manage"
    );
const query =
    searchParams
      ? await searchParams
      : {};


  const clientId =
    String(
      query?.cliente ||
      ""
    ).trim();


  if (!clientId) {
    redirect(
      "/clientes"
    );
  }


  const selectedClient =
    await prisma.client.findUnique({
      where: {
        id:
          clientId,
      },
    });


  if (!selectedClient) {
    redirect(
      "/clientes"
    );
  }


  if (
    !isDirector(
      currentUser.role
    ) &&
    !canManageSocial
  ) {
    const responsible =
      normalizeText(
        selectedClient.internalResponsible
      );

    const userName =
      normalizeText(
        currentUser.name
      );

    const userEmail =
      normalizeText(
        currentUser.email
      );


    const allowed =
      (
        Boolean(
          userName
        ) &&
        responsible.includes(
          userName
        )
      ) ||
      (
        Boolean(
          userEmail
        ) &&
        responsible.includes(
          userEmail
        )
      );


    if (!allowed) {
      redirect(
        "/clientes"
      );
    }
  }


  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );


  const [
    doubts,
    clientReturns,
    waitingClientCount,
    readyCount,
    futureCaptures,
    waitingClientContents,
    finalApprovalContents,
    activeClients,
  ] =
    await prisma.$transaction([
      prisma.content.findMany({
        where: {
          clientId,

          OR: [
            {
              area:
                "DESIGN",

              status:
                "DESIGN_DUVIDA",
            },

            {
              area:
                "FILMMAKER",

              status:
                "FILMMAKER_DUVIDA_SOCIAL",
            },
          ],
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

        orderBy: {
          updatedAt:
            "desc",
        },

        take:
          8,
      }),


      prisma.comment.findMany({
        where: {
          authorRole:
            "CLIENTE",

          content: {
            is: {
              clientId,
            },
          },

          OR: [
            {
              message: {
                startsWith:
                  "APROVAÇÃO DO CLIENTE:",
              },
            },

            {
              message: {
                startsWith:
                  "APROVACAO DO CLIENTE:",
              },
            },

            {
              message: {
                startsWith:
                  "ALTERAÇÃO SOLICITADA PELO CLIENTE:",
              },
            },

            {
              message: {
                startsWith:
                  "ALTERACAO SOLICITADA PELO CLIENTE:",
              },
            },

            {
              message: {
                startsWith:
                  "APROVACAO FINAL:",
              },
            },

            {
              message: {
                startsWith:
                  "ALTERACAO FINAL SOLICITADA PELO CLIENTE:",
              },
            },
          ],
        },

        include: {
          content: {
            include: {
              client:
                true,
            },
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take:
          8,
      }),


      prisma.content.count({
        where: {
          clientId,

          status:
            "ENVIADO_CLIENTE",
        },
      }),


      prisma.content.count({
        where: {
          clientId,

          status:
            "PRONTO_PARA_POSTAR",
        },
      }),


      prisma.captureSchedule.count({
        where: {
          clientId,

          status: {
            not:
              "CANCELADO",
          },

          scheduledAt: {
            gte:
              today,
          },
        },
      }),


      prisma.content.findMany({
        where: {
          clientId,

          status:
            "ENVIADO_CLIENTE",
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
          5,
      }),


      prisma.content.findMany({
        where: {
          clientId,

          status: {
            in: [
              "REVISAO_INTERNA",
              "DESIGN_ANALISE",
              "FILMMAKER_ANALISE",
              "ENVIADO_CLIENTE",
              "PRONTO_PARA_POSTAR",
            ],
          },
        },

        include: {
          client:
            true,

          approvals: {
            orderBy: {
              createdAt:
                "desc",
            },

            take:
              3,
          },
        },

        orderBy: {
          updatedAt:
            "desc",
        },

        take:
          12,
      }),


      prisma.client.count(),
    ]);


  const finalApprovalQueue =
    finalApprovalContents.filter(
      (content) => {
        const hasFinal =
          Boolean(
            content.finalMediaUrl ||
            content.finalCoverUrl
          );

        const alreadyInFlow =
          [
            "ENVIADO_CLIENTE",
            "PRONTO_PARA_POSTAR",
          ].includes(
            content.status
          );

        return (
          hasFinal ||
          alreadyInFlow
        );
      }
    );
  const clientQuestions =
    clientReturns.filter(
      (comment) => {
        const value =
          normalizeText(
            comment.message
          );

        return (
          value.includes(
            "duvida"
          ) ||
          value.includes(
            "pergunta"
          ) ||
          value.includes(
            "ajuste"
          ) ||
          value.includes(
            "alteracao"
          )
        );
      }
    );




  /*
   * Esta lista representa apenas retornos do cliente
   * que ainda exigem alguma ação.
   *
   * Comentarios e audios permanecem salvos no historico.
   * Aqui filtramos apenas o que deve continuar aparecendo
   * como pendencia na dashboard da Social Media.
   */
  const activeClientQuestions =
    clientQuestions.filter(
      (comment) => {
        const normalized =
          normalizeText(
            comment.message
          );

        const isAdjustment =
          normalized.includes(
            "ajuste"
          ) ||
          normalized.includes(
            "alteracao"
          );

        if (isAdjustment) {
          return (
            comment.content?.status ===
            "ALTERACAO_SOLICITADA"
          );
        }

        return true;
      }
    );

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {selectedClient.logoUrl ? (
              <img
                src={
                  selectedClient.logoUrl
                }
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-bold text-slate-500">
                {getInitials(
                  selectedClient.name
                )}
              </span>
            )}
          </div>


          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-blue-500">
              Cliente selecionado
            </p>

            <div className="mt-0.5 flex items-center gap-2">
              <h2 className="truncate text-[13px] font-bold text-slate-900">
                {cleanDemoName(
                  selectedClient.name
                )}
              </h2>

              {isDemoName(
                selectedClient.name
              ) ? (
                <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[7px] font-bold text-violet-700">
                  DEMO
                </span>
              ) : null}
            </div>

            <p className="mt-0.5 truncate text-[9px] text-slate-400">
              {selectedClient.segment ||
                "Sem segmento definido"}
            </p>
          </div>
        </div>


        <Link
          href="/clientes"
          className="flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-600 hover:bg-slate-50"
        >
          Trocar cliente
        </Link>
      </section>


      {/* ===================================================
          HEADER
          =================================================== */}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-600">
            Gestão editorial
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Social Media
          </h1>

          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
            Acompanhe planejamento, produção e aprovações de {cleanDemoName(
              selectedClient.name
            )}.
          </p>
        </div>


        <div className="flex flex-wrap items-center gap-2">
{canManageSocial ? (
          <Link
            href={`/conteudos/novo?cliente=${clientId}`}
            className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-[9px] font-bold text-white hover:bg-blue-700"
          >
            <Plus
              size={13}
            />

            Novo conteúdo
          </Link>
        ) : null}
        </div>
      </section>


      {/* ===================================================
          METRICAS
          =================================================== */}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Dúvidas"
          value={
            doubts.length
          }
          description="Pendências de Design e Filmmaker"
          icon={
            <MessageCircleQuestion
              size={16}
            />
          }
          tone="amber"
        />

        <MetricCard
          label="Com cliente"
          value={
            waitingClientCount
          }
          description="Materiais aguardando retorno"
          icon={
            <Clock3
              size={16}
            />
          }
          tone="orange"
        />

        <MetricCard
          label="Prontos"
          value={
            readyCount
          }
          description="Conteúdos liberados para publicação"
          icon={
            <CheckCircle2
              size={16}
            />
          }
          tone="green"
        />

        <MetricCard
          label="Captações"
          value={
            futureCaptures
          }
          description="Próximas captações deste cliente"
          icon={
            <Video
              size={16}
            />
          }
          tone="blue"
        />
      </section>


      {/* ===================================================
          ATALHOS
          =================================================== */}

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Link
          href={`/calendario-editorial?cliente=${clientId}`}
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <CalendarDays
              size={16}
            />
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-900">
              Calendário editorial
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              Planejamento mensal
            </p>
          </div>
        </Link>


        <Link
          href="/social-media/agendamentos"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Video
              size={16}
            />
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-900">
              Agendamentos
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              Organizar captações
            </p>
          </div>
        </Link>


        <Link
          href="/social-media/avisos"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Bell
              size={16}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-900">
              Central de avisos
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              Aprovações, dúvidas e ajustes
            </p>
          </div>

          {clientReturns.length > 0 ? (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[8px] font-black text-white">
              {clientReturns.length}
            </span>
          ) : null}
        </Link>


        <Link
          href="/aprovacoes"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2
              size={16}
            />
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-900">
              Aprovações
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              Retornos dos clientes
            </p>
          </div>
        </Link>
      </section>


      {/* ===================================================
          2a ETAPA DE APROVACAO
          =================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CheckCircle2
                  size={15}
                />
              </div>

              <div>
                <h2 className="text-[13px] font-bold text-slate-900">
                  2ª Etapa de Aprovação
                </h2>

                <p className="mt-0.5 text-[9px] text-slate-400">
                  Confira o material final e a legenda antes de enviar ao cliente.
                </p>
              </div>
            </div>
          </div>

          <span className="w-fit rounded-md bg-blue-50 px-2.5 py-1 text-[8px] font-bold text-blue-700">
            {finalApprovalQueue.length} materiais
          </span>
        </div>


        {finalApprovalQueue.length === 0 ? (
          <div className="mt-4 flex min-h-[130px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
            <div className="text-center">
              <CheckCircle2
                size={22}
                className="mx-auto text-slate-300"
              />

              <p className="mt-2 text-[10px] font-bold text-slate-600">
                Nenhum material final aguardando envio
              </p>

              <p className="mt-1 text-[8px] text-slate-400">
                Quando Design ou Filmmaker finalizarem, o conteúdo aparecerá aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {finalApprovalQueue.map(
              (content) => {
                const mediaUrl =
                  content.finalMediaUrl ||
                  content.finalCoverUrl ||
                  "";

                const hasCaption =
                  Boolean(
                    String(
                      content.caption ||
                      ""
                    ).trim()
                  );

                const productionReady =
                  [
                    "REVISAO_INTERNA",
                    "DESIGN_ANALISE",
                    "FILMMAKER_ANALISE",
                  ].includes(
                    content.status
                  );

                const canSend =
                  productionReady &&
                  Boolean(
                    mediaUrl
                  ) &&
                  hasCaption;

                const waiting =
                  content.status ===
                  "ENVIADO_CLIENTE";

                const adjustment =
                  content.status ===
                  "ALTERACAO_SOLICITADA";

                const approved =
                  content.status ===
                  "PRONTO_PARA_POSTAR";

                const pendingApproval =
                  content.approvals.find(
                    (approval) =>
                      approval.status ===
                      "PENDENTE"
                  );


                return (
                  <article
                    key={
                      content.id
                    }
                    className="self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="grid items-start lg:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="m-3 self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="flex h-11 items-center gap-2.5 border-b border-slate-100 px-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-[9px] font-black text-white">
                            {selectedClient.name
                              ?.slice(
                                0,
                                1
                              )
                              .toUpperCase() ||
                              "I"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[9px] font-black text-slate-900">
                              {cleanDemoName(
                                selectedClient.name
                              ) ||
                                "Cliente"}
                            </p>

                            <p className="text-[7px] font-medium text-slate-400">
                              Instagram
                            </p>
                          </div>

                          <span className="text-[13px] font-black tracking-[1px] text-slate-700">
                            •••
                          </span>
                        </div>

                        <div className="aspect-[9/16] overflow-hidden bg-black">
                        {mediaUrl ? (
                          content.area ===
                          "FILMMAKER" ? (
                            <video
                              src={
                                mediaUrl
                              }
                              controls
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <img
                              src={
                                mediaUrl
                              }
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-500">
                            {content.area ===
                            "FILMMAKER" ? (
                              <Video
                                size={22}
                              />
                            ) : (
                              <ImageIcon
                                size={22}
                              />
                            )}

                            <span className="text-[8px] font-bold">
                              SEM PREVIEW
                            </span>
                          </div>
                        )}
                      </div>


                                            <div className="border-t border-slate-100 bg-white px-3 py-2.5">
                        <div className="flex items-center gap-3 text-[17px] leading-none text-slate-900">
                          <span>
                            ♡
                          </span>

                          <span className="text-[15px]">
                            ○
                          </span>

                          <span className="-rotate-12 text-[16px]">
                            ↗
                          </span>

                          <span className="ml-auto text-[15px]">
                            ▱
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[8px] leading-relaxed text-slate-600">
                          <strong className="mr-1 text-slate-900">
                            {cleanDemoName(
                              selectedClient.name
                            ) ||
                              "Cliente"}
                          </strong>

                          {content.caption ||
                            "Prévia da legenda do conteúdo."}
                        </p>

                        <p className="mt-1.5 text-[7px] uppercase tracking-wide text-slate-400">
                          Ver todos os comentários
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col p-4 pt-0 lg:py-4 lg:pl-1 lg:pr-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-white px-1.5 py-1 text-[7px] font-bold text-slate-600">
                            {content.area ===
                            "FILMMAKER"
                              ? "FILMMAKER"
                              : content.area ===
                                  "DESIGN"
                                ? "DESIGN"
                                : "CONTEÚDO"}
                          </span>

                          <span
                            className={[
                              "rounded-md",
                              "border",
                              "px-1.5",
                              "py-1",
                              "text-[7px]",
                              "font-bold",
                              statusStyle(
                                content.status
                              ),
                            ].join(" ")}
                          >
                            {statusLabel(
                              content.status
                            )}
                          </span>
                        </div>


                        <h3 className="mt-2 truncate text-[11px] font-bold text-slate-900">
                          {cleanDemoName(
                            content.title
                          )}
                        </h3>


                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[7px] font-bold uppercase tracking-[0.08em] text-slate-400">
                              Legenda
                            </p>

                            <span
                              className={
                                hasCaption
                                  ? "text-[7px] font-bold text-emerald-600"
                                  : "text-[7px] font-bold text-red-500"
                              }
                            >
                              {hasCaption
                                ? "PRONTA"
                                : "PENDENTE"}
                            </span>
                          </div>

                          <p className="mt-1.5 line-clamp-3 text-[9px] leading-relaxed text-slate-600">
                            {hasCaption
                              ? content.caption
                              : "Finalize a legenda antes de enviar ao cliente."}
                          </p>
                        </div>


                        <div className="mt-auto pt-3">
                          {canSend ? (
                            <div className="space-y-2">
                              <InternalReviewAdjustment
                                contentId={
                                  content.id
                                }
                                clientId={
                                  clientId
                                }
                              />
                              <form
                                action={
                                  sendContentToFinalApprovalAction.bind(
                                    null,
                                    content.id,
                                    clientId
                                  )
                                }
                              >
                                <button
                                  type="submit"
                                  className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-[9px] font-bold text-white transition hover:bg-blue-700"
                                >
                                  <Send
                                    size={12}
                                  />

                                  Enviar para 2ª aprovação
                                </button>
                              </form>
                            </div>
                          ) : waiting ? (
                            pendingApproval ? (
                              <SocialApprovalLinkButton
                                path={
                                  `/aprovacao-final/${pendingApproval.token}`
                                }
                              />
                            ) : (
                              <div className="flex h-9 items-center justify-center rounded-lg bg-orange-50 text-[8px] font-bold text-orange-700">
                                Aguardando cliente
                              </div>
                            )
                          ) : adjustment ? (
                            <Link
                              href={
                                `/conteudos/${content.id}`
                              }
                              className="flex h-9 items-center justify-center rounded-lg bg-orange-50 px-3 text-[9px] font-bold text-orange-700 hover:bg-orange-100"
                            >
                              Cliente pediu ajuste
                            </Link>
                          ) : approved ? (
                            <Link
                              href="/pronto-para-postar"
                              className="flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 text-[9px] font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              <CheckCircle2
                                size={12}
                              />

                              Aprovado • Pronto para postar
                            </Link>
                          ) : (
                            <div className="flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[8px] font-bold text-slate-400">
                              {!mediaUrl
                                ? "Material final pendente"
                                : !hasCaption
                                  ? "Legenda pendente"
                                  : "Aguardando produção"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>


      {/* ===================================================
          DUVIDAS E RETORNOS DOS CLIENTES
          =================================================== */}



      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[12px] font-bold text-slate-900">
                Decisões pendentes
              </h2>

              <p className="mt-0.5 text-[9px] text-slate-400">
                Responda Design ou Filmmaker para liberar a produção.
              </p>
            </div>

            <span className="rounded-md bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-600">
              {doubts.length} pendentes
            </span>
          </div>


          {doubts.length ===
          0 ? (
            <div className="mt-4 flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <div className="text-center">
                <CheckCircle2
                  size={24}
                  className="mx-auto text-emerald-400"
                />

                <p className="mt-2 text-[10px] font-bold text-slate-600">
                  Nenhuma decisão pendente
                </p>

                <p className="mt-1 text-[8px] text-slate-400">
                  A produção pode seguir normalmente.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {doubts.map(
                (
                  content
                ) => (
                  <DesignQuestionCard
                    key={
                      content.id
                    }
                    content={
                      content
                    }
                  />
                )
              )}
            </div>
          )}
        </div>


        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <MessageCircleQuestion
                  size={16}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[12px] font-bold text-slate-900">
                    Dúvidas e ajustes dos clientes
                  </h2>

                  {activeClientQuestions.length > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[7px] font-black text-white">
                      {activeClientQuestions.length}
                    </span>
                  ) : null}
                </div>

                <p className="mt-0.5 text-[9px] text-slate-400">
                  Perguntas e ajustes que precisam da sua atenção.
                </p>
              </div>
            </div>

            <Link
              href="/social-media/avisos"
              className="shrink-0 text-[8px] font-bold text-blue-600 hover:underline"
            >
              Ver todos
            </Link>
          </div>


          {activeClientQuestions.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center p-4">
              <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                  <CheckCircle2
                    size={18}
                  />
                </div>

                <p className="mt-3 text-[10px] font-bold text-slate-600">
                  Nenhuma dúvida ou ajuste
                </p>

                <p className="mt-1 text-[8px] text-slate-400">
                  Nenhum retorno do cliente exige sua atenção agora.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeClientQuestions
                .slice(
                  0,
                  4
                )
                .map(
                  (comment) => {
                    const originalMessage =
                      String(
                        comment.message ||
                        ""
                      );

                    const normalized =
                      normalizeText(
                        originalMessage
                      );

                    const adjustment =
                      normalized.includes(
                        "ajuste"
                      ) ||
                      normalized.includes(
                        "alteracao"
                      );

                    const cleanMessage =
                      originalMessage
                        .replace(
                          /^ALTERAÇÃO FINAL SOLICITADA PELO CLIENTE:\s*/i,
                          ""
                        )
                        .replace(
                          /^ALTERACAO FINAL SOLICITADA PELO CLIENTE:\s*/i,
                          ""
                        )
                        .replace(
                          /^ALTERAÇÃO SOLICITADA PELO CLIENTE:\s*/i,
                          ""
                        )
                        .replace(
                          /^ALTERACAO SOLICITADA PELO CLIENTE:\s*/i,
                          ""
                        )
                        .replace(
                          /^DÚVIDA DO CLIENTE:\s*/i,
                          ""
                        )
                        .replace(
                          /^DUVIDA DO CLIENTE:\s*/i,
                          ""
                        )
                        .trim();

                    return (
                      <Link
                        key={
                          comment.id
                        }
                        href={
                          comment.contentId
                            ? `/conteudos/${comment.contentId}`
                            : "/social-media/avisos"
                        }
                        className="group flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50"
                      >
                        <div
                          className={[
                            "mt-0.5",
                            "flex",
                            "h-9",
                            "w-9",
                            "shrink-0",
                            "items-center",
                            "justify-center",
                            "rounded-xl",
                            adjustment
                              ? "bg-orange-50 text-orange-600"
                              : "bg-violet-50 text-violet-600",
                          ].join(" ")}
                        >
                          {adjustment ? (
                            <AlertCircle
                              size={15}
                            />
                          ) : (
                            <MessageCircleQuestion
                              size={15}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="max-w-[180px] truncate text-[10px] font-bold text-slate-900 group-hover:text-blue-600">
                              {cleanDemoName(
                                comment.content?.title
                              ) ||
                                "Conteúdo"}
                            </p>

                            <span
                              className={[
                                "rounded-md",
                                "px-1.5",
                                "py-0.5",
                                "text-[7px]",
                                "font-black",
                                adjustment
                                  ? "bg-orange-50 text-orange-700"
                                  : "bg-violet-50 text-violet-700",
                              ].join(" ")}
                            >
                              {adjustment
                                ? "AJUSTE"
                                : "DÚVIDA"}
                            </span>
                          </div>

                          <p className="mt-1.5 line-clamp-2 text-[9px] leading-relaxed text-slate-600">
                            {cleanMessage ||
                              "Cliente enviou uma solicitação."}
                          </p>

                          {comment.audioUrl ? (
                            <audio
                              controls
                              preload="metadata"
                              src={
                                comment.audioUrl
                              }
                              className="mt-2 h-8 w-full"
                            >
                              Seu navegador não suporta áudio.
                            </audio>
                          ) : null}

                          <div className="mt-2 flex items-center gap-1.5 text-[8px] text-slate-400">
                            <span className="font-semibold text-slate-500">
                              {cleanDemoName(
                                comment.content?.client?.name
                              ) ||
                                "Cliente"}
                            </span>

                            <span>
                              •
                            </span>

                            <span>
                              {formatDate(
                                comment.createdAt
                              )}
                            </span>
                          </div>
                        </div>

                        <ArrowUpRight
                          size={13}
                          className="mt-1 shrink-0 text-slate-300 transition group-hover:text-blue-600"
                        />
                      </Link>
                    );
                  }
                )}

              {activeClientQuestions.length > 4 ? (
                <Link
                  href="/social-media/avisos"
                  className="flex h-10 items-center justify-center text-[8px] font-bold text-blue-600 hover:bg-blue-50/50"
                >
                  Ver mais {activeClientQuestions.length - 4} retorno(s)
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </section>


      {/* ===================================================
          CLIENTE + PRONTO
          =================================================== */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[12px] font-bold text-slate-900">
                Aguardando cliente
              </h2>

              <p className="mt-0.5 text-[9px] text-slate-400">
                Materiais enviados e ainda pendentes de retorno.
              </p>
            </div>

            <Link
              href="/aprovacoes"
              className="text-[8px] font-bold text-blue-600 hover:underline"
            >
              Ver aprovações
            </Link>
          </div>


          <div className="mt-2">
            {waitingClientContents.length ===
            0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-[9px] text-slate-400">
                Nenhum retorno pendente.
              </div>
            ) : (
              waitingClientContents.map(
                (
                  content
                ) => (
                  <ContentRow
                    key={
                      content.id
                    }
                    content={
                      content
                    }
                  />
                )
              )
            )}
          </div>
        </div>


        <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm xl:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-400">
                Final da operação
              </p>

              <h2 className="mt-1 text-lg font-bold">
                Prontos para postar
              </h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2
                size={18}
              />
            </div>
          </div>


          <p className="mt-2 max-w-sm text-[9px] leading-relaxed text-slate-400">
            Conteúdos finalizados que já podem seguir para publicação.
          </p>


          <div className="mt-5">
            <p className="text-4xl font-bold tracking-tight">
              {readyCount}
            </p>

            <p className="mt-1 text-[8px] uppercase tracking-[0.08em] text-slate-500">
              conteúdos liberados
            </p>
          </div>


          <Link
            href="/pronto-para-postar"
            className="mt-5 flex h-9 items-center justify-center gap-2 rounded-lg bg-white text-[9px] font-bold text-slate-900 hover:bg-slate-100"
          >
            Ver conteúdos prontos

            <ArrowUpRight
              size={12}
            />
          </Link>
        </div>
      </section>
    </div>
  );
}