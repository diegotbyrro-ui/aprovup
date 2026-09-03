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


function permissionForArea(
  area: string
): PermissionKey {
  if (
    area === 'FILMMAKER'
  ) {
    return 'filmmaker.manage';
  }


  if (
    area === 'DESIGN'
  ) {
    return 'design.manage';
  }


  return 'social.manage';
}


function validObjectPath(
  contentId: string,
  kind: 'final' | 'cover',
  value: unknown
) {
  if (
    typeof value !==
    'string'
  ) {
    return false;
  }


  const expectedPrefix =
    kind === 'final'
      ? `final-content/material-final-${contentId}-`
      : `final-content/capa-${contentId}-`;


  return value.startsWith(
    expectedPrefix
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
          message: 'Sessão expirada. Entre novamente.',
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
          message: 'Usuário sem acesso ao AprovUp.',
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
          message: 'Conteúdo não encontrado.',
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
          message: 'Você não tem permissão para enviar este material.',
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
        body.kind === 'cover'
          ? 'cover'
          : body.kind === 'final'
            ? 'final'
            : null;


      if (!kind) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Tipo de upload inválido.',
          },
          {
            status: 400,
          }
        );
      }


      const fileName =
        typeof body.fileName === 'string'
          ? body.fileName
          : 'arquivo.bin';


      const prefix =
        kind === 'final'
          ? `material-final-${id}`
          : `capa-${id}`;


      const prepared =
        await createAprovUpSignedUpload({
          folder:
            'final-content',

          prefix,

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


      if (
        !finalPath &&
        !coverPath
      ) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Nenhum arquivo foi enviado.',
          },
          {
            status: 400,
          }
        );
      }


      if (
        finalPath &&
        !validObjectPath(
          id,
          'final',
          finalPath
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Caminho do material final inválido.',
          },
          {
            status: 400,
          }
        );
      }


      if (
        coverPath &&
        !validObjectPath(
          id,
          'cover',
          coverPath
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Caminho da capa inválido.',
          },
          {
            status: 400,
          }
        );
      }


      if (finalPath) {
        const exists =
          await aprovUpFileExists(
            finalPath
          );


        if (!exists) {
          return NextResponse.json(
            {
              ok: false,
              message: 'O material final ainda não chegou ao Storage.',
            },
            {
              status: 400,
            }
          );
        }
      }


      if (coverPath) {
        const exists =
          await aprovUpFileExists(
            coverPath
          );


        if (!exists) {
          return NextResponse.json(
            {
              ok: false,
              message: 'A capa ainda não chegou ao Storage.',
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


      const reviewStatus =
        content.area ===
        'FILMMAKER'
          ? 'FILMMAKER_ANALISE'
          : content.area ===
              'DESIGN'
            ? 'DESIGN_ANALISE'
            : 'REVISAO_INTERNA';


      const updateData: any = {
        status:
          reviewStatus,

        finalUploadedAt:
          new Date(),
      };


      if (finalMediaUrl) {
        updateData.finalMediaUrl =
          finalMediaUrl;

        updateData.finalMediaType =
          typeof body.finalMediaType ===
          'string'
            ? body.finalMediaType
            : '';


        if (
          String(
            body.finalMediaType ||
            ''
          ).startsWith(
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
            'Material final enviado para conferência interna antes da 2ª Etapa de Aprovação.',
        },
      }).catch(
        () => null
      );


      return NextResponse.json({
        ok: true,

        finalMediaUrl,

        coverUrl,
      });
    }


    return NextResponse.json(
      {
        ok: false,
        message: 'Ação de upload inválida.',
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
        message: 'Erro ao enviar arquivo.',
      },
      {
        status: 500,
      }
    );
  }
}