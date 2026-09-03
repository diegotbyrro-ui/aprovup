import {
  AprovUpLogo,
} from "@/components/brand/AprovUpLogo";

import {
  loginAction,
} from "./actions";


function getErrorMessage(
  error?: string
) {
  if (error === "empty") {
    return "Preencha e-mail e senha.";
  }

  if (error === "invalid") {
    return "E-mail ou senha inválidos.";
  }

  if (error === "pending") {
    return "Seu convite ainda não foi concluído.";
  }

  if (error === "rejected") {
    return "Seu acesso foi recusado.";
  }

  if (error === "inactive") {
    return "Seu usuário está inativo. Fale com o administrador.";
  }

  if (error === "unauthorized") {
    return "Usuário sem autorização para acessar.";
  }

  return null;
}


export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
    registered?: string;
    invite?: string;
    passwordReset?: string;
  }>;
}) {
  const params =
    searchParams
      ? await searchParams
      : {};

  const errorMessage =
    getErrorMessage(
      params?.error
    );

  const registered =
    params?.registered ===
    "true";

  const passwordReset =
    params?.passwordReset ===
    "true";


  const inviteRequired =
    params?.invite ===
    "required";


  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <AprovUpLogo
            size="sm"
            className="mx-auto w-[165px]"
          />

          <h1 className="mt-7 text-2xl font-bold tracking-tight text-slate-900">
            Acesse sua conta
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Entre para continuar sua operação no AprovUp.
          </p>
        </div>


        {passwordReset ? (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            Senha redefinida com sucesso. Entre com sua nova senha.
          </div>
        ) : null}


        {registered ? (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            Conta ativada. Você já pode entrar.
          </div>
        ) : null}


        {inviteRequired ? (
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-700">
            Novas contas são criadas por convite do administrador.
          </div>
        ) : null}


        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}


        <form
          action={loginAction}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              E-mail
            </label>

            <input
              name="email"
              type="email"
              required
              placeholder="seuemail@empresa.com.br"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>


          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Senha
            </label>

            <input
              name="password"
              type="password"
              required
              placeholder="Digite sua senha"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>


          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Entrar no AprovUp
          </button>
        </form>


        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <p className="text-xs leading-relaxed text-slate-400">
            O acesso da equipe é liberado pelo administrador através de convite.
          </p>
        </div>
      </div>
    </div>
  );
}