import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
    approvePlanningContent,
    requestPlanningChanges,
} from "./actions";

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

const statusLabels: Record<string, string> = {
    IDEIA: "Pendente de aprovação",
    ROTEIRO: "Pendente de aprovação",
    AGENDAMENTO_PRODUCAO: "Aprovado para produção",
    DESIGN: "Em produção",
    EDICAO: "Em edição",
    REVISAO_INTERNA: "Em revisão interna",
    ENVIADO_CLIENTE: "Enviado para aprovação final",
    ALTERACAO_SOLICITADA: "Alteração solicitada",
    APROVADO: "Aprovado final",
    PRONTO_PARA_POSTAR: "Pronto para postar",
    PUBLICADO_MANUALMENTE: "Publicado",
    ARQUIVADO: "Arquivado",
};

const statusClasses: Record<string, string> = {
    IDEIA: "bg-slate-100 text-slate-700 border-slate-200",
    ROTEIRO: "bg-purple-50 text-purple-700 border-purple-100",
    AGENDAMENTO_PRODUCAO: "bg-cyan-50 text-cyan-700 border-cyan-100",
    DESIGN: "bg-blue-50 text-blue-700 border-blue-100",
    EDICAO: "bg-indigo-50 text-indigo-700 border-indigo-100",
    REVISAO_INTERNA: "bg-yellow-50 text-yellow-700 border-yellow-100",
    ENVIADO_CLIENTE: "bg-orange-50 text-orange-700 border-orange-100",
    ALTERACAO_SOLICITADA: "bg-red-50 text-red-700 border-red-100",
    APROVADO: "bg-emerald-50 text-emerald-700 border-emerald-100",
    PRONTO_PARA_POSTAR: "bg-teal-50 text-teal-700 border-teal-100",
    PUBLICADO_MANUALMENTE: "bg-slate-900 text-white border-slate-900",
    ARQUIVADO: "bg-slate-100 text-slate-500 border-slate-200",
};

const priorityLabels: Record<string, string> = {
    BAIXA: "Baixa",
    MEDIA: "Média",
    ALTA: "Alta",
    URGENTE: "Urgente",
};

const areaLabels: Record<string, string> = {
    GERAL: "Geral",
    SOCIAL_DESIGN: "Design",
    AUDIOVISUAL: "Filmmaker",
};

function getMonthRange(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    return {
        start,
        end,
    };
}

function formatDate(date: Date | null) {
    if (!date) return "Sem data";

    return new Date(date).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
    });
}

function formatFullDate(date: Date | null) {
    if (!date) return "Sem data";

    return new Date(date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function getDayKey(date: Date | null) {
    if (!date) return "sem-data";

    return new Date(date).toISOString().split("T")[0];
}

function isPlanningAlreadyApproved(status: string) {
    return [
        "AGENDAMENTO_PRODUCAO",
        "DESIGN",
        "EDICAO",
        "REVISAO_INTERNA",
        "ENVIADO_CLIENTE",
        "APROVADO",
        "PRONTO_PARA_POSTAR",
        "PUBLICADO_MANUALMENTE",
    ].includes(status);
}

export default async function MonthlyApprovalCalendarPage({
    params,
    searchParams,
}: {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ feedback?: string }>;
}) {
    const { token } = await params;
    const query = await searchParams;

    const monthlyApproval = await prisma.monthlyApproval.findUnique({
        where: {
            token,
        },
        include: {
            client: true,
        },
    });

    if (!monthlyApproval) return notFound();

    const { start, end } = getMonthRange(
        monthlyApproval.year,
        monthlyApproval.month
    );

    const contents = await prisma.content.findMany({
        where: {
            clientId: monthlyApproval.clientId,
            plannedDate: {
                gte: start,
                lte: end,
            },
            status: {
                not: "ARQUIVADO",
            },
        },
        include: {
            client: true,
        },
        orderBy: [
            {
                plannedDate: "asc",
            },
            {
                createdAt: "asc",
            },
        ],
    });

    const totalContents = contents.length;

    const approvedForProduction = contents.filter((content) =>
        isPlanningAlreadyApproved(content.status)
    );

    const requestedChanges = contents.filter(
        (content) => content.status === "ALTERACAO_SOLICITADA"
    );

    const pendingContents = contents.filter(
        (content) =>
            !isPlanningAlreadyApproved(content.status) &&
            content.status !== "ALTERACAO_SOLICITADA"
    );

    const contentsByDay = contents.reduce<Record<string, typeof contents>>(
        (acc, content) => {
            const key = getDayKey(content.plannedDate);

            if (!acc[key]) {
                acc[key] = [];
            }

            acc[key].push(content);

            return acc;
        },
        {}
    );

    const dayKeys = Object.keys(contentsByDay).sort();

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
            <div className="mx-auto max-w-6xl space-y-6">
                <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
                    <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl"></div>
                    <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl"></div>

                    <div className="relative z-10">
                        <p className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                            Aprovação Mensal de Conteúdos
                        </p>

                        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                            {monthNames[monthlyApproval.month]} / {monthlyApproval.year}
                        </h1>

                        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                            Cliente:{" "}
                            <strong className="text-white">
                                {monthlyApproval.client.name}
                            </strong>
                            . Revise cada conteúdo planejado para o mês e aprove ou solicite
                            alteração.
                        </p>
                    </div>
                </section>

                {query.feedback === "aprovado" && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-800">
                        <p className="font-bold">
                            Planejamento aprovado com sucesso.
                        </p>
                        <p className="mt-1 text-sm">
                            Esse conteúdo foi liberado para a equipe produzir.
                        </p>
                    </div>
                )}

                {query.feedback === "alteracao" && (
                    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 text-orange-800">
                        <p className="font-bold">
                            Solicitação de alteração enviada.
                        </p>
                        <p className="mt-1 text-sm">
                            A equipe recebeu seu comentário e irá revisar esse conteúdo.
                        </p>
                    </div>
                )}

                <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Total do mês
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                            {totalContents}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-cyan-500">
                            Aprovados para produção
                        </p>
                        <p className="mt-2 text-3xl font-bold text-cyan-700">
                            {approvedForProduction.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                            Alterações
                        </p>
                        <p className="mt-2 text-3xl font-bold text-orange-700">
                            {requestedChanges.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Pendentes
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                            {pendingContents.length}
                        </p>
                    </div>
                </section>

                {contents.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                        <h2 className="text-lg font-bold text-slate-900">
                            Nenhum conteúdo cadastrado para este mês.
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Quando a equipe cadastrar conteúdos com data dentro deste mês,
                            eles aparecerão aqui.
                        </p>
                    </section>
                ) : (
                    <section className="space-y-5">
                        {dayKeys.map((dayKey) => {
                            const dayContents = contentsByDay[dayKey];
                            const dayDate =
                                dayKey === "sem-data"
                                    ? null
                                    : new Date(`${dayKey}T12:00:00`);

                            return (
                                <div
                                    key={dayKey}
                                    className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                                >
                                    <div className="border-b border-slate-100 p-5">
                                        <h2 className="text-xl font-bold text-slate-900">
                                            {formatDate(dayDate)}
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {dayContents.length} conteúdo(s) planejado(s)
                                        </p>
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {dayContents.map((content) => {
                                            const approveAction = approvePlanningContent.bind(
                                                null,
                                                token,
                                                content.id
                                            );

                                            const requestChangeAction =
                                                requestPlanningChanges.bind(null, token, content.id);

                                            const alreadyApproved = isPlanningAlreadyApproved(
                                                content.status
                                            );

                                            const area = content.area || "GERAL";
                                            const priority = content.priority || "MEDIA";

                                            return (
                                                <div key={content.id} className="p-5">
                                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                                        <div className="space-y-4 lg:col-span-2">
                                                            <div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <h3 className="text-lg font-bold text-slate-900">
                                                                        {content.title}
                                                                    </h3>

                                                                    <span
                                                                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses[content.status] ||
                                                                            statusClasses.IDEA
                                                                            }`}
                                                                    >
                                                                        {statusLabels[content.status] ||
                                                                            content.status}
                                                                    </span>

                                                                    {content.format && (
                                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                                            {content.format}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <p className="mt-2 text-xs text-slate-500">
                                                                    Área:{" "}
                                                                    <strong className="text-slate-700">
                                                                        {areaLabels[area] || area}
                                                                    </strong>{" "}
                                                                    • Prioridade:{" "}
                                                                    <strong className="text-slate-700">
                                                                        {priorityLabels[priority] || priority}
                                                                    </strong>{" "}
                                                                    • Data:{" "}
                                                                    <strong className="text-slate-700">
                                                                        {formatFullDate(content.plannedDate)}
                                                                    </strong>
                                                                </p>
                                                            </div>

                                                            {content.coverImageUrl && (
                                                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                                                    <img
                                                                        src={content.coverImageUrl}
                                                                        alt={content.title}
                                                                        className="h-auto w-full object-cover"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="space-y-4">
                                                                {content.briefing && (
                                                                    <div>
                                                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                            Briefing / Orientação
                                                                        </p>

                                                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                                                            {content.briefing}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {content.artText && (
                                                                    <div>
                                                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                            Texto da arte
                                                                        </p>

                                                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                                                            {content.artText}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {content.caption && (
                                                                    <div>
                                                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                            Legenda
                                                                        </p>

                                                                        <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                                                                {content.caption}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {content.fileLinks && (
                                                                    <div>
                                                                        <a
                                                                            href={content.fileLinks}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                                                                        >
                                                                            Abrir material
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                            <h4 className="font-bold text-slate-900">
                                                                Decisão do cliente
                                                            </h4>

                                                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                                                Aprove o planejamento para liberar a equipe ou
                                                                solicite alteração neste conteúdo.
                                                            </p>

                                                            {alreadyApproved ? (
                                                                <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                                                                    <p className="font-bold text-cyan-800">
                                                                        Liberado para produção.
                                                                    </p>
                                                                    <p className="mt-1 text-sm text-cyan-700">
                                                                        A equipe já pode produzir este conteúdo.
                                                                    </p>
                                                                </div>
                                                            ) : content.status ===
                                                                "ALTERACAO_SOLICITADA" ? (
                                                                <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-4">
                                                                    <p className="font-bold text-orange-800">
                                                                        Alteração solicitada.
                                                                    </p>
                                                                    <p className="mt-1 text-sm text-orange-700">
                                                                        A equipe irá revisar este conteúdo.
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-4 space-y-4">
                                                                    <form action={approveAction}>
                                                                        <button
                                                                            type="submit"
                                                                            className="w-full rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-800"
                                                                        >
                                                                            Aprovar planejamento
                                                                        </button>
                                                                    </form>

                                                                    <form
                                                                        action={requestChangeAction}
                                                                        className="rounded-xl border border-slate-200 bg-white p-4"
                                                                    >
                                                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                            Solicitar alteração
                                                                        </label>

                                                                        <textarea
                                                                            name="clientComment"
                                                                            required
                                                                            rows={5}
                                                                            placeholder="Escreva aqui o que precisa ser ajustado neste conteúdo..."
                                                                            className="mt-2 w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                                        ></textarea>

                                                                        <button
                                                                            type="submit"
                                                                            className="mt-3 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700"
                                                                        >
                                                                            Enviar alteração
                                                                        </button>
                                                                    </form>
                                                                </div>
                                                            )}
                                                        </aside>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}

                <footer className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <p className="text-sm text-slate-500">
                        Link de aprovação mensal gerado pela AprovUp.
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                        Level UP Marketing
                    </p>
                </footer>
            </div>
        </main>
    );
}

