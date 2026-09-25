import {
  randomUUID,
} from 'crypto';

import Link from 'next/link';
import {
  notFound,
} from 'next/navigation';

import {
  prisma,
} from '@/lib/prisma';

import {
  requireAgencyContext,
} from '@/lib/tenant';

import {
  FINAL_PENDING_STATUSES,
  FINAL_VISIBLE_STATUSES,
  finalApprovalMonthNames,
  getFinalApprovalMonthParts,
} from '@/lib/finalMonthlyApproval';

import {
  CopyFinalApprovalLinkButton,
} from './CopyFinalApprovalLinkButton';


function formatDateTime(
  date:
    Date
) {

  return new Date(
    date
  ).toLocaleString(
    'pt-BR',
    {
      timeZone:
        'America/Maceio',

      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  );
}


export default async function FinalApprovalManagerPage({
  params,
}: {
  params:
    Promise<{
      id:
        string;
    }>;
}) {

  const {
    agencyId,
  } =
    await requireAgencyContext();


  const {
    id,
  } =
    await params;


  const client =
    await prisma.client.findFirst({
      where: {
        id,
        agencyId,
      },
    });


  if (
    !client
  ) {
    notFound();
  }


  /*
   * Somente materiais realmente existentes podem entrar
   * na 2ª Etapa.
   *
   * Isso deixa o carrossel Cultura Japonesa fora enquanto
   * ele estiver sem arquivos.
   */
  const contents =
    await prisma.content.findMany({
      where: {
        clientId:
          id,

        client: {
          agencyId,
        },

        format: {
          not:
            'DEMANDA_EMERGENCIAL',
        },

        plannedDate: {
          not:
            null,
        },

        status: {
          in:
            FINAL_VISIBLE_STATUSES,
        },

        OR: [
          {
            finalMediaUrl: {
              not:
                null,
            },
          },

          {
            finalCoverUrl: {
              not:
                null,
            },
          },

          {
            finalExternalUrl: {
              not:
                null,
            },
          },

          {
            storyMediaUrl: {
              not:
                null,
            },
          },

          {
            storyCoverUrl: {
              not:
                null,
            },
          },

          {
            instagramMediaAssets: {
              some:
                {},
            },
          },
        ],
      },

      select: {
        id:
          true,

        title:
          true,

        status:
          true,

        plannedDate:
          true,
      },

      orderBy: [
        {
          plannedDate:
            'asc',
        },

        {
          createdAt:
            'asc',
        },
      ],
    });


  type MonthGroup = {
    year:
      number;

    month:
      number;

    contents:
      typeof contents;
  };


  const grouped =
    new Map<
      string,
      MonthGroup
    >();


  for (
    const content
    of contents
  ) {

    if (
      !content.plannedDate
    ) {
      continue;
    }


    const {
      year,
      month,
    } =
      getFinalApprovalMonthParts(
        content.plannedDate
      );


    const key =
      String(
        year
      ) +
      '-' +
      String(
        month
      );


    const existing =
      grouped.get(
        key
      );


    if (
      existing
    ) {

      existing
        .contents
        .push(
          content
        );

    }
    else {

      grouped.set(
        key,
        {
          year,
          month,
          contents: [
            content,
          ],
        }
      );
    }
  }


  const groups =
    Array.from(
      grouped.values()
    )
      .map(
        (
          group
        ) => {

          const pending =
            group.contents.filter(
              (
                content
              ) =>
                FINAL_PENDING_STATUSES.includes(
                  content.status
                )
            ).length;


          const changes =
            group.contents.filter(
              (
                content
              ) =>
                content.status ===
                'ALTERACAO_SOLICITADA'
            ).length;


          const approved =
            group.contents.filter(
              (
                content
              ) =>
                content.status ===
                'PRONTO_PARA_POSTAR'
            ).length;


          return {
            ...group,

            total:
              group.contents.length,

            pending,

            changes,

            approved,
          };
        }
      );


  /*
   * Igual à primeira etapa:
   * quando houver algo aguardando decisão naquele mês,
   * garantimos que exista exatamente um link mensal.
   */
  for (
    const group
    of groups
  ) {

    if (
      group.pending ===
        0 &&
      group.changes ===
        0
    ) {
      continue;
    }


    const created =
      await prisma
        .finalMonthlyApproval
        .createMany({
          data: [
            {
              clientId:
                id,

              month:
                group.month,

              year:
                group.year,

              token:
                randomUUID(),

              status:
                'PENDENTE',
            },
          ],

          skipDuplicates:
            true,
        });


    if (
      created.count >
      0
    ) {

      await prisma
        .historyLog
        .create({
          data: {
            entityType:
              'CLIENT',

            entityId:
              id,

            action:
              'FINAL_MONTHLY_APPROVAL_LINK_CREATED',

            description:
              'Link mensal da 2ª Etapa de Aprovação criado para ' +
              client.name +
              ' - ' +
              String(
                group.month
              ) +
              '/' +
              String(
                group.year
              ) +
              '.',

            authorName:
              'Equipe AprovUp',
          },
        });
    }
  }


  const approvals =
    await prisma
      .finalMonthlyApproval
      .findMany({
        where: {
          clientId:
            id,
        },

        orderBy: [
          {
            year:
              'desc',
          },

          {
            month:
              'desc',
          },
        ],
      });


  const approvalByMonth =
    new Map(
      approvals.map(
        (
          approval
        ) => [
          String(
            approval.year
          ) +
            '-' +
            String(
              approval.month
            ),

          approval,
        ]
      )
    );


  const activeGroups =
    groups
      .filter(
        (
          group
        ) =>
          group.pending >
            0 ||
          group.changes >
            0
      )
      .map(
        (
          group
        ) => ({
          ...group,

          approval:
            approvalByMonth.get(
              String(
                group.year
              ) +
                '-' +
                String(
                  group.month
                )
            ) ||
            null,
        })
      )
      .filter(
        (
          group
        ) =>
          Boolean(
            group.approval
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          b.year -
            a.year ||
          b.month -
            a.month
      );


  return (
    <main className="space-y-6">

      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">

        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl" />


        <div className="relative z-10">

          <Link
            href={
              '/clientes/' +
              id +
              '/visao'
            }
            className="mb-3 inline-block text-sm text-blue-200 hover:underline"
          >
            ← Voltar para visão do cliente
          </Link>


          <p className="text-sm font-bold uppercase tracking-wider text-cyan-300">
            2ª Etapa de Aprovação
          </p>


          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            {client.name}
          </h1>


          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Um link por mês para o cliente revisar os materiais finalizados, aprovar ou solicitar alterações.
          </p>

        </div>

      </section>


      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 p-5">

          <h2 className="text-lg font-bold text-slate-900">
            Aprovações pendentes
          </h2>


          <p className="mt-1 text-sm text-slate-500">
            Cada mês possui um único link. A Social Media pode abrir, copiar e enviar esse link para o cliente.
          </p>

        </div>


        {activeGroups.length ===
        0 ? (

          <div className="p-8 text-center">

            <p className="font-bold text-slate-900">
              Nenhuma aprovação final pendente.
            </p>


            <p className="mt-1 text-sm text-slate-500">
              Quando houver material final aguardando decisão do cliente, o link mensal aparecerá aqui automaticamente.
            </p>

          </div>

        ) : (

          <div className="divide-y divide-slate-100">

            {activeGroups.map(
              (
                group
              ) => {

                const approval =
                  group.approval!;


                const publicUrl =
                  '/aprovacao-final/' +
                  approval.token;


                return (

                  <div
                    key={
                      String(
                        group.year
                      ) +
                      '-' +
                      String(
                        group.month
                      )
                    }
                    className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between"
                  >

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="font-bold text-slate-900">
                          {
                            finalApprovalMonthNames[
                              group.month
                            ]
                          } / {group.year}
                        </h3>


                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          PENDENTE
                        </span>

                      </div>


                      <p className="mt-2 text-xs text-slate-500">
                        Criado em {
                          formatDateTime(
                            approval.createdAt
                          )
                        }
                      </p>


                      <div className="mt-3 flex flex-wrap gap-2 text-xs">

                        <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600">
                          Total: {group.total}
                        </span>


                        <span className="rounded-full bg-blue-50 px-2 py-1 font-bold text-blue-700">
                          Pendentes: {group.pending}
                        </span>


                        <span className="rounded-full bg-orange-50 px-2 py-1 font-bold text-orange-700">
                          Alterações: {group.changes}
                        </span>


                        <span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                          Aprovados: {group.approved}
                        </span>

                      </div>


                      <p className="mt-3 break-all text-xs text-slate-500">
                        {publicUrl}
                      </p>

                    </div>


                    <div className="flex flex-wrap gap-2">

                      <Link
                        href={
                          publicUrl
                        }
                        target="_blank"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                      >
                        Abrir link
                      </Link>


                      <CopyFinalApprovalLinkButton
                        path={
                          publicUrl
                        }
                      />

                    </div>

                  </div>

                );
              }
            )}

          </div>

        )}

      </section>

    </main>
  );
}
