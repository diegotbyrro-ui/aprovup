import Link from "next/link";

import {
  ArrowRight,
  Headphones,
  LayoutDashboard,
} from "lucide-react";

import {
  requireCommanderAccess,
} from "@/lib/commanderAccess";

import {
  getDailyAccessPath,
} from "@/lib/dailyAccess";

import {
  prisma,
} from "@/lib/prisma";


export const dynamic =
  "force-dynamic";


export default async function CentralPage() {

  const user =
    await requireCommanderAccess();


  const [
    totalTickets,
    openTickets,
  ] =
    await Promise.all([

      prisma
        .supportTicket
        .count(),

      prisma
        .supportTicket
        .count({

          where: {

            status: {
              not:
                "RESOLVIDO",
            },

          },

        }),

    ]);


  const adminPath =
    getDailyAccessPath(
      user.id
    );


  return (

    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-8">

      <div className="mx-auto max-w-5xl">

        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
          AprovUp SaaS
        </p>

        <h1 className="mt-2 text-4xl font-black tracking-tight">
          Central administrativa
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          Administração interna do AprovUp, operação do SaaS e atendimento das agências.
        </p>


        <div className="mt-8 grid gap-5 md:grid-cols-2">

          <Link
            href={adminPath}
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <LayoutDashboard size={21} />
            </div>

            <h2 className="mt-5 text-xl font-black">
              Painel administrativo
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Acesse a administração principal do SaaS, assinaturas, planos, pagamentos e recursos internos.
            </p>

            <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-blue-600">
              Abrir painel

              <ArrowRight size={15} />
            </div>

          </Link>


          <Link
            href="/central/chamados"
            className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >

            <div className="flex items-start justify-between">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Headphones size={21} />
              </div>

              {openTickets > 0 ? (

                <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600">
                  {openTickets} em aberto
                </span>

              ) : null}

            </div>

            <h2 className="mt-5 text-xl font-black">
              Chamados de suporte
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Veja as solicitações enviadas pelas agências, responda e acompanhe cada atendimento.
            </p>

            <div className="mt-5 flex items-center justify-between">

              <span className="text-xs font-semibold text-slate-400">
                {totalTickets} chamado(s) no total
              </span>

              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600">
                Gerenciar

                <ArrowRight size={15} />
              </span>

            </div>

          </Link>

        </div>


        <Link
          href="/operacao"
          className="mt-6 inline-flex text-sm font-bold text-slate-500 hover:text-slate-900"
        >
          Voltar ao AprovUp
        </Link>

      </div>

    </main>
  );
}