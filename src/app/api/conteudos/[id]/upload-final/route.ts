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
  type PermissionKey,
} from '@/lib/userAccess';

import {
  aprovUpFileExists,
  createAprovUpSignedUpload,
  deleteAprovUpPublicFile,
  getAprovUpPublicUrl,
} from '@/lib/aprovupStorage';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


type UploadKind =
  | 'final'
  | 'cover'
  | 'story'
  | 'storyCover';


type DeleteKind =
  | UploadKind
  | 'external';


const uploadPrefixes:
  Record<
    UploadKind,
    string
  > = {
    final:
      'material-final',

    cover:
      'capa',

    story:
      'story-final',

    storyCover:
      'story-capa',
  };


function permissionForArea(
  area: string
): PermissionKey {
  if (
    area ===
    'FILMMAKER'
  ) {
    return 'filmmaker.manage';
  }


  if (
    area ===
    'DESIGN'
  ) {
    return 'design.manage';
  }


  return 'social.manage';
}


function parseUploadKind(
  value: unknown
): UploadKind | null {
  if (
    value === 'final' ||
    value === 'cover' ||
    value === 'story' ||
    value === 'storyCover'
  ) {
    return value;
  }


  return null;
}


function parseDeleteKind(
  value: unknown
): DeleteKind | null {
  if (
    value ===
    'external'
  ) {
    return 'external';
  }

  return parseUploadKind(
    value
  );
}


function parseExternalUrl(
  value: unknown
) {
  const raw =
    typeof value ===
    'string'
      ? value.trim()
      : '';

  if (!raw) {
    return {
      ok: true,
      url: '',
      message: '',
    };
  }

  if (
    raw.length >
    2048
  ) {
    return {
      ok: false,
      url: '',
      message:
        'O link externo é muito longo.',
    };
  }

  try {
    const parsed =
      new URL(
        raw
      );

    if (
      parsed.protocol !==
      'https:'
    ) {
      return {
        ok: false,
        url: '',
        message:
          'Informe um link HTTPS válido.',
      };
    }

    return {
      ok: true,
      url:
        parsed.toString(),
      message: '',
    };
  }
  catch {
    return {
      ok: false,
      url: '',
      message:
        'Informe um link válido do Google Drive ou de outro serviço de arquivos.',
    };
  }
}


function validObjectPath(
  contentId: string,
  kind: UploadKind,
  value: unknown
) {
  if (
    typeof value !==
    'string'
  ) {
    return false;
  }


  const expectedPrefix =
    `final-content/${uploadPrefixes[kind]}-${contentId}-`;


  return value.startsWith(
    expectedPrefix
  );
}


async function storagePathExists(
  path: string
) {
  if (!path) {
    return true;
  }


  return aprovUpFileExists(
    path
  );
}


export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const {
      id,
    } =
      await context.params;


    const currentUser =
      await getCurrentUser();


    if (!currentUser) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Sessão expirada. Entre novamente.',
        },
        {
          status: 401,
        }
      );
    }


    if (
      currentUser.status !==
        'APROVADO' ||
      !currentUser.agencyId
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Usuário sem acesso ao AprovUp.',
        },
        {
          status: 403,
        }
      );
    }


    const content =
      await prisma.content.findFirst({
        where: {
          id,

          client: {
            agencyId:
              currentUser.agencyId,
          },
        },
      });


    if (!content) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Conteúdo não encontrado.',
        },
        {
          status: 404,
        }
      );
    }


    const requiredPermission =
      permissionForArea(
        content.area
      );


    if (
      !hasPermission(
        currentUser,
        requiredPermission
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Você não tem permissão para enviar este material.',
        },
        {
          status: 403,
        }
      );
    }


    const body =
      await request.json();


    if (
      body?.action ===
      'prepare'
    ) {
      const kind =
        parseUploadKind(
          body.kind
        );


      if (!kind) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Tipo de upload inválido.',
          },
          {
            status: 400,
          }
        );
      }


      const fileName =
        typeof body.fileName ===
        'string'
          ? body.fileName
          : 'arquivo.bin';


      const prepared =
        await createAprovUpSignedUpload({
          folder:
            'final-content',

          prefix:
            `${uploadPrefixes[kind]}-${id}`,

          fileName,
        });


      return NextResponse.json({
        ok: true,

        bucket:
          'aprovup-files',

        path:
          prepared.path,

        token:
          prepared.token,

        endpoint:
          prepared.endpoint,
      });
    }


    if (
      body?.action ===
      'complete'
    ) {
      const finalPath =
        typeof body.finalPath ===
        'string'
          ? body.finalPath
          : '';


      const coverPath =
        typeof body.coverPath ===
        'string'
          ? body.coverPath
          : '';


      const storyPath =
        typeof body.storyPath ===
        'string'
          ? body.storyPath
          : '';


      const storyCoverPath =
        typeof body.storyCoverPath ===
        'string'
          ? body.storyCoverPath
          : '';


      const externalResult =
        parseExternalUrl(
          body.externalUrl
        );


      if (
        !externalResult.ok
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              externalResult.message,
          },
          {
            status: 400,
          }
        );
      }


      const finalExternalUrl =
        externalResult.url;


      if (
        !finalPath &&
        !coverPath &&
        !storyPath &&
        !storyCoverPath &&
        !finalExternalUrl
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Nenhum arquivo ou link externo foi enviado.',
          },
          {
            status: 400,
          }
        );
      }


      const pathsToValidate: Array<{
        path: string;
        kind: UploadKind;
        label: string;
      }> = [
        {
          path:
            finalPath,
          kind:
            'final',
          label:
            'material final do feed',
        },
        {
          path:
            coverPath,
          kind:
            'cover',
          label:
            'thumbnail do feed',
        },
        {
          path:
            storyPath,
          kind:
            'story',
          label:
            'material final dos Stories',
        },
        {
          path:
            storyCoverPath,
          kind:
            'storyCover',
          label:
            'thumbnail dos Stories',
        },
      ];


      for (
        const item
        of pathsToValidate
      ) {
        if (!item.path) {
          continue;
        }


        if (
          !validObjectPath(
            id,
            item.kind,
            item.path
          )
        ) {
          return NextResponse.json(
            {
              ok: false,
              message:
                `Caminho inválido para ${item.label}.`,
            },
            {
              status: 400,
            }
          );
        }


        const exists =
          await storagePathExists(
            item.path
          );


        if (!exists) {
          return NextResponse.json(
            {
              ok: false,
              message:
                `O arquivo de ${item.label} ainda não chegou ao Storage.`,
            },
            {
              status: 400,
            }
          );
        }
      }


      const finalMediaUrl =
        finalPath
          ? getAprovUpPublicUrl(
              finalPath
            )
          : '';


      const coverUrl =
        coverPath
          ? getAprovUpPublicUrl(
              coverPath
            )
          : '';


      const storyMediaUrl =
        storyPath
          ? getAprovUpPublicUrl(
              storyPath
            )
          : '';


      const storyCoverUrl =
        storyCoverPath
          ? getAprovUpPublicUrl(
              storyCoverPath
            )
          : '';


      const reviewStatus =
        content.area ===
        'FILMMAKER'
          ? 'FILMMAKER_ANALISE'
          : content.area ===
              'DESIGN'
            ? 'DESIGN_ANALISE'
            : 'REVISAO_INTERNA';


      const updateData:
        Record<
          string,
          unknown
        > = {
          status:
            reviewStatus,

          finalUploadedAt:
            new Date(),
        };


      if (finalMediaUrl) {
        const finalMediaType =
          typeof body.finalMediaType ===
          'string'
            ? body.finalMediaType
            : '';


        updateData.finalMediaUrl =
          finalMediaUrl;

        updateData.finalMediaType =
          finalMediaType;


        if (
          finalMediaType.startsWith(
            'image/'
          ) &&
          !coverUrl
        ) {
          updateData.finalCoverUrl =
            finalMediaUrl;
        }
      }


      if (coverUrl) {
        updateData.finalCoverUrl =
          coverUrl;
      }


      if (storyMediaUrl) {
        const storyMediaType =
          typeof body.storyMediaType ===
          'string'
            ? body.storyMediaType
            : '';


        updateData.storyMediaUrl =
          storyMediaUrl;

        updateData.storyMediaType =
          storyMediaType;


        if (
          storyMediaType.startsWith(
            'image/'
          ) &&
          !storyCoverUrl
        ) {
          updateData.storyCoverUrl =
            storyMediaUrl;
        }
      }


      if (storyCoverUrl) {
        updateData.storyCoverUrl =
          storyCoverUrl;
      }


      if (finalExternalUrl) {
        updateData.finalExternalUrl =
          finalExternalUrl;
      }


      await prisma.content.update({
        where: {
          id,
        },

        data:
          updateData,
      });


      await prisma.comment.create({
        data: {
          contentId:
            id,

          authorName:
            currentUser.name ||
            currentUser.email ||
            'Equipe Level UP',

          authorRole:
            currentUser.role ||
            'EQUIPE',

          message:
            'Materiais finais enviados para conferência interna antes da 2ª Etapa de Aprovação.',
        },
      }).catch(
        () => null
      );


      return NextResponse.json({
        ok: true,

        finalMediaUrl,

        finalExternalUrl,

        coverUrl,

        storyMediaUrl,

        storyCoverUrl,
      });
    }


    return NextResponse.json(
      {
        ok: false,
        message:
          'Ação de upload inválida.',
      },
      {
        status: 400,
      }
    );
  }
  catch (error) {
    console.error(
      'AprovUp upload-final:',
      error
    );


    return NextResponse.json(
      {
        ok: false,
        message:
          'Erro ao enviar arquivo.',
      },
      {
        status: 500,
      }
    );
  }
}


export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const {
      id,
    } =
      await context.params;


    const currentUser =
      await getCurrentUser();


    if (!currentUser) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Sessão expirada. Entre novamente.',
        },
        {
          status: 401,
        }
      );
    }


    if (
      currentUser.status !==
        'APROVADO' ||
      !currentUser.agencyId
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Usuário sem acesso ao AprovUp.',
        },
        {
          status: 403,
        }
      );
    }


    const content =
      await prisma.content.findFirst({
        where: {
          id,

          client: {
            agencyId:
              currentUser.agencyId,
          },
        },

        include: {
          instagramPublication:
            true,

          instagramMediaAssets:
            true,
        },
      });


    if (!content) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Conteúdo não encontrado.',
        },
        {
          status: 404,
        }
      );
    }


    const requiredPermission =
      permissionForArea(
        content.area
      );


    if (
      !hasPermission(
        currentUser,
        requiredPermission
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Você não tem permissão para excluir este material.',
        },
        {
          status: 403,
        }
      );
    }


    if (
      [
        'PUBLICADO',
        'PUBLICADO_MANUALMENTE',
      ].includes(
        String(
          content.status ||
          ''
        )
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Este conteúdo já foi publicado e o material final não pode ser excluído por esta tela.',
        },
        {
          status: 409,
        }
      );
    }


    if (
      [
        'AGENDADO',
        'PUBLICANDO',
        'PUBLICADO',
      ].includes(
        String(
          content.instagramPublication?.status ||
          ''
        )
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Existe uma publicação do Instagram agendada ou em andamento. Cancele essa publicação antes de excluir o material.',
        },
        {
          status: 409,
        }
      );
    }


    const body =
      await request.json();


    const kind =
      parseDeleteKind(
        body?.kind
      );


    if (!kind) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Tipo de arquivo inválido.',
        },
        {
          status: 400,
        }
      );
    }


    let nextFinalMediaUrl =
      content.finalMediaUrl;

    let nextFinalCoverUrl =
      content.finalCoverUrl;

    let nextStoryMediaUrl =
      content.storyMediaUrl;

    let nextStoryCoverUrl =
      content.storyCoverUrl;

    let removedUrl =
      '';

    const updateData:
      Record<
        string,
        unknown
      > = {};


    if (
      kind ===
      'final'
    ) {
      removedUrl =
        content.finalMediaUrl ||
        '';

      nextFinalMediaUrl =
        null;

      updateData.finalMediaUrl =
        null;

      updateData.finalMediaType =
        null;


      if (
        content.finalCoverUrl &&
        content.finalCoverUrl ===
          content.finalMediaUrl
      ) {
        nextFinalCoverUrl =
          null;

        updateData.finalCoverUrl =
          null;
      }


      if (
        !content.finalExternalUrl
      ) {
        if (
          content.area ===
          'FILMMAKER'
        ) {
          updateData.status =
            'FILMMAKER_EDICAO';
        }
        else if (
          content.area ===
            'DESIGN' ||
          content.area ===
            'SOCIAL_DESIGN'
        ) {
          updateData.status =
            'DESIGN_FAZENDO';
        }
      }
    }


    if (
      kind ===
      'cover'
    ) {
      removedUrl =
        content.finalCoverUrl ||
        '';

      nextFinalCoverUrl =
        null;

      updateData.finalCoverUrl =
        null;
    }


    if (
      kind ===
      'story'
    ) {
      removedUrl =
        content.storyMediaUrl ||
        '';

      nextStoryMediaUrl =
        null;

      updateData.storyMediaUrl =
        null;

      updateData.storyMediaType =
        null;


      if (
        content.storyCoverUrl &&
        content.storyCoverUrl ===
          content.storyMediaUrl
      ) {
        nextStoryCoverUrl =
          null;

        updateData.storyCoverUrl =
          null;
      }
    }


    if (
      kind ===
      'storyCover'
    ) {
      removedUrl =
        content.storyCoverUrl ||
        '';

      nextStoryCoverUrl =
        null;

      updateData.storyCoverUrl =
        null;
    }


    if (
      kind ===
      'external'
    ) {
      updateData.finalExternalUrl =
        null;

      if (
        !content.finalMediaUrl
      ) {
        if (
          content.area ===
          'FILMMAKER'
        ) {
          updateData.status =
            'FILMMAKER_EDICAO';
        }
        else if (
          content.area ===
            'DESIGN' ||
          content.area ===
            'SOCIAL_DESIGN'
        ) {
          updateData.status =
            'DESIGN_FAZENDO';
        }
      }
    }


    await prisma.content.update({
      where: {
        id,
      },

      data:
        updateData,
    });


    const remainingReferences =
      [
        nextFinalMediaUrl,
        nextFinalCoverUrl,
        nextStoryMediaUrl,
        nextStoryCoverUrl,

        content.instagramPublication
          ?.mediaUrl,

        content.instagramPublication
          ?.coverUrl,

        ...content.instagramMediaAssets.map(
          (
            asset
          ) =>
            asset.url
        ),
      ]
        .filter(
          Boolean
        )
        .map(
          (
            value
          ) =>
            String(
              value
            )
        );


    if (
      removedUrl &&
      !remainingReferences.includes(
        removedUrl
      )
    ) {
      await deleteAprovUpPublicFile(
        removedUrl
      ).catch(
        (
          error
        ) => {
          console.error(
            'AprovUp remove arquivo final:',
            error
          );
        }
      );
    }


    const successMessages:
      Record<
        DeleteKind,
        string
      > = {
        final:
          'Arquivo final removido com sucesso.',

        cover:
          'Thumbnail removida com sucesso.',

        story:
          'Arquivo dos Stories removido com sucesso.',

        storyCover:
          'Thumbnail dos Stories removida com sucesso.',

        external:
          'Link externo removido com sucesso.',
      };


    await prisma.comment.create({
      data: {
        contentId:
          id,

        authorName:
          currentUser.name ||
          currentUser.email ||
          'Equipe AprovUp',

        authorRole:
          currentUser.role ||
          'EQUIPE',

        message:
          successMessages[
            kind
          ],
      },
    }).catch(
      () => null
    );


    return NextResponse.json({
      ok: true,

      message:
        successMessages[
          kind
        ],
    });
  }
  catch (error) {
    console.error(
      'AprovUp delete upload-final:',
      error
    );


    return NextResponse.json(
      {
        ok: false,
        message:
          'Erro ao excluir arquivo.',
      },
      {
        status: 500,
      }
    );
  }
}
