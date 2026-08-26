'use server';

import {
  redirect,
} from 'next/navigation';

import {
  revalidatePath,
} from 'next/cache';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  decryptMetaSecret,
  encryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  META_INSTAGRAM_SCOPES,
  type ManagedInstagramAccount,
} from '@/lib/metaInstagram';


export async function saveInstagramConnectionAction(
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
    );

  const sessionId =
    String(
      formData.get(
        'sessionId'
      ) ||
      ''
    );

  const instagramUserId =
    String(
      formData.get(
        'instagramUserId'
      ) ||
      ''
    );

  if (
    !clientId ||
    !sessionId ||
    !instagramUserId
  ) {
    redirect(
      '/clientes'
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
      clientId ||
    session.userId !==
      user.id ||
    session.expiresAt <
      new Date() ||
    !session.encryptedPayload
  ) {
    redirect(
      `/clientes/${clientId}/instagram?error=session`
    );
  }

  const payload =
    JSON.parse(
      decryptMetaSecret(
        session
          .encryptedPayload
      )
    ) as {
      userAccessToken:
        string;

      tokenExpiresAt:
        string | null;

      accounts:
        ManagedInstagramAccount[];
    };

  const selected =
    payload.accounts.find(
      (
        account
      ) =>
        account.instagramUserId ===
        instagramUserId
    );

  if (!selected) {
    redirect(
      `/clientes/${clientId}/instagram?error=account`
    );
  }

  const alreadyUsed =
    await prisma
      .instagramConnection
      .findFirst({
        where: {
          instagramUserId,

          clientId: {
            not:
              clientId,
          },
        },

        include: {
          client:
            true,
        },
      });

  if (alreadyUsed) {
    redirect(
      `/clientes/${clientId}/instagram?error=already_connected`
    );
  }

  await prisma
    .instagramConnection
    .upsert({
      where: {
        clientId,
      },

      create: {
        clientId,

        instagramUserId:
          selected
            .instagramUserId,

        username:
          selected
            .username,

        displayName:
          selected
            .displayName,

        facebookPageId:
          selected
            .facebookPageId,

        facebookPageName:
          selected
            .facebookPageName,

        pageAccessTokenEncrypted:
          encryptMetaSecret(
            selected
              .pageAccessToken
          ),

        userAccessTokenEncrypted:
          encryptMetaSecret(
            payload
              .userAccessToken
          ),

        tokenExpiresAt:
          payload
            .tokenExpiresAt
            ? new Date(
                payload
                  .tokenExpiresAt
              )
            : null,

        scopes:
          META_INSTAGRAM_SCOPES
            .join(
              ','
            ),

        status:
          'ATIVO',

        connectedByUserId:
          user.id,

        connectedAt:
          new Date(),
      },

      update: {
        instagramUserId:
          selected
            .instagramUserId,

        username:
          selected
            .username,

        displayName:
          selected
            .displayName,

        facebookPageId:
          selected
            .facebookPageId,

        facebookPageName:
          selected
            .facebookPageName,

        pageAccessTokenEncrypted:
          encryptMetaSecret(
            selected
              .pageAccessToken
          ),

        userAccessTokenEncrypted:
          encryptMetaSecret(
            payload
              .userAccessToken
          ),

        tokenExpiresAt:
          payload
            .tokenExpiresAt
            ? new Date(
                payload
                  .tokenExpiresAt
              )
            : null,

        scopes:
          META_INSTAGRAM_SCOPES
            .join(
              ','
            ),

        status:
          'ATIVO',

        connectedByUserId:
          user.id,

        connectedAt:
          new Date(),
      },
    });

  await prisma
    .metaOAuthSession
    .deleteMany({
      where: {
        id:
          session.id,
      },
    });

  revalidatePath(
    `/clientes/${clientId}/instagram`
  );

  redirect(
    `/clientes/${clientId}/instagram?connected=1`
  );
}
