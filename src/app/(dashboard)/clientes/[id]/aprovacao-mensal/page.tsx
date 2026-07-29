import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createMonthlyApprovalLink } from "./actions";

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
    const { id } = await params;
    const query = await searchParams;

    const client = await prisma.client.findUnique({
        where: {
            id,
        },
    });

    if (!client) return notFound();

    const now = new Date();
    const currentMonth = Number(query.month) || now.getMonth() + 1;
    const currentYear = Number(query.year) || now.getFullYear();

    const createAction = createMonthlyApprovalLink.bind(null, id);

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

    const monthlyApprovalsWithCounts = await Promise.all(
        monthlyApprovals.map(async (approval) => {
            const { start, end } = getMonthRange(approval.year, approval.month);

            const [total, approvedForProduction, changesRequested, pending] =
                await Promise.all([
                    prisma.content.count({
                        where: {
                            clientId: id,
                            plannedDate: {
                                gte: start,
                                lte: end,
                            },
                            status: {
                                not: "ARQUIVADO",
                            },
                        },
                    }),

                    prisma.content.count({
                        where: {
                            clientId: id,
                            plannedDate: {
                                gte: start,
                                lte: end,
                            },
                            status: {
                                in: [
                                    "AGENDAMENTO_PRODUCAO",
                                    "DESIGN",
                                    "EDICAO",
                                    "REVISAO_INTERNA",
                                    "ENVIADO_CLIENTE",
                                    "APROVADO",
                                    "PRONTO_PARA_POSTAR",
                                    "PUBLICADO_MANUALMENTE",
                                ],
                            },
                        },
                    }),

                    prisma.content.count({
                        where: {
                            clientId: id,
                            plannedDate: {
                                gte: start,
                                lte: end,
                            },
                            status: "ALTERACAO_SOLICITADA",
                        },
                    }),

                    prisma.content.count({
                        where: {
                            clientId: id,
                            plannedDate: {
                                gte: start,
                                lte: end,
                            },
                            status: {
                                in: ["IDEIA", "ROTEIRO"],
                            },
                        },
                    }),
                ]);

            return {
                ...approval,
                total,
                approvedForProduction,
                changesRequested,
                pending,
            };
        })
    );

    const generatedLink = query.token
        ? getPublicApprovalUrl(query.token)
        : null;

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

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/clientes/${id}`}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
                        >
                            Página do Cliente
                        </Link>

                        <Link
                            href={`/clientes/${id}/visao`}
                            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                        >
                            Visão Premium
                        </Link>

                        <Link
                            href={`/conteudos/kanban?cliente=${id}`}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            Produção do Cliente
                        </Link>
                    </div>
                </div>
            </section>

            {generatedLink && (
                <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Link gerado com sucesso
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-emerald-900">
                        Calendário mensal de aprovação criado
                    </h2>

                    <p className="mt-1 text-sm text-emerald-700">
                        Copie o link abaixo e envie para o cliente revisar os conteúdos do
                        mês.
                    </p>

                    <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                        <p className="break-all text-sm font-bold text-slate-900">
                            {generatedLink}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                                href={generatedLink}
                                target="_blank"
                                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                            >
                                Abrir link
                            </Link>

                            <Link
                                href={`/clientes/${id}/aprovacao-mensal`}
                                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                            >
                                Limpar aviso
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Gerar link mensal
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                        Novo calendário de aprovação
                    </h2>

                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                        Se já existir um link para o mesmo mês e ano, o sistema vai
                        reutilizar o link existente.
                    </p>

                    <form action={createAction} className="mt-5 space-y-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Mês
                            </label>

                            <select
                                name="month"
                                defaultValue={currentMonth}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                {Object.entries(monthNames).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Ano
                            </label>

                            <input
                                name="year"
                                type="number"
                                defaultValue={currentYear}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Gerar link de aprovação
                        </button>
                    </form>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Como usar
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                        Fluxo recomendado
                    </h2>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <p className="font-bold text-slate-900">
                                1. Planeje o mês
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Cadastre os conteúdos com data, briefing, legenda, área e
                                prioridade.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <p className="font-bold text-slate-900">
                                2. Gere o link mensal
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Envie um único link para o cliente revisar o calendário inteiro.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <p className="font-bold text-slate-900">
                                3. Cliente aprova
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Ao aprovar, o conteúdo entra em Agendamento de Produção.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <p className="font-bold text-slate-900">
                                4. Equipe produz
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Design ou Filmmaker recebe a demanda liberada para produção.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                    <h2 className="text-lg font-bold text-slate-900">
                        Links mensais já gerados
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Consulte os links já criados para este cliente.
                    </p>
                </div>

                {monthlyApprovalsWithCounts.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="font-bold text-slate-900">
                            Nenhum link mensal criado ainda.
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Gere o primeiro link usando o formulário acima.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {monthlyApprovalsWithCounts.map((approval) => {
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

                                        <Link
                                            href={`/clientes/${id}/aprovacao-mensal?token=${approval.token}&month=${approval.month}&year=${approval.year}`}
                                            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                                        >
                                            Ver link
                                        </Link>
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

