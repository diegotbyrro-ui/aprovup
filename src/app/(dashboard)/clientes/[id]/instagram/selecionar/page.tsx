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
  requirePermission,
} from '@/lib/userAccess';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import type {
  ManagedInstagramAccount,
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
