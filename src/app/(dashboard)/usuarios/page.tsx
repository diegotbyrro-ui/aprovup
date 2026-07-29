import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
    approveUser,
    rejectUser,
    deactivateUser,
    updateUserAccess,
} from './actions';

const roleLabels: Record<string, string> = {
    DIRECTOR: 'Diretor',
    SOCIAL_MEDIA: 'Social Media',
    DESIGN: 'Design',
    FILMMAKER: 'Filmmaker',
};

const statusLabels: Record<string, string> = {
    PENDENTE: 'Pendente',
    APROVADO: 'Aprovado',
    RECUSADO: 'Recusado',
    INATIVO: 'Inativo',
};

const statusClasses: Record<string, string> = {
    PENDENTE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    APROVADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    RECUSADO: 'bg-red-50 text-red-700 border-red-200',
    INATIVO: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatDate(date: Date | null) {
    if (!date) return 'Sem data';

    return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function UserCard({
    user,
    currentUserId,
}: {
    user: {
        id: string;
        name: string | null;
        email: string | null;
        role: string;
        status: string;
        approvedAt: Date | null;
        approvedByName: string | null;
        createdAt: Date;
    };
    currentUserId: string;
}) {
    const isSelf = user.id === currentUserId;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                            {user.name || 'Usuário sem nome'}
                        </h3>

                        {isSelf && (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                Você
                            </span>
                        )}

                        <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses[user.status] || statusClasses.PENDENTE
                                }`}
                        >
                            {statusLabels[user.status] || user.status}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                        {user.email || 'E-mail não informado'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>
                            Função:{' '}
                            <strong className="text-slate-700">
                                {roleLabels[user.role] || user.role}
                            </strong>
                        </span>

                        <span>•</span>

                        <span>
                            Cadastro:{' '}
                            <strong className="text-slate-700">
                                {formatDate(user.createdAt)}
                            </strong>
                        </span>

                        {user.approvedAt && (
                            <>
                                <span>•</span>
                                <span>
                                    Aprovado por:{' '}
                                    <strong className="text-slate-700">
                                        {user.approvedByName || 'Diretor'}
                                    </strong>
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 xl:w-80">
                    <form
                        action={updateUserAccess.bind(null, user.id)}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    >
                        <select
                            name="role"
                            defaultValue={user.role}
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                        >
                            <option value="DIRECTOR">Diretor</option>
                            <option value="SOCIAL_MEDIA">Social Media</option>
                            <option value="DESIGN">Design</option>
                            <option value="FILMMAKER">Filmmaker</option>
                        </select>

                        <select
                            name="status"
                            defaultValue={user.status}
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                        >
                            <option value="PENDENTE">Pendente</option>
                            <option value="APROVADO">Aprovado</option>
                            <option value="RECUSADO">Recusado</option>
                            <option value="INATIVO">Inativo</option>
                        </select>

                        <button
                            type="submit"
                            className="rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 sm:col-span-2"
                        >
                            Salvar acesso
                        </button>
                    </form>

                    {user.status === 'PENDENTE' && (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <form action={approveUser.bind(null, user.id)}>
                                <button
                                    type="submit"
                                    className="w-full rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                >
                                    Aprovar
                                </button>
                            </form>

                            <form action={rejectUser.bind(null, user.id)}>
                                <button
                                    type="submit"
                                    className="w-full rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                                >
                                    Recusar
                                </button>
                            </form>
                        </div>
                    )}

                    {!isSelf && user.status === 'APROVADO' && (
                        <form action={deactivateUser.bind(null, user.id)}>
                            <button
                                type="submit"
                                className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                            >
                                Inativar usuário
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default async function UsuariosPage() {
    const currentUser = await requireCurrentUser();

    if (!isDirector(currentUser.role)) {
        redirect('/dashboard');
    }

    const users = await prisma.user.findMany({
        orderBy: [
            {
                status: 'asc',
            },
            {
                createdAt: 'desc',
            },
        ],
    });

    const pendingUsers = users.filter((user) => user.status === 'PENDENTE');
    const approvedUsers = users.filter((user) => user.status === 'APROVADO');
    const blockedUsers = users.filter((user) =>
        ['RECUSADO', 'INATIVO'].includes(user.status)
    );

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
                    Administração
                </p>

                <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                    Usuários
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                    Aprove cadastros, ajuste funções e controle quem pode acessar o sistema.
                </p>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-600">
                        Pendentes
                    </p>
                    <p className="mt-2 text-3xl font-bold text-yellow-700">
                        {pendingUsers.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                        Aprovados
                    </p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">
                        {approvedUsers.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Recusados / Inativos
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {blockedUsers.length}
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Cadastros pendentes
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Usuários aguardando liberação para acessar o sistema.
                    </p>
                </div>

                {pendingUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                        Nenhum usuário pendente no momento.
                    </div>
                ) : (
                    pendingUsers.map((user) => (
                        <UserCard
                            key={user.id}
                            user={user}
                            currentUserId={currentUser.id}
                        />
                    ))
                )}
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Usuários aprovados
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Pessoas com acesso ativo ao sistema.
                    </p>
                </div>

                {approvedUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                        Nenhum usuário aprovado.
                    </div>
                ) : (
                    approvedUsers.map((user) => (
                        <UserCard
                            key={user.id}
                            user={user}
                            currentUserId={currentUser.id}
                        />
                    ))
                )}
            </section>

            {blockedUsers.length > 0 && (
                <section className="space-y-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            Recusados e inativos
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Usuários que não possuem acesso ativo.
                        </p>
                    </div>

                    {blockedUsers.map((user) => (
                        <UserCard
                            key={user.id}
                            user={user}
                            currentUserId={currentUser.id}
                        />
                    ))}
                </section>
            )}
        </div>
    );
}

