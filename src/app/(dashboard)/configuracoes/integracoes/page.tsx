import Link from "next/link";

import {
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Link2,
  LockKeyhole,
  ShieldCheck,
  Unplug,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  requireCurrentUser,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  getGoogleCalendarSystemConfig,
} from "@/lib/googleCalendar";

import {
  disconnectGoogleCalendarAction,
  saveGoogleCalendarCredentialsAction,
} from "./actions";


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";


export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams?:
    Promise<{
      google?: string;
    }>;
}) {

  const user =
    await requireCurrentUser();


  if (
    user.role !==
    "DIRECTOR"
  ) {

    redirect(
      "/acesso-bloqueado"
    );
  }


  const params =
    searchParams
      ? await searchParams
      : {};


  const system =
    getGoogleCalendarSystemConfig();


  const connection =
    await prisma.googleCalendarConnection.findUnique({
      where: {
        agencyId:
          user.agencyId,
      },
    });


  const credentialsConfigured =
    Boolean(
      connection?.googleClientId &&
      connection?.encryptedClientSecret
    );


  const connected =
    Boolean(
      connection?.encryptedRefreshToken &&
      connection?.connectedAt
    );


  const appOrigin =
    String(
      process.env.APP_ORIGIN ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://aprovup.com.br"
    ).replace(
      /\/$/,
      ""
    );


  const redirectUri =
    `${appOrigin}/api/integrations/google-calendar/callback`;


  const successMessages:
    Record<string, string> = {

      "credentials-saved":
        "Credenciais Google salvas. Agora conecte a conta Google Calendar da agência.",

      connected:
        "Google Calendar conectado com sucesso.",

      disconnected:
        "Conta Google Calendar desconectada.",
    };


  const errorMessages:
    Record<string, string> = {

      "server-config":
        "A chave de criptografia do AprovUp ainda não foi configurada no servidor.",

      "credentials-required":
        "Informe o Client ID e o Client Secret da agência antes de conectar.",

      state:
        "A sessão de conexão com o Google expirou. Tente conectar novamente.",

      token:
        "O Google recusou a autenticação. Confira Client ID, Client Secret e Redirect URI.",

      refresh:
        "O Google não forneceu um token permanente. Tente conectar novamente.",
    };


  const googleStatus =
    String(
      params?.google ||
      ""
    );


  return (

    <div className="mx-auto max-w-5xl space-y-6">

      <section>

        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
          Configurações
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Integrações
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Cada agência conecta suas próprias ferramentas e credenciais.
        </p>

      </section>


      {successMessages[
        googleStatus
      ] ? (

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {successMessages[
            googleStatus
          ]}
        </div>

      ) : null}


      {errorMessages[
        googleStatus
      ] ? (

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessages[
            googleStatus
          ]}
        </div>

      ) : null}


      {!system.ready ? (

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <p className="font-bold text-amber-900">
            Configuração técnica pendente
          </p>

          <p className="mt-2 text-sm leading-relaxed text-amber-800">
            O administrador do AprovUp precisa configurar somente uma chave global na Hostinger:
          </p>

          <div className="mt-3 rounded-lg border border-amber-200 bg-white/70 px-3 py-2 font-mono text-xs font-bold text-amber-900">
            APROVUP_INTEGRATION_ENCRYPTION_KEY
          </div>

          <p className="mt-2 text-xs text-amber-700">
            Client ID e Client Secret não ficam mais na Hostinger. Cada agência cadastra os seus abaixo.
          </p>

        </section>

      ) : null}


      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                <CalendarDays
                  size={22}
                />

              </div>


              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  Google Calendar
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                  Use o projeto Google Cloud da própria agência para conectar o calendário ao AprovUp.
                </p>

              </div>

            </div>


            {connected ? (

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">

                <CheckCircle2
                  size={13}
                />

                Conectado

              </span>

            ) : credentialsConfigured ? (

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                Credenciais salvas
              </span>

            ) : (

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                Não configurado
              </span>

            )}

          </div>

        </div>


        <div className="space-y-6 p-6">

          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">

                <KeyRound
                  size={17}
                />

              </div>


              <div>

                <p className="text-sm font-bold text-slate-900">
                  1. Credenciais Google da agência
                </p>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Crie um OAuth Client do tipo Aplicativo da Web no Google Cloud da agência e informe as credenciais abaixo.
                </p>

              </div>

            </div>


            <form
              action={
                saveGoogleCalendarCredentialsAction
              }
              className="mt-5 space-y-4"
            >

              <div>

                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  OAuth Client ID
                </label>

                <input
                  name="googleClientId"
                  required
                  defaultValue={
                    connection?.googleClientId ||
                    ""
                  }
                  placeholder="000000000000-xxxxxxxx.apps.googleusercontent.com"
                  className={inputClass}
                  disabled={
                    !system.ready
                  }
                />

              </div>


              <div>

                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  OAuth Client Secret
                </label>

                <input
                  name="googleClientSecret"
                  type="password"
                  placeholder={
                    connection?.encryptedClientSecret
                      ? "••••••••••••••••  (deixe vazio para manter o atual)"
                      : "GOCSPX-..."
                  }
                  className={inputClass}
                  disabled={
                    !system.ready
                  }
                />

                {connection?.encryptedClientSecret ? (

                  <p className="mt-1.5 text-xs text-slate-400">
                    Já existe um Client Secret protegido. Deixe o campo vazio para manter o atual.
                  </p>

                ) : null}

              </div>


              <div>

                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  URI de redirecionamento
                </label>

                <div className="break-all rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-600">
                  {redirectUri}
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Copie exatamente esta URL para “Authorized redirect URIs” no Google Cloud.
                </p>

              </div>


              <button
                type="submit"
                disabled={
                  !system.ready
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >

                <LockKeyhole
                  size={15}
                />

                {credentialsConfigured
                  ? "Atualizar credenciais"
                  : "Salvar credenciais"}

              </button>

            </form>

          </section>


          <section className="rounded-2xl border border-slate-200 bg-white p-5">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">

                <CalendarDays
                  size={17}
                />

              </div>


              <div>

                <p className="text-sm font-bold text-slate-900">
                  2. Conectar conta Google Calendar
                </p>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Depois de salvar as credenciais, autorize a conta Google que será utilizada pela agência.
                </p>

              </div>

            </div>


            {connected ? (

              <div className="mt-5 space-y-4">

                <div className="grid gap-3 sm:grid-cols-2">

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">

                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                      Conta conectada
                    </p>

                    <p className="mt-1 text-sm font-bold text-emerald-900">
                      {connection?.googleAccountEmail ||
                        "Conta Google conectada"}
                    </p>

                  </div>


                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Calendário
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      Calendário principal
                    </p>

                  </div>

                </div>


                <div className="flex flex-wrap gap-3">

                  <Link
                    href="/api/integrations/google-calendar/connect"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100"
                  >

                    <Link2
                      size={15}
                    />

                    Reconectar conta

                  </Link>


                  <form
                    action={
                      disconnectGoogleCalendarAction
                    }
                  >

                    <button
                      type="submit"
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-600 hover:bg-red-50"
                    >

                      <Unplug
                        size={15}
                      />

                      Desconectar

                    </button>

                  </form>

                </div>

              </div>

            ) : credentialsConfigured &&
                system.ready ? (

              <div className="mt-5">

                <Link
                  href="/api/integrations/google-calendar/connect"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                >

                  <CalendarDays
                    size={16}
                  />

                  Conectar Google Calendar

                </Link>

              </div>

            ) : (

              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Salve primeiro o Client ID e o Client Secret da agência.
              </div>

            )}

          </section>

        </div>

      </section>


      <section className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">

        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-blue-600"
        />

        <div>

          <p className="text-sm font-bold text-slate-800">
            Credenciais isoladas por agência
          </p>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Client Secret e autorização do Google são armazenados criptografados e vinculados ao agencyId. Nenhuma agência acessa as credenciais ou o calendário de outra.
          </p>

        </div>

      </section>

    </div>
  );
}