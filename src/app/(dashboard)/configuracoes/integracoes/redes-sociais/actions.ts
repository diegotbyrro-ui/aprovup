'use server';

import {
  revalidatePath,
} from 'next/cache';

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
  decryptSocialSecret,
  tiktokOauthConfig,
} from '@/lib/socialOAuth';


export async function disconnectSocialConnectionAction(
  formData:
    FormData
) {

  const user =
    await requirePermission(
      'social.manage'
    );


  const clientId =
    String(
      formData.get(
        'clientId'
      ) ||
      ''
    ).trim();


  const platform =
    String(
      formData.get(
        'platform'
      ) ||
      ''
    )
      .trim()
      .toUpperCase();


  if (
    ![
      'YOUTUBE',
      'TIKTOK',
    ].includes(
      platform
    )
  ) {

    throw new Error(
      'Plataforma inválida.'
    );
  }


  const client =
    await prisma.client
      .findFirst({
        where: {
          id:
            clientId,

          agencyId:
            user.agencyId,
        },

        select: {
          id:
            true,

          agencyId:
            true,

          internalResponsible:
            true,
        },
      });


  if (
    !client ||
    !canAccessClient(
      user,
      client
    )
  ) {

    redirect(
      '/clientes'
    );
  }


  const connection =
    await prisma
      .socialConnection
      .findUnique({
        where: {
          clientId_platform: {
            clientId:
              client.id,

            platform,
          },
        },
      });


  if (
    connection
      ?.encryptedAccessToken
  ) {

    try {

      const token =
        decryptSocialSecret(
          connection
            .encryptedAccessToken
        );


      if (
        platform ===
        'YOUTUBE'
      ) {

        await fetch(
          'https://oauth2.googleapis.com/revoke?token=' +
          encodeURIComponent(
            token
          ),
          {
            method:
              'POST',
          }
        );
      }


      if (
        platform ===
        'TIKTOK'
      ) {

        const config =
          tiktokOauthConfig();


        if (
          config.ready
        ) {

          await fetch(
            'https://open.tiktokapis.com/v2/oauth/revoke/',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/x-www-form-urlencoded',
              },

              body:
                new URLSearchParams({
                  client_key:
                    config.clientKey,

                  client_secret:
                    config.clientSecret,

                  token,
                }).toString(),
            }
          );
        }
      }

    }
    catch (
      error
    ) {

      console.error(
        'SOCIAL CONNECTION REVOKE ERROR',
        platform,
        error
      );
    }
  }


  await prisma
    .socialConnection
    .upsert({
      where: {
        clientId_platform: {
          clientId:
            client.id,

          platform,
        },
      },

      create: {
        clientId:
          client.id,

        platform,

        status:
          'PENDENTE',
      },

      update: {
        accountId:
          null,

        accountName:
          null,

        accountUsername:
          null,

        encryptedAccessToken:
          null,

        encryptedRefreshToken:
          null,

        tokenExpiresAt:
          null,

        scopes:
          null,

        status:
          'PENDENTE',

        connectedByUserId:
          null,

        connectedAt:
          null,

        lastSyncAt:
          null,

        metadata:
          undefined,
      },
    });


  revalidatePath(
    '/configuracoes/integracoes/redes-sociais'
  );


  revalidatePath(
    '/pronto-para-postar'
  );


  redirect(
    '/configuracoes/integracoes/redes-sociais?cliente=' +
    encodeURIComponent(
      client.id
    ) +
    '&' +
    platform.toLowerCase() +
    '=disconnected'
  );
}