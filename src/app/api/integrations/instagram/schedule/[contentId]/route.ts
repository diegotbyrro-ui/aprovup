import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

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


function normalizedFormat(
  value:
    string | null
) {

  return String(
    value ||
    ''
  )
    .trim()
    .toUpperCase();

}


function isCarouselFormat(
  value:
    string | null
) {

  const format =
    normalizedFormat(
      value
    );


  return (
    format.includes(
      'CARROSSEL'
    ) ||
    format.includes(
      'CAROUSEL'
    ) ||
    format.includes(
      'ALBUM'
    )
  );

}


function isReelFormat(
  value:
    string | null
) {

  const format =
    normalizedFormat(
      value
    );


  return (
    format.includes(
      'REEL'
    ) ||
    format ===
      'VIDEO' ||
    format ===
      'VÍDEO'
  );

}


function isStoryFormat(
  value:
    string | null
) {

  return normalizedFormat(
    value
  ).includes(
    'STORY'
  );

}


async function currentAuthorizedUser() {

  const user =
    await getCurrentUser();


  if (
    !user ||
    user.status !==
      'APROVADO' ||
    !user.agencyId ||
    !hasPermission(
      user,
      'social.manage'
    )
  ) {

    return null;

  }


  return user;

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
    await currentAuthorizedUser();


  if (
    !user
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Você não tem permissão para agendar publicações.',
      },
      {
        status:
          403,
      }
    );

  }


  const {
    contentId,
  } =
    await context.params;


  const body =
    await request.json();


  const scheduledValue =
    String(
      body?.scheduledFor ||
      ''
    );


  const scheduledFor =
    new Date(
      scheduledValue
    );


  if (
    !scheduledValue ||
    Number.isNaN(
      scheduledFor.getTime()
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Escolha uma data e horário válidos.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    scheduledFor.getTime() <=
    Date.now() +
      30 * 1000
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Escolha um horário futuro.',
      },
      {
        status:
          400,
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
      },

      include: {

        client: {

          include: {
            instagramConnection:
              true,
          },

        },

        instagramPublication:
          true,

        instagramMediaAssets: {

          orderBy: {
            position:
              'asc',
          },

        },

      },

    });


  if (
    !content
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Conteúdo não encontrado.',
      },
      {
        status:
          404,
      }
    );

  }


  if (
    content.status !==
    'PRONTO_PARA_POSTAR'
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este conteúdo não está pronto para postar.',
      },
      {
        status:
          409,
      }
    );

  }


  if (
    !content.client
      .instagramConnection
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'O Instagram deste cliente não está conectado.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    content
      .instagramPublication
      ?.status ===
      'PUBLICADO'
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este conteúdo já foi publicado.',
      },
      {
        status:
          409,
      }
    );

  }


  const carousel =
    isCarouselFormat(
      content.format
    );


  const reel =
    isReelFormat(
      content.format
    );


  if (
    isStoryFormat(
      content.format
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Story ainda não está disponível para agendamento.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    carousel &&
    content
      .instagramMediaAssets
      .length <
      2
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'O carrossel precisa possuir pelo menos 2 páginas.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    reel &&
    (
      !content.finalMediaUrl ||
      !String(
        content.finalMediaType ||
        ''
      ).startsWith(
        'video/'
      )
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'O Reel precisa possuir um vídeo final.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    !carousel &&
    !reel &&
    (
      !content.finalMediaUrl ||
      !String(
        content.finalMediaType ||
        ''
      ).startsWith(
        'image/'
      )
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'O material final precisa ser uma imagem.',
      },
      {
        status:
          400,
      }
    );

  }


  const connection =
    content.client
      .instagramConnection;


  const caption =
    content.caption
      ?.trim() ||
    null;


  const mediaUrl =
    carousel
      ? content
          .instagramMediaAssets[0]
          ?.url ||
        null
      : content.finalMediaUrl;


  const mediaType =
    carousel
      ? 'carousel/image'
      : content.finalMediaType;


  await prisma
    .instagramPublication
    .upsert({

      where: {
        contentId:
          content.id,
      },

      create: {

        contentId:
          content.id,

        instagramUserId:
          connection
            .instagramUserId,

        instagramUsername:
          connection.username,

        caption,

        mediaUrl,

        coverUrl:
          content.finalCoverUrl,

        mediaType,

        status:
          'AGENDADO',

        scheduledFor,

        lastError:
          null,

      },

      update: {

        instagramUserId:
          connection
            .instagramUserId,

        instagramUsername:
          connection.username,

        caption,

        mediaUrl,

        coverUrl:
          content.finalCoverUrl,

        mediaType,

        status:
          'AGENDADO',

        scheduledFor,

        lastError:
          null,

      },

    });


  const authorName =
    user.name ||
    user.email ||
    'Equipe Level UP';


  await prisma.historyLog.create({

    data: {

      entityType:
        'CONTENT',

      entityId:
        content.id,

      action:
        'INSTAGRAM_SCHEDULED',

      description:
        `Publicação do Instagram agendada para ${scheduledFor.toLocaleString(
          'pt-BR',
          {
            timeZone:
              'America/Maceio',
          }
        )}.`,

      authorName,

    },

  });


  return NextResponse.json({

    ok:
      true,

    message:
      'Publicação agendada com sucesso.',

    scheduledFor:
      scheduledFor
        .toISOString(),

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
    await currentAuthorizedUser();


  if (
    !user
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Você não tem permissão para cancelar este agendamento.',
      },
      {
        status:
          403,
      }
    );

  }


  const {
    contentId,
  } =
    await context.params;


  const ownedContent =
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


  if (
    !ownedContent
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Conteúdo não encontrado.',
      },
      {
        status:
          404,
      }
    );

  }


  const publication =
    await prisma
      .instagramPublication
      .findUnique({

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
        ok:
          false,

        message:
          'Este conteúdo não possui agendamento ativo.',
      },
      {
        status:
          409,
      }
    );

  }


  await prisma
    .instagramPublication
    .update({

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
        'INSTAGRAM_SCHEDULE_CANCELLED',

      description:
        'Agendamento da publicação no Instagram cancelado.',

      authorName:
        user.name ||
        user.email ||
        'Equipe Level UP',

    },

  });


  return NextResponse.json({

    ok:
      true,

    message:
      'Agendamento cancelado.',

  });

}
