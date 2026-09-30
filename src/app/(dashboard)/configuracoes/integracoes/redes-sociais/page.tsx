import Link from 'next/link';

import {
  redirect,
} from 'next/navigation';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  canAccessClient,
} from '@/lib/clientAccess';

import {
  requireSaasFeature,
} from '@/lib/saasAccess';

import {
  disconnectSocialConnectionAction,
} from './actions';


function connectionFor(
  connections:
    Array<{
      platform:
        string;

      status:
        string;

      accountName:
        string | null;

      accountUsername:
        string | null;

      scopes:
        string | null;

      tokenExpiresAt:
        Date | null;

      connectedAt:
        Date | null;
    }>,

  platform:
    string
) {

  return connections.find(
    (
      connection
    ) =>
      connection.platform ===
      platform
  );
}


function dateLabel(
  value:
    Date |
    null |
    undefined
) {

  if (!value) {
    return 'â€”';
  }


  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle:
        'short',

      timeStyle:
        'short',

      timeZone:
        'America/Maceio',
    }
  ).format(
    value
  );
}


export default async function SocialConnectionsPage({
  searchParams,
}: {
  searchParams:
    Promise<{
      cliente?:
        string;

      youtube?:
        string;

      tiktok?:
        string;
    }>;
}) {

  await requireSaasFeature(
    'socialPosting'
  );


  const user =
    await requirePermission(
      'social.manage'
    );


  const params =
    await searchParams;


  const allClients =
    await prisma.client
      .findMany({
        where: {
          agencyId:
            user.agencyId,
        },

        orderBy: {
          name:
            'asc',
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
      });


  const clients =
    allClients.filter(
      (
        client
      ) =>
        canAccessClient(
          user,
          client
        )
    );


  if (
    !clients.length
  ) {

    redirect(
      '/clientes'
    );
  }


  const requestedClientId =
    String(
      params.cliente ||
      ''
    ).trim();


  const selectedClient =
    clients.find(
      (
        client
      ) =>
        client.id ===
        requestedClientId
    ) ||
    clients[0];


  if (
    !requestedClientId ||
    requestedClientId !==
      selectedClient.id
  ) {

    redirect(
      '/configuracoes/integracoes/redes-sociais?cliente=' +
      encodeURIComponent(
        selectedClient.id
      )
    );
  }


  const connections =
    await prisma
      .socialConnection
      .findMany({
        where: {
          clientId:
            selectedClient.id,

          platform: {
            in: [
              'YOUTUBE',
              'TIKTOK',
            ],
          },
        },

        select: {
          platform:
            true,

          status:
            true,

          accountName:
            true,

          accountUsername:
            true,

          scopes:
            true,

          tokenExpiresAt:
            true,

          connectedAt:
            true,
        },
      });


  const youtube =
    connectionFor(
      connections,
      'YOUTUBE'
    );


  const tiktok =
    connectionFor(
      connections,
      'TIKTOK'
    );


  const youtubeConfigured =
    Boolean(
      process.env
        .YOUTUBE_CLIENT_ID &&
      process.env
        .YOUTUBE_CLIENT_SECRET &&
      process.env
        .APROVUP_INTEGRATION_ENCRYPTION_KEY
    );


  const tiktokConfigured =
    Boolean(
      process.env
        .TIKTOK_CLIENT_KEY &&
      process.env
        .TIKTOK_CLIENT_SECRET &&
      process.env
        .APROVUP_INTEGRATION_ENCRYPTION_KEY
    );


  const messages:
    Record<
      string,
      string
    > = {

    connected:
      'Conta conectada com sucesso.',

    disconnected:
      'Conta desconectada.',

    'server-config':
      'As credenciais desta plataforma ainda nÃ£o estÃ£o configuradas no servidor.',

    state:
      'A sessÃ£o de conexÃ£o expirou ou nÃ£o pÃ´de ser validada. Tente novamente.',

    denied:
      'A autorizaÃ§Ã£o foi cancelada.',

    token:
      'A plataforma recusou a troca do cÃ³digo de autorizaÃ§Ã£o.',

    channel:
      'A conta Google foi autorizada, mas nenhum canal do YouTube pÃ´de ser identificado.',

    profile:
      'A conta TikTok foi autorizada, mas o perfil nÃ£o pÃ´de ser identificado.',

    client:
      'Este cliente nÃ£o estÃ¡ disponÃ­vel para o usuÃ¡rio atual.',
  };


  const youtubeMessage =
    params.youtube
      ? messages[
          params.youtube
        ]
      : null;


  const tiktokMessage =
    params.tiktok
      ? messages[
          params.tiktok
        ]
      : null;


  return (
    <div className="space-y-6">

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-7 text-white">

        <Link
          href={
            '/pronto-para-postar?cliente=' +
            encodeURIComponent(
              selectedClient.id
            )
          }
          className="text-xs font-bold text-blue-200 hover:underline"
        >
          â† Voltar para Pronto para Postar
        </Link>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
          IntegraÃ§Ãµes sociais
        </p>

        <h1 className="mt-2 text-3xl font-black">
          TikTok e YouTube
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          Conecte as contas do cliente. As credenciais ficam armazenadas de forma criptografada e separadas por cliente.
        </p>

      </section>


      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
          Cliente
        </p>

        <form
          method="GET"
          className="mt-3 flex flex-col gap-3 sm:flex-row"
        >

          <select
            name="cliente"
            defaultValue={
              selectedClient.id
            }
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
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

          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Trocar cliente
          </button>

        </form>

      </section>


      <section className="grid gap-5 lg:grid-cols-2">

        <article className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">

          <div className="flex items-start justify-between gap-4">

            <div>

              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-xs font-black text-red-600">
                YT
              </span>

              <h2 className="mt-3 text-lg font-black text-slate-950">
                YouTube
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Canal utilizado para publicar vÃ­deos e Shorts.
              </p>

            </div>

            <span
              className={
                youtube
                  ?.status ===
                    'ATIVO'
                  ? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700'
                  : 'rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700'
              }
            >
              {
                youtube
                  ?.status ||
                'NÃƒO CONECTADO'
              }
            </span>

          </div>


          {
            youtubeMessage
              ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                  {youtubeMessage}
                </div>
              )
              : null
          }


          <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-xs">

            <p>
              <strong>Conta:</strong>{' '}
              {
                youtube
                  ?.accountName ||
                'Nenhuma'
              }
            </p>

            <p>
              <strong>Identificador:</strong>{' '}
              {
                youtube
                  ?.accountUsername ||
                'â€”'
              }
            </p>

            <p>
              <strong>Conectado em:</strong>{' '}
              {
                dateLabel(
                  youtube
                    ?.connectedAt
                )
              }
            </p>

            <p>
              <strong>Access token expira:</strong>{' '}
              {
                dateLabel(
                  youtube
                    ?.tokenExpiresAt
                )
              }
            </p>

          </div>


          <div className="mt-5 flex flex-wrap gap-2">
            {
              youtube
                ?.status ===
                  'ATIVO'
                ? (
                  <Link
                    href={
                      '/clientes/' +
                      encodeURIComponent(
                        selectedClient.id
                      ) +
                      '/youtube'
                    }
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 hover:bg-red-100"
                  >
                    Ver métricas
                  </Link>
                )
                : null
            }


            {
              youtube
                ?.status ===
                  'ATIVO'
                ? (
                  <form
                    action={
                      disconnectSocialConnectionAction
                    }
                  >

                    <input
                      type="hidden"
                      name="clientId"
                      value={
                        selectedClient.id
                      }
                    />

                    <input
                      type="hidden"
                      name="platform"
                      value="YOUTUBE"
                    />

                    <button
                      className="rounded-xl border border-red-200 px-4 py-2.5 text-xs font-black text-red-600"
                    >
                      Desconectar
                    </button>

                  </form>
                )
                : (
                  <Link
                    href={
                      '/api/integrations/youtube/connect?clientId=' +
                      encodeURIComponent(
                        selectedClient.id
                      )
                    }
                    className={[
                      'rounded-xl px-4 py-2.5 text-xs font-black',
                      youtubeConfigured
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'pointer-events-none bg-slate-200 text-slate-500',
                    ].join(
                      ' '
                    )}
                  >
                    Conectar YouTube
                  </Link>
                )
            }

          </div>


          {
            !youtubeConfigured
              ? (
                <p className="mt-3 text-[10px] font-bold text-amber-600">
                  Configure YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e APROVUP_INTEGRATION_ENCRYPTION_KEY no servidor.
                </p>
              )
              : null
          }

        </article>


        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-start justify-between gap-4">

            <div>

              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                TK
              </span>

              <h2 className="mt-3 text-lg font-black text-slate-950">
                TikTok
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Conta autorizada para publicaÃ§Ã£o via Content Posting API.
              </p>

            </div>

            <span
              className={
                tiktok
                  ?.status ===
                    'ATIVO'
                  ? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700'
                  : 'rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700'
              }
            >
              {
                tiktok
                  ?.status ||
                'NÃƒO CONECTADO'
              }
            </span>

          </div>


          {
            tiktokMessage
              ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                  {tiktokMessage}
                </div>
              )
              : null
          }


          <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-xs">

            <p>
              <strong>Conta:</strong>{' '}
              {
                tiktok
                  ?.accountName ||
                'Nenhuma'
              }
            </p>

            <p>
              <strong>PermissÃµes:</strong>{' '}
              {
                tiktok
                  ?.scopes ||
                'â€”'
              }
            </p>

            <p>
              <strong>Conectado em:</strong>{' '}
              {
                dateLabel(
                  tiktok
                    ?.connectedAt
                )
              }
            </p>

            <p>
              <strong>Access token expira:</strong>{' '}
              {
                dateLabel(
                  tiktok
                    ?.tokenExpiresAt
                )
              }
            </p>

          </div>


          <div className="mt-5 flex flex-wrap gap-2">

            {
              tiktok
                ?.status ===
                  'ATIVO'
                ? (
                  <form
                    action={
                      disconnectSocialConnectionAction
                    }
                  >

                    <input
                      type="hidden"
                      name="clientId"
                      value={
                        selectedClient.id
                      }
                    />

                    <input
                      type="hidden"
                      name="platform"
                      value="TIKTOK"
                    />

                    <button
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-black text-slate-700"
                    >
                      Desconectar
                    </button>

                  </form>
                )
                : (
                  <Link
                    href={
                      '/api/integrations/tiktok/connect?clientId=' +
                      encodeURIComponent(
                        selectedClient.id
                      )
                    }
                    className={[
                      'rounded-xl px-4 py-2.5 text-xs font-black',
                      tiktokConfigured
                        ? 'bg-slate-950 text-white hover:bg-slate-800'
                        : 'pointer-events-none bg-slate-200 text-slate-500',
                    ].join(
                      ' '
                    )}
                  >
                    Conectar TikTok
                  </Link>
                )
            }

          </div>


          {
            !tiktokConfigured
              ? (
                <p className="mt-3 text-[10px] font-bold text-amber-600">
                  Configure TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET e APROVUP_INTEGRATION_ENCRYPTION_KEY no servidor.
                </p>
              )
              : null
          }

        </article>

      </section>


      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

        <p className="text-xs font-black text-blue-900">
          PrÃ³xima etapa
        </p>

        <p className="mt-1 text-xs leading-relaxed text-blue-700">
          Depois das contas conectadas, o AprovUp poderÃ¡ renovar os tokens automaticamente e publicar cada conteÃºdo nas plataformas selecionadas de forma independente.
        </p>

      </section>

    </div>
  );
}