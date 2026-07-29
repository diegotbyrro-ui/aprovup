import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import Link from 'next/link';
import { registerAction } from './actions';

function getErrorMessage(error?: string) {
    if (error === 'empty') return 'Preencha todos os campos.';
    if (error === 'role') return 'Função inválida.';
    if (error === 'password') return 'A senha precisa ter pelo menos 6 caracteres.';
    if (error === 'exists') return 'Já existe um usuário cadastrado com esse e-mail.';
    return null;
}

export default async function RegisterPage({
    searchParams,
}: {
    searchParams?: Promise<{
        error?: string;
    }>;
}) {
    const params = searchParams ? await searchParams : {};
    const errorMessage = getErrorMessage(params?.error);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"></div>
                <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"></div>
            </div>

            <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
                <div className="mb-8 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600">
                        Level UP
                    </p>

                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                        Solicitar acesso
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Seu cadastro ficará pendente até aprovação de um diretor.
                    </p>
                </div>

                {errorMessage && (
                    <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
                        {errorMessage}
                    </div>
                )}

                <form action={registerAction} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Nome
                        </label>

                        <input
                            name="name"
                            type="text"
                            placeholder="Seu nome"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            E-mail
                        </label>

                        <input
                            name="email"
                            type="email"
                            placeholder="seuemail@mktlevelup.com.br"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Senha
                        </label>

                        <input
                            name="password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Função solicitada
                        </label>

                        <select
                            name="role"
                            defaultValue="SOCIAL_MEDIA"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="SOCIAL_MEDIA">Social Media</option>
                            <option value="DESIGN">Design</option>
                            <option value="FILMMAKER">Filmmaker</option>
                            <option value="DIRECTOR">Diretor</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                        Solicitar cadastro
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="text-sm font-bold text-blue-600 hover:underline"
                    >
                        Já tenho acesso
                    </Link>
                </div>
            </div>
        </div>
    );
}

