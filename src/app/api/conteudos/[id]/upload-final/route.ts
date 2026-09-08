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


      if (
        !finalPath &&
        !coverPath &&
        !storyPath &&
        !storyCoverPath
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Nenhum arquivo foi enviado.',
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