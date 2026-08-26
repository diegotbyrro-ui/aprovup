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

import {
  uploadAprovUpFile,
} from '@/lib/aprovupStorage';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


function isCarouselFormat(
  value:
    string | null
) {

  const format =
    String(
      value ||
      ''
    )
      .trim()
      .toUpperCase();


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


function canEditCarousel(
  status:
    string
) {

  return [
    'APROVADO',
    'DESIGN',
    'DESIGN_FAZENDO',
    'DESIGN_DUVIDA',
    'ALTERACAO_SOLICITADA',
  ].includes(
    status
  );
}


async function getUser() {

  const user =
    await getCurrentUser();


  if (
    !user ||
    user.status !==
      'APROVADO'
  ) {
    return null;
  }


  return user;
}


async function loadContent(
  contentId:
    string
) {

  return prisma.content.findUnique({

    where: {
      id:
        contentId,
    },

    include: {

      instagramMediaAssets: {

        orderBy: {
          position:
            'asc',
        },

      },

    },

  });
}


function userCanManage(
  user:
    any
) {

  return (
    hasPermission(
      user,
      'design.manage'
    ) ||
    hasPermission(
      user,
      'social.manage'
    )
  );
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
    await getUser();


  if (
    !user ||
    !userCanManage(
      user
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Você não tem permissão para editar este carrossel.',
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


  const content =
    await loadContent(
      contentId
    );


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
    content.area !==
      'DESIGN' &&
    content.area !==
      'SOCIAL_DESIGN'
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este conteúdo não pertence ao Design.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    !isCarouselFormat(
      content.format
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este conteúdo não está configurado como carrossel.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    !canEditCarousel(
      content.status
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este carrossel já foi enviado para aprovação e está bloqueado para edição.',
      },
      {
        status:
          409,
      }
    );

  }


  const formData =
    await request.formData();


  const files =
    formData
      .getAll(
        'files'
      )
      .filter(
        (
          value
        ): value is File =>
          value instanceof File
      );


  if (
    files.length ===
    0
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Selecione pelo menos uma imagem.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    content
      .instagramMediaAssets
      .length +
      files.length >
    10
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'O carrossel aceita no máximo 10 páginas.',
      },
      {
        status:
          400,
      }
    );

  }


  for (
    const file
    of files
  ) {

    if (
      ![
        'image/jpeg',
        'image/png',
      ].includes(
        file.type
      )
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Use imagens JPG ou PNG.',
        },
        {
          status:
            400,
        }
      );

    }


    if (
      file.size >
      8 * 1024 * 1024
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Cada página deve possuir no máximo 8 MB.',
        },
        {
          status:
            400,
        }
      );

    }

  }


  let position =
    content
      .instagramMediaAssets
      .length;


  for (
    const file
    of files
  ) {

    const url =
      await uploadAprovUpFile(
        file,
        'instagram-carousel',
        `content-${contentId}-pagina-${position + 1}`
      );


    await prisma
      .instagramMediaAsset
      .create({

        data: {

          contentId,

          url,

          mimeType:
            file.type,

          position,

        },

      });


    position++;

  }


  const assets =
    await prisma
      .instagramMediaAsset
      .findMany({

        where: {
          contentId,
        },

        orderBy: {
          position:
            'asc',
        },

      });


  /*
    A primeira pagina ja vira a capa visual
    do card do Design.
  */

  if (
    assets[0]?.url
  ) {

    await prisma
      .content
      .update({

        where: {
          id:
            contentId,
        },

        data: {
          finalCoverUrl:
            assets[0].url,
        },

      });

  }


  return NextResponse.json({

    ok:
      true,

    assets,

  });
}


export async function DELETE(
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
    await getUser();


  if (
    !user ||
    !userCanManage(
      user
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Sem permissão.',
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


  const content =
    await loadContent(
      contentId
    );


  if (
    !content ||
    !canEditCarousel(
      content.status
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este carrossel não pode mais ser alterado.',
      },
      {
        status:
          409,
      }
    );

  }


  const body =
    await request.json();


  const assetId =
    String(
      body?.assetId ||
      ''
    );


  const asset =
    await prisma
      .instagramMediaAsset
      .findFirst({

        where: {

          id:
            assetId,

          contentId,

        },

      });


  if (
    !asset
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Página não encontrada.',
      },
      {
        status:
          404,
      }
    );

  }


  await prisma
    .instagramMediaAsset
    .delete({

      where: {
        id:
          asset.id,
      },

    });


  const remaining =
    await prisma
      .instagramMediaAsset
      .findMany({

        where: {
          contentId,
        },

        orderBy: {
          position:
            'asc',
        },

      });


  /*
    Reorganizar a ordem após remoção.
  */

  for (
    let index = 0;
    index <
    remaining.length;
    index++
  ) {

    if (
      remaining[index]
        .position !==
      index
    ) {

      await prisma
        .instagramMediaAsset
        .update({

          where: {
            id:
              remaining[index].id,
          },

          data: {
            position:
              index,
          },

        });

    }

  }


  const first =
    remaining[0];


  await prisma
    .content
    .update({

      where: {
        id:
          contentId,
      },

      data: {
        finalCoverUrl:
          first?.url ||
          null,
      },

    });


  return NextResponse.json({

    ok:
      true,

  });
}


/*
  Finaliza o trabalho do Design.
  A partir daqui o carrossel segue para
  a análise interna exatamente como a arte única.
*/

export async function PATCH(
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
    await getUser();


  if (
    !user ||
    !userCanManage(
      user
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Você não tem permissão para enviar este carrossel.',
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


  const content =
    await loadContent(
      contentId
    );

  let action =
    'review';


  try {

    if (
      request.headers
        .get(
          'content-type'
        )
        ?.includes(
          'application/json'
        )
    ) {

      const body =
        await request.json();

      action =
        String(
          body?.action ||
          'review'
        );

    }

  }
  catch {
    action =
      'review';
  }


  if (
    action ===
      'reopen'
  ) {

    if (
      content?.status !==
      'DESIGN_ANALISE'
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Somente um carrossel em análise interna pode ser reaberto.',
        },
        {
          status:
            409,
        }
      );

    }


    const author =
      user.name ||
      user.email ||
      'Equipe de Design';


    await prisma.$transaction([

      prisma.content.update({

        where: {
          id:
            contentId,
        },

        data: {
          status:
            'DESIGN_FAZENDO',
        },

      }),


      prisma.historyLog.create({

        data: {

          entityType:
            'CONTENT',

          entityId:
            contentId,

          action:
            'CAROUSEL_REOPENED',

          description:
            'Carrossel reaberto para edição pelo Design.',

          authorName:
            author,

        },

      }),

    ]);


    return NextResponse.json({

      ok:
        true,

      status:
        'DESIGN_FAZENDO',

    });

  }



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
    !isCarouselFormat(
      content.format
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este conteúdo não é um carrossel.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    !canEditCarousel(
      content.status
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este carrossel já foi encaminhado.',
      },
      {
        status:
          409,
      }
    );

  }


  const assets =
    content
      .instagramMediaAssets;


  if (
    assets.length <
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


  const firstPage =
    assets[0].url;


  const author =
    user.name ||
    user.email ||
    'Equipe de Design';


  await prisma.$transaction([

    prisma.content.update({

      where: {
        id:
          contentId,
      },

      data: {

        status:
          'DESIGN_ANALISE',

        finalMediaUrl:
          firstPage,

        finalCoverUrl:
          firstPage,

        finalMediaType:
          'carousel/image',

        finalUploadedAt:
          new Date(),

      },

    }),


    prisma.comment.create({

      data: {

        contentId,

        authorName:
          author,

        authorRole:
          user.role ||
          'DESIGN',

        message:
          `Carrossel com ${assets.length} páginas enviado pelo Design para análise interna.`,

      },

    }),


    prisma.historyLog.create({

      data: {

        entityType:
          'CONTENT',

        entityId:
          contentId,

        action:
          'CAROUSEL_SENT_TO_REVIEW',

        description:
          `Carrossel com ${assets.length} páginas enviado para análise interna.`,

        authorName:
          author,

      },

    }),

  ]);


  return NextResponse.json({

    ok:
      true,

    status:
      'DESIGN_ANALISE',

    pages:
      assets.length,

  });
}



export async function PUT(
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
    await getUser();


  if (
    !user ||
    !userCanManage(
      user
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Você não tem permissão para ordenar este carrossel.',
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


  const content =
    await loadContent(
      contentId
    );


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
    !canEditCarousel(
      content.status
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Reabra a edição antes de alterar a ordem.',
      },
      {
        status:
          409,
      }
    );

  }


  const body =
    await request.json();


  const orderedIds =
    Array.isArray(
      body?.orderedIds
    )
      ? body.orderedIds.map(
          (
            value:
              unknown
          ) =>
            String(
              value
            )
        )
      : [];


  const currentIds =
    content
      .instagramMediaAssets
      .map(
        (
          asset
        ) =>
          asset.id
      );


  if (
    orderedIds.length !==
      currentIds.length ||
    new Set(
      orderedIds
    ).size !==
      currentIds.length ||
    !currentIds.every(
      (
        id
      ) =>
        orderedIds.includes(
          id
        )
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'A nova ordem do carrossel é inválida.',
      },
      {
        status:
          400,
      }
    );

  }


  await prisma.$transaction(
    async (
      transaction
    ) => {

      /*
        Primeiro afastamos todas as posições
        para evitar colisão com @@unique.
      */

      await transaction
        .instagramMediaAsset
        .updateMany({

          where: {
            contentId,
          },

          data: {
            position: {
              increment:
                1000,
            },
          },

        });


      for (
        let index = 0;
        index <
        orderedIds.length;
        index++
      ) {

        await transaction
          .instagramMediaAsset
          .update({

            where: {
              id:
                orderedIds[index],
            },

            data: {
              position:
                index,
            },

          });

      }


      const firstAsset =
        content
          .instagramMediaAssets
          .find(
            (
              asset
            ) =>
              asset.id ===
              orderedIds[0]
          );


      if (
        firstAsset
      ) {

        await transaction
          .content
          .update({

            where: {
              id:
                contentId,
            },

            data: {

              finalCoverUrl:
                firstAsset.url,

              finalMediaUrl:
                firstAsset.url,

            },

          });

      }

    }
  );


  return NextResponse.json({

    ok:
      true,

  });

}
