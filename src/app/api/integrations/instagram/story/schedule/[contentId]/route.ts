import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  canUseMetaIntegration,
} from '@/lib/metaAccess';

import {
  prisma,
} from '@/lib/prisma';

import {
  hasPermission,
} from '@/lib/userAccess';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


async function authorizedUser() {
  const user =
    await getCurrentUser();

  if (
    !user ||
    user.status !== 'APROVADO' ||
    !user.agencyId ||
    !hasPermission(
      user,
      'social.manage'
    ) ||
    !canUseMetaIntegration(
      user
    )
  ) {
    return null;
  }

  return user;
}


function resolveMedia(content: {
  format: string | null;
  finalMediaUrl: string | null;
  finalMediaType: string | null;
  finalCoverUrl: string | null;
  storyMediaUrl: string | null;
  storyMediaType: string | null;
  storyCoverUrl: string | null;
  instagramStoryPublication: {
    mediaUrl: string | null;
    mediaType: string | null;
    coverUrl: string | null;
  } | null;
}) {
  const storyOnly =
    String(content.format || '')
      .toUpperCase()
      .includes('STORY');

  const dedicated =
    content.storyMediaUrl || '';

  const saved =
    content.instagramStoryPublication?.mediaUrl || '';

  const fallback =
    storyOnly
      ? content.finalMediaUrl || ''
      : '';

  const url =
    dedicated ||
    saved ||
    fallback;

  const type =
    dedicated
      ? content.storyMediaType || ''
      : saved
        ? content.instagramStoryPublication?.mediaType || ''
        : content.finalMediaType || '';

  const cover =
    dedicated
      ? content.storyCoverUrl || dedicated
      : saved
        ? content.instagramStoryPublication?.coverUrl || saved
        : content.finalCoverUrl || fallback;

  return {
    url,
    type,
    cover,
  };
}


export async function POST(
  request:
    NextRequest,

  context: {
    params:
      Promise<{
        contentId:
          string;
      }>;
  }
) {
  const user =
    await authorizedUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Voce nao tem permissao para agendar Stories.',
      },
      {
        status: 403,
      }
    );
  }

  const {
    contentId,
  } =
    await context.params;

  const body =
    await request.json();

  const raw =
    String(
      body?.scheduledFor || ''
    );

  const scheduledFor =
    new Date(raw);

  if (
    !raw ||
    Number.isNaN(
      scheduledFor.getTime()
    ) ||
    scheduledFor.getTime() <=
      Date.now() + 30000
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Escolha uma data e horario futuros.',
      },
      {
        status: 400,
      }
    );
  }

  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            user.agencyId!,
        },

        status: {
          in: [
            'PRONTO_PARA_POSTAR',
            'PUBLICADO',
            'PUBLICADO_MANUALMENTE',
          ],
        },
      },

      include: {
        client: {
          include: {
            instagramConnection:
              true,
          },
        },

        instagramStoryPublication:
          true,
      },
    });

  if (!content) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Conteudo nao encontrado.',
      },
      {
        status: 404,
      }
    );
  }

  const connection =
    content.client.instagramConnection;

  if (!connection) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Instagram do cliente nao conectado.',
      },
      {
        status: 400,
      }
    );
  }

  const source =
    resolveMedia(content);

  if (
    !source.url ||
    !(
      source.type.startsWith('image/') ||
      source.type.startsWith('video/')
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Material de Story nao encontrado.',
      },
      {
        status: 400,
      }
    );
  }

  await prisma.instagramStoryPublication.upsert({
    where: {
      contentId:
        content.id,
    },

    create: {
      contentId:
        content.id,

      instagramUserId:
        connection.instagramUserId,

      instagramUsername:
        connection.username,

      mediaUrl:
        source.url,

      coverUrl:
        source.cover || null,

      mediaType:
        source.type,

      status:
        'AGENDADO',

      scheduledFor,
    },

    update: {
      instagramUserId:
        connection.instagramUserId,

      instagramUsername:
        connection.username,

      mediaUrl:
        source.url,

      coverUrl:
        source.cover || null,

      mediaType:
        source.type,

      status:
        'AGENDADO',

      scheduledFor,

      lastError:
        null,
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType:
        'CONTENT',

      entityId:
        content.id,

      action:
        'INSTAGRAM_STORY_SCHEDULED',

      description:
        `Story agendado para ${scheduledFor.toLocaleString(
          'pt-BR',
          {
            timeZone:
              'America/Maceio',
          }
        )}.`,

      authorName:
        user.name ||
        user.email ||
        'Equipe Level UP',
    },
  });

  return NextResponse.json({
    ok: true,
    message:
      'Story agendado com sucesso.',
    scheduledFor:
      scheduledFor.toISOString(),
  });
}


export async function DELETE(
  _request:
    NextRequest,

  context: {
    params:
      Promise<{
        contentId:
          string;
      }>;
  }
) {
  const user =
    await authorizedUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Voce nao tem permissao para cancelar este agendamento.',
      },
      {
        status: 403,
      }
    );
  }

  const {
    contentId,
  } =
    await context.params;

  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            user.agencyId!,
        },
      },

      select: {
        id: true,
      },
    });

  if (!content) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Conteudo nao encontrado.',
      },
      {
        status: 404,
      }
    );
  }

  const publication =
    await prisma.instagramStoryPublication.findUnique({
      where: {
        contentId,
      },
    });

  if (
    !publication ||
    publication.status !==
      'AGENDADO'
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Este Story nao possui agendamento ativo.',
      },
      {
        status: 409,
      }
    );
  }

  await prisma.instagramStoryPublication.update({
    where: {
      contentId,
    },

    data: {
      status:
        'PRONTO',

      scheduledFor:
        null,

      lastError:
        null,
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType:
        'CONTENT',

      entityId:
        contentId,

      action:
        'INSTAGRAM_STORY_SCHEDULE_CANCELLED',

      description:
        'Agendamento do Story cancelado.',

      authorName:
        user.name ||
        user.email ||
        'Equipe Level UP',
    },
  });

  return NextResponse.json({
    ok: true,
    message:
      'Agendamento cancelado.',
  });
}
