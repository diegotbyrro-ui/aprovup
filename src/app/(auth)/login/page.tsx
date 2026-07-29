import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import Link from 'next/link';
import { loginAction } from './actions';

function getErrorMessage(error?: string) {
  if (error === 'empty') return 'Preencha e-mail e senha.';
  if (error === 'invalid') return 'E-mail ou senha inválidos.';
  if (error === 'pending') return 'Seu cadastro ainda está aguardando aprovação.';
  if (error === 'rejected') return 'Seu cadastro foi recusado.';
  if (error === 'inactive') return 'Seu usuário está inativo.';
  if (error === 'unauthorized') return 'Usuário sem autorização para acessar.';
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
    registered?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const errorMessage = getErrorMessage(params?.error);
  const registered = params?.registered === 'true';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600">
            Level UP
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Content OS
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Acesse sua área de operação.
          </p>
        </div>

        {registered && (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            Cadastro enviado. Aguarde aprovação de um diretor.
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <form action={loginAction} className="space-y-4">
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
              placeholder="Digite sua senha"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Entrar no sistema
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Ainda não tem acesso?
          </p>

          <Link
            href="/cadastro"
            className="mt-2 inline-block text-sm font-bold text-blue-600 hover:underline"
          >
            Solicitar cadastro
          </Link>
        </div>
      </div>
    </div>
  );
}

