import { prisma } from "@/lib/prisma";
import { requireAgencyContext } from "@/lib/tenant";
import Link from "next/link";
import { randomUUID } from "crypto";
import { CopyApprovalLinkButton } from "./CopyApprovalLinkButton";
import { notFound } from "next/navigation";

const monthNames: Record<number, string> = {
    1: "Janeiro",
    2: "Fevereiro",
    3: "Março",
    4: "Abril",
    5: "Maio",
    6: "Junho",
    7: "Julho",
    8: "Agosto",
    9: "Setembro",
    10: "Outubro",
    11: "Novembro",
    12: "Dezembro",
};

function getMonthRange(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    return {
        start,
        end,
    };
}

function getPublicApprovalUrl(token: string) {
    return `/aprovacao-calendario/${token}`;
}

function formatDateTime(date: Date | null) {
    if (!date) return "Sem data";

    return new Date(date).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default async function ClientMonthlyApprovalPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        token?: string;
        month?: string;
        year?: string;
    }>;
}) {
    const {
        agencyId,
    } =
        await requireAgencyContext();

    const { id } = await params;
    const query = await searchParams;

    const client =
        await prisma.client.findFirst({
            where: {
                id,
                agencyId,
            },
        });

    if (!client) return notFound();

    const now = new Date();
    const currentMonth = Number(query.month) || now.getMonth() + 1;
    const currentYear = Number(query.year) || now.getFullYear();

    /*
     * Um link mensal só deve existir quando houver
     * planejamento realmente aguardando aprovação.
     *
     * Abrir esta página nunca deve gerar um link vazio.
     */
    const {
        start: currentMonthStart,
        end: currentMonthEnd,
    } = getMonthRange(
        currentYear,
        currentMonth
    );

    const pendingPlanningCount =
        await prisma.content.count({
            where: {
                clientId:
                    id,

                client: {
                    agencyId,
                },

                format: {
                    not: "DEMANDA_EMERGENCIAL",
                },

                plannedDate: {
                    gte: currentMonthStart,
                    lte: currentMonthEnd,
                },

                status: {
                    in: [
                        "IDEIA",
                        "ROTEIRO",
                    ],
                },
            },
        });

    if (pendingPlanningCount > 0) {
        const ensuredApproval =
            await prisma.monthlyApproval.createMany({
                data: [
                    {
                        clientId: id,
                        month: currentMonth,
                        year: currentYear,
                        token: randomUUID(),
                        status: "PENDENTE",
                    },
                ],

                skipDuplicates: true,
            });

        if (ensuredApproval.count > 0) {
            await prisma.historyLog.create({
                data: {
                    entityType: "CLIENT",
                    entityId: id,
                    action:
                        "MONTHLY_APPROVAL_LINK_CREATED",
                    description:
                        `Link mensal de aprovação criado automaticamente para ${client.name} - ${currentMonth}/${currentYear}.`,
                    authorName:
                        "Equipe Level UP",
                },
            });
        }
    }

    const monthlyApprovals = await prisma.monthlyApproval.findMany({
        where: {
            clientId: id,
        },
        orderBy: [
            {
                year: "desc",
            },
            {
                month: "desc",
            },
            {
                createdAt: "desc",
            },
        ],
    });

    /*
     * Carregamos os conteúdos apenas UMA vez.
     *
     * Antes:
     * 4 queries paralelas para cada aprovação mensal,
     * multiplicadas por outro Promise.all.
     *
     * Agora:
     * 1 query total e os contadores são calculados em memória.
     */
    const approvalRanges =
        monthlyApprovals.map((approval) => {
            const { start, end } =
                getMonthRange(
                    approval.year,
                    approval.month
                );

            return {
                approval,
                start,
                end,
            };
        });

    const firstRange =
        approvalRanges.length > 0
            ? approvalRanges.reduce(
                  (earliest, current) =>
                      current.start < earliest.start
                          ? current
                          : earliest
              )
            : null;

    const lastRange =
        approvalRanges.length > 0
            ? approvalRanges.reduce(
                  (latest, current) =>
                      current.end > latest.end
                          ? current
                          : latest
              )
            : null;

    const monthlyContents =
        firstRange && lastRange
            ? await prisma.content.findMany({
                  where: {
                      clientId:
                          id,

                      client: {
                          agencyId,
                      },

                      format: {
                          not: "DEMANDA_EMERGENCIAL",
                      },

                      plannedDate: {
                          gte: firstRange.start,
                          lte: lastRange.end,
                      },

                      status: {
                          not: "ARQUIVADO",
                      },
                  },

                  select: {
                      plannedDate: true,
                      status: true,
                  },
              })
            : [];

    const approvedForProductionStatuses =
        new Set([
            "AGENDAMENTO_PRODUCAO",
            "DESIGN",
            "EDICAO",
            "REVISAO_INTERNA",
            "ENVIADO_CLIENTE",
            "APROVADO",
            "PRONTO_PARA_POSTAR",
            "PUBLICADO_MANUALMENTE",
        ]);

    const pendingStatuses =
        new Set([
            "IDEIA",
            "ROTEIRO",
        ]);

    const monthlyApprovalsWithCounts =
        approvalRanges.map(
            ({
                approval,
                start,
                end,
            }) => {
                const contentsInMonth =
                    monthlyContents.filter(
                        (content) => {
                            const plannedDate =
                                content.plannedDate;

                            if (!plannedDate) {
                                return false;
                            }

                            return (
                                plannedDate >= start &&
                                plannedDate <= end
                            );
                        }
                    );

                const total =
                    contentsInMonth.length;

                const approvedForProduction =
                    contentsInMonth.filter(
                        (content) =>
                            approvedForProductionStatuses.has(
                                content.status
                            )
                    ).length;

                const changesRequested =
                    contentsInMonth.filter(
                        (content) =>
                            content.status ===
                            "ALTERACAO_SOLICITADA"
                    ).length;

                const pending =
                    contentsInMonth.filter(
                        (content) =>
                            pendingStatuses.has(
                                content.status
                            )
                    ).length;

                return {
                    ...approval,
                    total,
                    approvedForProduction,
                    changesRequested,
                    pending,
                };
            }
        );


    /*
     * Esta tela funciona como fila de aprovação,
     * não como histórico de links.
     *
     * O link aparece somente enquanto existir
     * algo que o cliente ainda precisa decidir.
     */
    const activeMonthlyApprovals =
        monthlyApprovalsWithCounts.filter(
            (approval) =>
                approval.status ===
                    "PENDENTE" &&
                approval.total > 0 &&
                (
                    approval.pending > 0 ||
                    approval.changesRequested > 0
                )
        );
    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
                <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl"></div>

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <Link
                            href={`/clientes/${id}/visao`}
                            className="mb-3 inline-block text-sm text-blue-200 hover:underline"
                        >
                            &larr; Voltar para visão do cliente
                        </Link>

                        <p className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                            Aprovação Mensal
                        </p>

                        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                            {client.name}
                        </h1>

                        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                            Gere um único link mensal para o cliente revisar o calendário de
                            conteúdos, aprovar planejamentos e solicitar alterações.
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                    <h2 className="text-lg font-bold text-slate-900">
                        Aprovações pendentes
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Somente links que ainda precisam de uma decisão do cliente aparecem aqui.
                    </p>
                </div>

                {activeMonthlyApprovals.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="font-bold text-slate-900">
                            Nenhuma aprovação pendente.
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Quando houver novos conteúdos aguardando aprovação, um novo link será disponibilizado.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {activeMonthlyApprovals.map((approval) => {
                            const publicUrl = getPublicApprovalUrl(approval.token);

                            return (
                                <div
                                    key={approval.id}
                                    className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between"
                                >
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-slate-900">
                                                {monthNames[approval.month]} / {approval.year}
                                            </h3>

                                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                {approval.status}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-xs text-slate-500">
                                            Criado em {formatDateTime(approval.createdAt)}
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                            <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600">
                                                Total: {approval.total}
                                            </span>

                                            <span className="rounded-full bg-cyan-50 px-2 py-1 font-bold text-cyan-700">
                                                Produção: {approval.approvedForProduction}
                                            </span>

                                            <span className="rounded-full bg-orange-50 px-2 py-1 font-bold text-orange-700">
                                                Alterações: {approval.changesRequested}
                                            </span>

                                            <span className="rounded-full bg-blue-50 px-2 py-1 font-bold text-blue-700">
                                                Pendentes: {approval.pending}
                                            </span>
                                        </div>

                                        <p className="mt-3 break-all text-xs text-slate-500">
                                            {publicUrl}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href={publicUrl}
                                            target="_blank"
                                            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                                        >
                                            Abrir link
                                        </Link>

                                        <CopyApprovalLinkButton path={publicUrl} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

