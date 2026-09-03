import {
  createHash,
} from "node:crypto";

import Link from "next/link";

import {
  AprovUpLogo,
} from "@/components/brand/AprovUpLogo";

import {
  prisma,
} from "@/lib/prisma";

import {
  resetPasswordAction,
} from "./actions";


function hashResetToken(
  token: string
) {
  return createHash(
    "sha256"
  )
    .update(token)
    .digest("hex");
}


function getErrorMessage(
  error?: string
) {

  if (
    error ===
    "password"
  ) {
    return "A nova senha precisa ter pelo menos 8 caracteres.";
  }


  if (
    error ===
    "confirmation"
  ) {
    return "As senhas informadas não são iguais.";
  }


  if (
    error ===
    "expired"
  ) {
    return "Este link expirou. Solicite um novo link ao diretor.";
  }


  if (
    error ===
    "inactive"
  ) {
    return "Este usuário não está ativo.";
  }


  if (
    error ===
    "invalid"
  ) {
    return "Este link não é válido ou já foi utilizado.";
  }


  return null;
}


export default async function RedefinirSenhaPage({
  params,
  searchParams,
}: {
  params:
    Promise<{
      token: string;
    }>;

  searchParams?:
    Promise<{
      error?: string;
    }>;
}) {

  const {
    token,
  } =
    await params;


  const query =
    searchParams
      ? await searchParams
      : {};


  const errorMessage =
    getErrorMessage(
      query?.error
    );


  const tokenHash =
    hashResetToken(
      token
    );


  const user =
    await prisma.user.findUnique({
      where: {
        resetPasswordTokenHash:
          tokenHash,
      },

      select: {
        name:
          true,

        status:
          true,

        resetPasswordExpiresAt:
          true,
      },
    });


  const linkIsValid =
    Boolean(
      user &&
      user.status ===
        "APROVADO" &&
      user.resetPasswordExpiresAt &&
      user.resetPasswordExpiresAt >
        new Date()
    );


  const action =
    resetPasswordAction.bind(
      null,
      token
    );


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
            Redefinir senha
          </h1>


          {linkIsValid ? (

            <p className="mt-2 text-sm text-slate-500">

              {user?.name
                ? `Olá, ${user.name}. `
                : ""}

              Digite a nova senha que deseja utilizar no AprovUp.

            </p>

          ) : (

            <p className="mt-2 text-sm text-slate-500">
              Não foi possível validar este link.
            </p>

          )}

        </div>


        {errorMessage ? (

          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>

        ) : null}


        {!linkIsValid ? (

          <div className="space-y-4">

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">

              Este link expirou, já foi utilizado ou não é mais válido.

              Solicite ao diretor da sua agência um novo link de redefinição.

            </div>


            <Link
              href="/login"
              className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Voltar para o login
            </Link>

          </div>

        ) : (

          <form
            action={action}
            className="space-y-4"
          >

            <div>

              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Nova senha
              </label>


              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Mínimo de 8 caracteres"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            <div>

              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Confirmar nova senha
              </label>


              <input
                name="confirmation"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Digite a senha novamente"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Redefinir minha senha
            </button>


            <p className="text-center text-xs leading-relaxed text-slate-400">
              Por segurança, este link funciona apenas uma vez e expira 30 minutos após ser criado.
            </p>

          </form>

        )}

      </div>

    </div>
  );
}