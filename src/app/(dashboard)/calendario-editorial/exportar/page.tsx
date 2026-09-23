import Link from 'next/link';

import {
  CalendarDays,
  FileDown,
  Settings2,
} from 'lucide-react';

import {
  requireCurrentUser,
} from '@/lib/auth';

import {
  canAccessClient,
} from '@/lib/clientAccess';

import {
  prisma,
} from '@/lib/prisma';

import {
  hasPermission,
} from '@/lib/userAccess';


const months = [
  {
    value:
      1,

    label:
      'Janeiro',
  },
  {
    value:
      2,

    label:
      'Fevereiro',
  },
  {
    value:
      3,

    label:
      'Marco',
  },
  {
    value:
      4,

    label:
      'Abril',
  },
  {
    value:
      5,

    label:
      'Maio',
  },
  {
    value:
      6,

    label:
      'Junho',
  },
  {
    value:
      7,

    label:
      'Julho',
  },
  {
    value:
      8,

    label:
      'Agosto',
  },
  {
    value:
      9,

    label:
      'Setembro',
  },
  {
    value:
      10,

    label:
      'Outubro',
  },
  {
    value:
      11,

    label:
      'Novembro',
  },
  {
    value:
      12,

    label:
      'Dezembro',
  },
];


export default async function ExportEditorialCalendarPage({
  searchParams,
}: {
  searchParams?:
    Promise<{
      cliente?:
        string;

      mes?:
        string;

      ano?:
        string;
    }>;
}) {
  const currentUser =
    await requireCurrentUser();


  const params =
    searchParams
      ? await searchParams
      : {};


  const now =
    new Date();


  const month =
    Math.min(
      12,
      Math.max(
        1,
        Number(
          params.mes ||
          now.getMonth() +
            1
        )
      )
    );


  const year =
    Number(
      params.ano ||
      now.getFullYear()
    );


  const [
    candidateClients,
    templates,
  ] =
    await Promise.all([
      prisma.client
        .findMany({
          where: {
            agencyId:
              currentUser.agencyId,
          },

          select: {
            id:
              true,

            name:
              true,

            agencyId:
              true,

            internalResponsible:
              true,
          },

          orderBy: {
            name:
              'asc',
          },
        }),

      prisma
        .editorialCalendarTemplate
        .findMany({
          where: {
            agencyId:
              currentUser.agencyId,

            status:
              'ATIVO',
          },

          orderBy: [
            {
              isDefault:
                'desc',
            },

            {
              createdAt:
                'desc',
            },
          ],
        }),
    ]);


  const clients =
    candidateClients
      .filter(
        (
          client
        ) =>
          canAccessClient(
            currentUser,
            client
          )
      );


  const preferredClient =
    clients.some(
      (
        client
      ) =>
        client.id ===
        params.cliente
    )
      ? String(
          params.cliente
        )
      : clients[0]
        ?.id ||
        '';


  const canManage =
    hasPermission(
      currentUser,
      'settings.manage'
    );


  const years =
    Array.from(
      {
        length:
          7,
      },
      (
        _,
        index
      ) =>
        year -
        3 +
        index
    );


  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <section className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-sm">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <CalendarDays
                size={21}
              />
            </div>

            <h1 className="mt-4 text-3xl font-black">
              Calendario para o cliente
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Gere o planejamento mensal usando o layout white-label da agencia.
            </p>

          </div>


          {
            canManage
              ? (
                <Link
                  href="/configuracoes/calendario-editorial"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold text-white hover:bg-white/15"
                >
                  <Settings2
                    size={15}
                  />

                  Configurar modelos
                </Link>
              )
              : null
          }

        </div>

      </section>


      {
        templates.length ===
        0
          ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">

              <p className="font-bold text-amber-800">
                Nenhum modelo de calendario cadastrado.
              </p>

              <p className="mt-1 text-sm text-amber-700">
                Envie primeiro o PDF da Level UP em Modelos de calendario.
              </p>

            </section>
          )
          : null
      }


      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div>

          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
            Gerar PDF
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Planejamento editorial mensal
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            O AprovUp vai usar os conteudos cadastrados no Calendario Editorial.
          </p>

        </div>


        <form
          action="/api/calendario-editorial/gerar"
          method="GET"
          target="_blank"
          className="mt-6 space-y-5"
        >

          <div className="grid gap-4 md:grid-cols-2">

            <label className="space-y-2">

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Cliente
              </span>

              <select
                name="cliente"
                defaultValue={
                  preferredClient
                }
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
              >
                {
                  clients.map(
                    (
                      client
                    ) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {client.name}
                      </option>
                    )
                  )
                }
              </select>

            </label>


            <label className="space-y-2">

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Modelo
              </span>

              <select
                name="modelo"
                defaultValue={
                  templates[0]
                    ?.id ||
                  ''
                }
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
              >
                {
                  templates.map(
                    (
                      template
                    ) => (
                      <option
                        key={
                          template.id
                        }
                        value={
                          template.id
                        }
                      >
                        {template.name}
                        {
                          template.isDefault
                            ? ' - Padrao'
                            : ''
                        }
                      </option>
                    )
                  )
                }
              </select>

            </label>


            <label className="space-y-2">

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Mes
              </span>

              <select
                name="mes"
                defaultValue={
                  month
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800"
              >
                {
                  months.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    )
                  )
                }
              </select>

            </label>


            <label className="space-y-2">

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Ano
              </span>

              <select
                name="ano"
                defaultValue={
                  year
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800"
              >
                {
                  years.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item}
                      </option>
                    )
                  )
                }
              </select>

            </label>

          </div>


          <label className="block space-y-2">

            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Foco do mes
            </span>

            <input
              name="foco"
              type="text"
              maxLength={180}
              placeholder="Ex.: Matriculas 2027, campanha principal ou objetivo do mes"
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-blue-500"
            />

          </label>


          <label className="block space-y-2">

            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Observacao
            </span>

            <input
              name="observacao"
              type="text"
              maxLength={180}
              placeholder="Ex.: Ajustes e direcionamentos gerais"
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-blue-500"
            />

          </label>


          <button
            type="submit"
            disabled={
              templates.length ===
              0 ||
              clients.length ===
              0
            }
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown
              size={17}
            />

            Gerar calendario PDF
          </button>

        </form>

      </section>

    </div>
  );
}
