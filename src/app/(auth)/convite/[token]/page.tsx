import {
  redirect,
} from "next/navigation";

import {
  KeyRound,
  ShieldCheck,
} from "lucide-react";

import {
  AprovUpLogo,
} from "@/components/brand/AprovUpLogo";

import {
  prisma,
} from "@/lib/prisma";

import {
  acceptInviteAction,
} from "./actions";


function errorMessage(
  value?:
    string
) {
  if (
    value ===
    "password"
  ) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }

  if (
    value ===
    "confirmation"
  ) {
    return "As senhas não conferem.";
  }

  if (
    value ===
    "expired"
  ) {
    return "Este convite expirou. Solicite um novo link ao administrador.";
  }

  if (
    value ===
    "invalid"
  ) {
    return "Este convite não é mais válido.";
  }

  return null;
}


export default async function InvitePage({
  params,
  searchParams,
}: {
  params:
    Promise<{
      token:
        string;
    }>;

  searchParams?:
    Promise<{
      error?:
        string;
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


  const user =
    await prisma.user.findUnique({
      where: {
        inviteToken:
          token,
      },
    });


  if (!user) {
    redirect(
      "/login"
    );
  }


  const expired =
    !user.inviteExpiresAt ||
    user.inviteExpiresAt <
      new Date();


  const message =
    errorMessage(
      expired
        ? "expired"
        : query?.error
    );


  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <AprovUpLogo
          size="sm"
          className="mx-auto w-[160px]"
        />


        <div className="mt-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck
              size={
                22
              }
            />
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Ative seu acesso
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Olá,{" "}
            <strong className="text-slate-800">
              {user.name}
            </strong>
            . Crie sua senha para acessar o AprovUp.
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {user.email}
          </p>
        </div>


        {message ? (
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
            {message}
          </div>
        ) : null}


        {!expired ? (
          <form
            action={
              acceptInviteAction.bind(
                null,
                token
              )
            }
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Nova senha
              </label>

              <div className="relative">
                <KeyRound
                  size={
                    15
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  name="password"
                  type="password"
                  required
                  minLength={
                    8
                  }
                  placeholder="Mínimo 8 caracteres"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>


            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Confirmar senha
              </label>

              <input
                name="confirmation"
                type="password"
                required
                minLength={
                  8
                }
                placeholder="Digite novamente"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
              />
            </div>


            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
            >
              Ativar minha conta
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}