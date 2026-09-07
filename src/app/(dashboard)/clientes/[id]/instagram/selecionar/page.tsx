import {
  notFound,
  redirect,
} from 'next/navigation';

import {
  Users,
  Images,
} from 'lucide-react';

import {
  InstagramIcon,
} from '@/components/icons/InstagramIcon';

import {
  prisma,
} from '@/lib/prisma';
import {
  canUseMetaIntegration,
} from '@/lib/metaAccess';

import {
  isCommanderUser,
} from '@/lib/commanderAccess';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import type {
  ManagedInstagramAccount,
  MetaInstagramDiscoveryDiagnostics,
} from '@/lib/metaInstagram';

import {
  saveInstagramConnectionAction,
} from '../actions';


export default async function SelectInstagramAccountPage({
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
      session?:
        string;
    }>;
}) {
  const user =
    await requirePermission(
      'social.manage'
    );

  const {
    id,
  } = await params;


  const isSaasAdmin =
    isCommanderUser(
      user
    );

  if (
    !canUseMetaIntegration(
      user
    )
  ) {
    redirect(
      `/clientes/${id}/instagram?error=meta_review`
    );
  }

  const query =
    await searchParams;

  const sessionId =
    query.session;

  const client =
    await prisma
      .client
      .findFirst({
        where: {
          id,

          agencyId:
            user.agencyId,
        },

        select: {
          id:
            true,

          name:
            true,
        },
      });

  if (!client) {
    notFound();
  }

  if (!sessionId) {
    redirect(
      `/clientes/${id}/instagram?error=session`
    );
  }

  const session =
    await prisma
      .metaOAuthSession
      .findUnique({
        where: {
          id:
            sessionId,
        },
      });

  if (
    !session ||
    session.clientId !==
      id ||
    session.userId !==
      user.id ||
    session.expiresAt <
      new Date() ||
    !session.encryptedPayload
  ) {
    redirect(
      `/clientes/${id}/instagram?error=session`
    );
  }

  const payload =
    JSON.parse(
      decryptMetaSecret(
        session
          .encryptedPayload
      )
    ) as {
      accounts:
        ManagedInstagramAccount[];

      diagnostics?:
        MetaInstagramDiscoveryDiagnostics;
    };

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8">

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-300">
          Instagram
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Qual conta pertence a {client.name}?
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          A Meta encontrou as contas profissionais que você pode administrar.
          Escolha somente o Instagram deste cliente.
        </p>

      </section>


      {
        isSaasAdmin &&
        payload.diagnostics
          ? (

            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                    Commander
                  </p>

                  <h2 className="mt-1 text-lg font-black text-slate-900">
                    Diagnóstico de descoberta Meta
                  </h2>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Esta área é visível somente para o administrador do AprovUp.
                  </p>

                </div>


                <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
                  {
                    payload
                      .diagnostics
                      .profilesLoaded
                  } Instagram(s) elegível(is)
                </span>

              </div>


              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">

                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-slate-900">
                    {
                      payload
                        .diagnostics
                        .directPages
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Páginas diretas
                  </p>

                </div>


                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-slate-900">
                    {
                      payload
                        .diagnostics
                        .businesses
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Portfólios
                  </p>

                </div>


                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-slate-900">
                    {
                      payload
                        .diagnostics
                        .ownedPages +
                      payload
                        .diagnostics
                        .clientPages
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Páginas dos portfólios
                  </p>

                </div>


                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-slate-900">
                    {
                      payload
                        .diagnostics
                        .uniquePages
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Páginas únicas
                  </p>

                </div>


                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-emerald-700">
                    {
                      payload
                        .diagnostics
                        .eligiblePages
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Aptas para Instagram
                  </p>

                </div>


                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-slate-900">
                    {
                      payload
                        .diagnostics
                        .hydratedPages
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Consultadas por ID
                  </p>

                </div>


                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-amber-700">
                    {
                      payload
                        .diagnostics
                        .pagesWithoutInstagram
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sem Instagram vinculado
                  </p>

                </div>


                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-amber-700">
                    {
                      payload
                        .diagnostics
                        .pagesWithoutAccessToken
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sem Page Token
                  </p>

                </div>


                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-slate-900">
                    {
                      payload
                        .diagnostics
                        .profilesLoaded
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Perfis carregados
                  </p>

                </div>


                <div className="rounded-2xl bg-white p-4 shadow-sm">

                  <p className="text-2xl font-black text-red-600">
                    {
                      payload
                        .diagnostics
                        .profileErrors
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Falhas de perfil
                  </p>

                </div>

              </div>


              {
                payload
                  .diagnostics
                  .graphErrors
                  .length >
                  0
                    ? (

                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">

                        <p className="text-xs font-black text-amber-900">
                          A Meta recusou algumas consultas
                        </p>

                        <div className="mt-2 space-y-1">

                          {
                            payload
                              .diagnostics
                              .graphErrors
                              .slice(
                                0,
                                6
                              )
                              .map(
                                (
                                  error,
                                  index
                                ) => (

                                  <p
                                    key={`${index}-${error}`}
                                    className="break-words text-[11px] leading-relaxed text-amber-800"
                                  >
                                    {error}
                                  </p>

                                )
                              )
                          }

                        </div>

                      </div>

                    )
                    : null
              }

            </section>

          )
          : null
      }


      {
        payload.accounts.length ===
          0
            ? (

              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">

                <p className="text-lg font-black text-amber-900">
                  Nenhuma conta profissional elegível foi encontrada
                </p>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-amber-700">
                  A Meta autenticou a conta, mas nenhuma combinação de Página com Page Token e Instagram profissional vinculado pôde ser carregada.
                  Consulte o diagnóstico acima para identificar o motivo.
                </p>

              </section>

            )
            : null
      }


      <section className="space-y-4">

        {payload.accounts.map(
          (
            account
          ) => (
            <form
              key={
                account.instagramUserId
              }
              action={
                saveInstagramConnectionAction
              }
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >

              <input
                type="hidden"
                name="clientId"
                value={
                  client.id
                }
              />

              <input
                type="hidden"
                name="sessionId"
                value={
                  session.id
                }
              />

              <input
                type="hidden"
                name="instagramUserId"
                value={
                  account.instagramUserId
                }
              />


              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                <div className="flex items-start gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-600 text-white">
                    <InstagramIcon
                      size={23}
                    />
                  </div>


                  <div>

                    <h2 className="text-lg font-bold text-slate-900">
                      {
                        account.username
                          ? `@${account.username}`
                          : account.displayName ||
                            'Instagram'
                      }
                    </h2>

                    {
                      account.displayName &&
                      (
                        <p className="mt-1 text-sm text-slate-500">
                          {
                            account.displayName
                          }
                        </p>
                      )
                    }


                    <div className="mt-4 flex flex-wrap gap-2">

                      {
                        account.followersCount !==
                          null &&
                        (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

                            <Users
                              size={14}
                            />

                            {
                              account.followersCount.toLocaleString(
                                'pt-BR'
                              )
                            }

                            seguidores

                          </span>
                        )
                      }


                      {
                        account.mediaCount !==
                          null &&
                        (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

                            <Images
                              size={14}
                            />

                            {
                              account.mediaCount.toLocaleString(
                                'pt-BR'
                              )
                            }

                            publicações

                          </span>
                        )
                      }

                    </div>


                    <p className="mt-3 text-xs text-slate-400">
                      Página vinculada: {
                        account.facebookPageName
                      }
                    </p>


                    {
                      isSaasAdmin
                        ? (

                          <p className="mt-1 text-[10px] font-semibold text-blue-500">
                            Origem Meta: {
                              account.discoverySource ===
                                'BUSINESS_OWNED'
                                  ? 'Portfólio próprio'
                                  : account.discoverySource ===
                                      'BUSINESS_CLIENT'
                                    ? 'Portfólio de cliente'
                                    : 'Acesso direto'
                            }

                            {
                              account.businessName
                                ? ` • ${account.businessName}`
                                : ''
                            }
                          </p>

                        )
                        : null
                    }

                  </div>

                </div>


                <button
                  type="submit"
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Conectar esta conta
                </button>

              </div>

            </form>
          )
        )}

      </section>

    </div>
  );
}
