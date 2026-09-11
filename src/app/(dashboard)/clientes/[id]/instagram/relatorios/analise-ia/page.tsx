import Link from 'next/link';

import {
  BrainCircuit,
} from 'lucide-react';

import {
  notFound,
} from 'next/navigation';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import InstagramAiAnalysisClient
  from './InstagramAiAnalysisClient';


export default async function InstagramAiAnalysisPage({
  params,
  searchParams,
}: {
  params:
    Promise<{
      id:
        string;
    }>;

  searchParams:
    Promise<{
      periodo?:
        string;
    }>;
}) {
  const currentUser =
    await requirePermission(
      'social.view'
    );

  const {
    id,
  } =
    await params;

  const query =
    await searchParams;

  const requestedPeriod =
    Number(
      query.periodo ||
      30
    );

  const period =
    [
      7,
      30,
      90,
    ].includes(
      requestedPeriod
    )
      ? requestedPeriod
      : 30;

  const client =
    await prisma.client.findFirst({
      where: {
        id,

        agencyId:
          currentUser.agencyId,
      },

      select: {
        id:
          true,

        name:
          true,

        logoUrl:
          true,

        segment:
          true,

        instagramConnection: {
          select: {
            username:
              true,
          },
        },
      },
    });

  if (
    !client
  ) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-sm">
        <div className="p-7 md:p-8">
          <Link
            href={`/clientes/${client.id}/instagram/relatorios?periodo=${period}`}
            className="text-sm font-bold text-blue-300 hover:text-blue-200"
          >
            &larr; Voltar ao relatório
          </Link>

          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white bg-white text-xl font-black text-slate-900">
                {client.logoUrl ? (
                  <img
                    src={client.logoUrl}
                    alt={client.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  client.name
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-violet-300">
                  <BrainCircuit
                    size={17}
                  />

                  <p className="text-xs font-black uppercase tracking-[0.18em]">
                    Relatórios · Análise IA
                  </p>
                </div>

                <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
                  {client.name}
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  {client.instagramConnection?.username
                    ? `@${client.instagramConnection.username}`
                    : client.segment ||
                      'Cliente AprovUp'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
              <p className="text-xs font-bold text-slate-400">
                Período analisado
              </p>

              <p className="mt-1 text-lg font-black text-white">
                Últimos {period} dias
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          <Link
            href={`/clientes/${client.id}/instagram/relatorios?periodo=${period}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Resumo
          </Link>

          <Link
            href={`/clientes/${client.id}/instagram/relatorios/retencao?periodo=${period}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Retenção de Reels
          </Link>

          <Link
            href={`/clientes/${client.id}/instagram/relatorios/estaticos?periodo=${period}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Imagens e Carrosséis
          </Link>

          <span className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">
            Análise IA
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            Janela de análise
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            Estratégia baseada nos dados do cliente
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map(
            (
              option
            ) => (
              <Link
                key={option}
                href={`/clientes/${client.id}/instagram/relatorios/analise-ia?periodo=${option}`}
                className={
                  option ===
                  period
                    ? 'rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white'
                    : 'rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200'
                }
              >
                {option} dias
              </Link>
            )
          )}
        </div>
      </section>

      <InstagramAiAnalysisClient
        clientId={
          client.id
        }
        period={
          period
        }
      />
    </div>
  );
}
