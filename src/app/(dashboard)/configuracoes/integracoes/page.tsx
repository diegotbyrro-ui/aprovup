import Link from "next/link";

import {
  CalendarDays,
  CheckCircle2,
  Link2,
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
  getGoogleCalendarOAuthConfig,
} from "@/lib/googleCalendar";

import {
  disconnectGoogleCalendarAction,
} from "./actions";


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


  const config =
    getGoogleCalendarOAuthConfig();


  const connection =
    await prisma.googleCalendarConnection.findUnique({
      where: {
        agencyId:
          user.agencyId,
      },
    });


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
          Conecte os serviços utilizados pela sua agência.
        </p>

      </section>


      {params?.google ===
      "connected" ? (

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          Google Calendar conectado com sucesso.
        </div>

      ) : null}


      {params?.google &&
      params.google !==
        "connected" ? (

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Não foi possível concluir a conexão com o Google Calendar.
        </div>

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
                  Conecte o calendário principal da agência para sincronizar gravações, reuniões e agendamentos do AprovUp.
                </p>

              </div>

            </div>


            {connection ? (

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">

                <CheckCircle2
                  size={13}
                />

                Conectado

              </span>

            ) : (

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                Não conectado
              </span>

            )}

          </div>

        </div>


        <div className="p-6">

          {connection ? (

            <div className="space-y-5">

              <div className="grid gap-3 sm:grid-cols-2">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Conta Google
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {connection.googleAccountEmail ||
                      "Conta conectada"}
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

          ) : (

            <div className="space-y-5">

              {!config.ready ? (

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

                  <p className="font-bold text-amber-800">
                    Integração ainda não configurada no servidor
                  </p>

                  <p className="mt-2 text-sm leading-relaxed text-amber-700">
                    Configure as credenciais OAuth do AprovUp na Hostinger antes de conectar uma conta.
                  </p>

                  <div className="mt-3 space-y-1 font-mono text-xs text-amber-800">
                    <div>GOOGLE_CALENDAR_CLIENT_ID</div>
                    <div>GOOGLE_CALENDAR_CLIENT_SECRET</div>
                    <div>APROVUP_INTEGRATION_ENCRYPTION_KEY</div>
                  </div>

                </div>

              ) : (

                <Link
                  href="/api/integrations/google-calendar/connect"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <CalendarDays
                    size={16}
                  />

                  Conectar Google Calendar
                </Link>

              )}

            </div>

          )}

        </div>

      </section>


      <section className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">

        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-blue-600"
        />

        <div>

          <p className="text-sm font-bold text-slate-800">
            Conexão por agência
          </p>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Cada agência possui sua própria autorização do Google Calendar. Uma agência não tem acesso ao calendário de outra.
          </p>

        </div>

      </section>

    </div>
  );
}