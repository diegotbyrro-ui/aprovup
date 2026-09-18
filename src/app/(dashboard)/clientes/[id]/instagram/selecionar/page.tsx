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
          Selecione a Página e o Instagram de {client.name}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          A Meta encontrou os ativos que você pode administrar.
          Confira o portfólio empresarial, a Página do Facebook e o Instagram profissional antes de conectar.
        </p>

      </section>


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
                  Verifique se a Página possui um Instagram profissional vinculado e se o usuário autorizado tem acesso ao ativo na Meta.
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


              <div className="space-y-5">

                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                  <div className="flex items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-600 text-white">
                      <InstagramIcon
                        size={23}
                      />
                    </div>


                    <div>

                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-pink-500">
                        Instagram profissional
                      </p>

                      <h2 className="mt-1 text-xl font-black text-slate-900">
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


                      <div className="mt-3 flex flex-wrap gap-2">

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

                    </div>

                  </div>


                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Conectar esta conta
                  </button>

                </div>


                <div className="grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">

                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500">
                      Meta Business
                    </p>


                    <p className="mt-2 text-sm font-black text-slate-900">

                      {
                        account.businessName
                          ? account.businessName
                          : account.discoverySource ===
                              'DIRECT'
                            ? 'Acesso direto à Página'
                            : 'Portfólio empresarial'
                      }

                    </p>


                    {
                      account.businessId
                        ? (
                          <p className="mt-1 break-all font-mono text-[9px] text-slate-400">
                            ID: {account.businessId}
                          </p>
                        )
                        : (
                          <p className="mt-1 text-[9px] leading-4 text-slate-400">
                            O ativo foi localizado diretamente entre as Páginas administradas.
                          </p>
                        )
                    }


                    <span className="mt-3 inline-flex rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[9px] font-black text-blue-700">

                      {
                        account.discoverySource ===
                          'BUSINESS_OWNED'
                            ? 'Portfólio próprio'
                            : account.discoverySource ===
                                'BUSINESS_CLIENT'
                              ? 'Portfólio de cliente'
                              : 'Acesso direto'
                      }

                    </span>

                  </div>


                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">

                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-indigo-500">
                      Página do Facebook
                    </p>


                    <p className="mt-2 text-sm font-black text-slate-900">
                      {
                        account.facebookPageName ||
                        'Página sem nome'
                      }
                    </p>


                    <p className="mt-1 break-all font-mono text-[9px] text-slate-400">
                      ID: {account.facebookPageId}
                    </p>


                    <p className="mt-3 text-[9px] leading-4 text-slate-500">
                      Página administrada pelo usuário e vinculada ao Instagram profissional.
                    </p>

                  </div>


                  <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4">

                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-pink-500">
                      Instagram profissional
                    </p>


                    <p className="mt-2 text-sm font-black text-slate-900">

                      {
                        account.username
                          ? `@${account.username}`
                          : account.displayName ||
                            'Instagram'
                      }

                    </p>


                    <p className="mt-1 break-all font-mono text-[9px] text-slate-400">
                      ID: {account.instagramUserId}
                    </p>


                    <p className="mt-3 text-[9px] leading-4 text-slate-500">
                      Conta profissional identificada pela Meta como vinculada à Página acima.
                    </p>

                  </div>

                </div>


                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">

                  <p className="text-[10px] font-bold leading-5 text-emerald-800">
                    Vínculo identificado pela Meta:
                    {' '}
                    <strong>
                      {account.facebookPageName}
                    </strong>
                    {' → '}
                    <strong>
                      {
                        account.username
                          ? `@${account.username}`
                          : account.displayName ||
                            'Instagram'
                      }
                    </strong>
                  </p>

                </div>

              </div>

            </form>
          )
        )}

      </section>

    </div>
  );
}
