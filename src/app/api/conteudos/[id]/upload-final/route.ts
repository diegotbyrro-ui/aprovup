import {
  createHash,
} from 'node:crypto';

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
  canAccessClient,
} from '@/lib/clientAccess';

import {
  notifyEmergencyDemandReadyToSocialMedia,
} from '@/lib/secretaryWhatsApp';

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


    const body =
      await request.json();


    const isReadyVideoAction =
      body?.action ===
        'prepare-ready-video' ||
      body?.action ===
        'replace-ready-video';


    let canSocialReplaceReadyVideo =
      false;


    if (
      isReadyVideoAction &&
      content.status ===
        'PRONTO_PARA_POSTAR' &&
      String(
        content.finalMediaType ||
        ''
      ).startsWith(
        'video/'
      ) &&
      hasPermission(
        currentUser,
        'social.manage'
      )
    ) {
      const client =
        await prisma.client.findFirst({
          where: {
            id:
              content.clientId,

            agencyId:
              currentUser.agencyId,
          },
        });


      canSocialReplaceReadyVideo =
        Boolean(
          client &&
          canAccessClient(
            currentUser,
            client
          )
        );
    }


    const requiredPermission =
      permissionForArea(
        content.area
      );


    if (
      !canSocialReplaceReadyVideo &&
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


    if (
      body?.action ===
      'prepare-ready-video'
    ) {
      if (
        !canSocialReplaceReadyVideo
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Somente a Social Media responsável pode substituir este vídeo.',
          },
          {
            status:
              403,
          }
        );
      }


      const publication =
        await prisma
          .instagramPublication
          .findUnique({
            where: {
              contentId:
                id,
            },
          });


      if (
        publication &&
        [
          'AGENDADO',
          'PUBLICANDO',
          'PUBLICADO',
        ].includes(
          publication.status
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              publication.status ===
              'AGENDADO'
                ? 'Cancele o agendamento antes de substituir o vídeo.'
                : 'Não é possível substituir um vídeo que já está sendo publicado ou foi publicado.',
          },
          {
            status:
              409,
          }
        );
      }


      const fileName =
        typeof body.fileName ===
        'string'
          ? body.fileName
          : 'video.mp4';


      const contentType =
        typeof body.contentType ===
        'string'
          ? body.contentType
          : '';


      const fileSize =
        Number(
          body.fileSize ||
          0
        );


      const acceptedName =
        /\.(mp4|mov|m4v)$/i.test(
          fileName
        );


      if (
        !contentType.startsWith(
          'video/'
        ) &&
        !acceptedName
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Envie um vídeo MP4 ou MOV.',
          },
          {
            status:
              400,
          }
        );
      }


      if (
        fileSize <=
          0 ||
        fileSize >
          500 *
          1024 *
          1024
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'O vídeo deve possuir no máximo 500 MB.',
          },
          {
            status:
              400,
          }
        );
      }


      const prepared =
        await createAprovUpSignedUpload({
          folder:
            'final-content',

          prefix:
            `${uploadPrefixes.final}-${id}`,

          fileName,
        });


      return NextResponse.json({
        ok:
          true,

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
      'replace-ready-video'
    ) {
      if (
        !canSocialReplaceReadyVideo
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Somente a Social Media responsável pode substituir este vídeo.',
          },
          {
            status:
              403,
          }
        );
      }


      const finalPath =
        typeof body.finalPath ===
        'string'
          ? body.finalPath
          : '';


      const finalMediaType =
        typeof body.finalMediaType ===
        'string' &&
        body.finalMediaType.startsWith(
          'video/'
        )
          ? body.finalMediaType
          : 'video/mp4';


      if (
        !finalPath ||
        !validObjectPath(
          id,
          'final',
          finalPath
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Caminho do novo vídeo inválido.',
          },
          {
            status:
              400,
          }
        );
      }


      const exists =
        await storagePathExists(
          finalPath
        );


      if (!exists) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'O novo vídeo ainda não chegou ao Storage.',
          },
          {
            status:
              400,
          }
        );
      }


      const publication =
        await prisma
          .instagramPublication
          .findUnique({
            where: {
              contentId:
                id,
            },
          });


      if (
        publication &&
        [
          'AGENDADO',
          'PUBLICANDO',
          'PUBLICADO',
        ].includes(
          publication.status
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              publication.status ===
              'AGENDADO'
                ? 'Cancele o agendamento antes de substituir o vídeo.'
                : 'Não é possível substituir um vídeo que já está sendo publicado ou foi publicado.',
          },
          {
            status:
              409,
          }
        );
      }


      const previousVideoUrl =
        content.finalMediaUrl ||
        '';


      const newVideoUrl =
        getAprovUpPublicUrl(
          finalPath
        );


      await prisma.content.update({
        where: {
          id,
        },

        data: {
          finalMediaUrl:
            newVideoUrl,

          finalMediaType:
            finalMediaType,

          finalUploadedAt:
            new Date(),

          finalExternalUrl:
            null,

          status:
            'PRONTO_PARA_POSTAR',
        },
      });


      if (
        publication &&
        [
          'PRONTO',
          'ERRO',
        ].includes(
          publication.status
        )
      ) {
        await prisma
          .instagramPublication
          .update({
            where: {
              contentId:
                id,
            },

            data: {
              mediaUrl:
                newVideoUrl,

              mediaType:
                finalMediaType,

              status:
                'PRONTO',

              scheduledFor:
                null,

              lastError:
                null,
            },
          });
      }


      const authorName =
        currentUser.name ||
        currentUser.email ||
        'Social Media';


      await prisma.historyLog
        .create({
          data: {
            entityType:
              'CONTENT',

            entityId:
              id,

            action:
              'READY_VIDEO_REPLACED',

            description:
              'Social Media substituiu o vídeo final pela versão preparada para publicação.',

            authorName,
          },
        })
        .catch(
          () =>
            null
        );


      await prisma.comment
        .create({
          data: {
            contentId:
              id,

            authorName,

            authorRole:
              'SOCIAL_MEDIA',

            message:
              'Vídeo final substituído pela Social Media após finalização para publicação.',
          },
        })
        .catch(
          () =>
            null
        );


      if (
        previousVideoUrl &&
        previousVideoUrl !==
          newVideoUrl
      ) {
        await deleteAprovUpPublicFile(
          previousVideoUrl
        ).catch(
          (
            error
          ) => {
            console.error(
              'AprovUp old ready video delete:',
              error
            );
          }
        );
      }


      return NextResponse.json({
        ok:
          true,

        mediaUrl:
          newVideoUrl,

        message:
          'Vídeo final substituído com sucesso.',
      });
    }


    if (
      body?.action ===
      'social-ready'
    ) {
      if (
        content.area !==
        'SOCIAL_MEDIA' ||
        !hasPermission(
          currentUser,
          'social.manage'
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Somente a Social Media pode concluir esta entrega por este fluxo.',
          },
          {
            status:
              403,
          }
        );
      }


      const normalizedFormat =
        String(
          content.format ||
          ''
        )
          .trim()
          .toUpperCase();


      const isCarousel =
        normalizedFormat.includes(
          'CARROSSEL'
        ) ||
        normalizedFormat.includes(
          'CAROUSEL'
        ) ||
        normalizedFormat.includes(
          'ALBUM'
        );


      const carouselAssets =
        isCarousel
          ? await prisma
              .instagramMediaAsset
              .findMany({
                where: {
                  contentId:
                    id,
                },

                orderBy: {
                  position:
                    'asc',
                },
              })
          : [];


      const hasSingleMaterial =
        Boolean(
          content.finalMediaUrl ||
          content.finalCoverUrl ||
          content.finalExternalUrl
        );


      if (
        isCarousel &&
        carouselAssets.length <
          2
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Anexe pelo menos 2 páginas para concluir o carrossel.',
          },
          {
            status:
              422,
          }
        );
      }


      if (
        !isCarousel &&
        !hasSingleMaterial
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Anexe o material final antes de salvar.',
          },
          {
            status:
              422,
          }
        );
      }


      await prisma.content.update({
        where: {
          id,
        },

        data: {
          status:
            'PRONTO_PARA_POSTAR',

          finalUploadedAt:
            new Date(),

          ...(
            isCarousel &&
            carouselAssets[0]?.url
              ? {
                  finalCoverUrl:
                    carouselAssets[0].url,
                }
              : {}
          ),
        },
      });


      await prisma.historyLog
        .create({
          data: {
            entityType:
              'CONTENT',

            entityId:
              id,

            action:
              'READY_TO_POST',

            description:
              'Social Media salvou o material final. Conteúdo enviado diretamente para Pronto para Postar.',

            authorName:
              currentUser.name ||
              currentUser.email ||
              'Equipe Level UP',
          },
        })
        .catch(
          () =>
            null
        );


      await prisma.comment
        .create({
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
              'Material final salvo pela Social Media e enviado para Pronto para Postar.',
          },
        })
        .catch(
          () =>
            null
        );


      return NextResponse.json({
        ok:
          true,

        status:
          'PRONTO_PARA_POSTAR',
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


      const finalItems:
        Array<{
          path: string;
          mimeType: string;
        }> =
        Array.isArray(
          body.finalItems
        )
          ? (
              body.finalItems as unknown[]
            )
              .map(
                (
                  item:
                    unknown
                ) => {
                  const value =
                    item as {
                      path?:
                        unknown;

                      mimeType?:
                        unknown;
                    };


                  return {
                    path:
                      typeof value.path ===
                        'string'
                        ? value.path
                        : '',

                    mimeType:
                      typeof value.mimeType ===
                        'string'
                        ? value.mimeType
                        : '',
                  };
                }
              )
              .filter(
                (
                  item
                ) =>
                  Boolean(
                    item.path
                  )
              )
          : [];


      if (
        finalItems.length >
          10
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'O Feed aceita no maximo 10 imagens por entrega.',
          },
          {
            status:
              400,
          }
        );
      }


      if (
        finalItems.length >
          0 &&
        ![
          'DESIGN',
          'SOCIAL_DESIGN',
          'SOCIAL_MEDIA',
        ].includes(
          content.area
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Varias imagens sao permitidas somente em entregas de Design.',
          },
          {
            status:
              400,
          }
        );
      }


      if (
        finalItems.length >
          1 &&
        finalItems.some(
          (
            item
          ) =>
            !item.mimeType.startsWith(
              'image/'
            )
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Uma entrega com varios arquivos precisa conter somente imagens.',
          },
          {
            status:
              400,
          }
        );
      }


      const storyItems:
        Array<{
          path: string;
          mimeType: string;
        }> =
        Array.isArray(
          body.storyItems
        )
          ? (
              body.storyItems as unknown[]
            )
              .map(
                (
                  item:
                    unknown
                ) => {
                  const value =
                    item as {
                      path?:
                        unknown;

                      mimeType?:
                        unknown;
                    };


                  return {
                    path:
                      typeof value.path ===
                        'string'
                        ? value.path
                        : '',

                    mimeType:
                      typeof value.mimeType ===
                        'string'
                        ? value.mimeType
                        : '',
                  };
                }
              )
              .filter(
                (
                  item
                ) =>
                  Boolean(
                    item.path
                  )
              )
          : [];


      if (
        storyItems.length >
          10
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Os Stories aceitam no maximo 10 imagens por entrega.',
          },
          {
            status:
              400,
          }
        );
      }


      if (
        storyItems.length >
          0 &&
        ![
          'DESIGN',
          'SOCIAL_DESIGN',
          'SOCIAL_MEDIA',
        ].includes(
          content.area
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Varias imagens de Stories sao permitidas somente em entregas de Design.',
          },
          {
            status:
              400,
          }
        );
      }


      if (
        storyItems.length >
          1 &&
        storyItems.some(
          (
            item
          ) =>
            !item.mimeType.startsWith(
              'image/'
            )
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Uma entrega com varios Stories precisa conter somente imagens.',
          },
          {
            status:
              400,
          }
        );
      }


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
        finalItems.length ===
          0 &&
        !coverPath &&
        !storyPath &&
        storyItems.length ===
          0 &&
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


      finalItems.forEach(
        (
          item,
          index
        ) => {
          pathsToValidate.push({
            path:
              item.path,

            kind:
              'final',

            label:
              'imagem ' +
              String(
                index +
                  1
              ) +
              ' do Feed',
          });
        }
      );


      storyItems.forEach(
        (
          item,
          index
        ) => {
          pathsToValidate.push({
            path:
              item.path,

            kind:
              'story',

            label:
              'Story ' +
              String(
                index +
                  1
              ),
          });
        }
      );


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


      const finalItemUploads =
        finalItems.map(
          (
            item
          ) => ({
            url:
              getAprovUpPublicUrl(
                item.path
              ),

            mimeType:
              item.mimeType,
          })
        );


      const multiImageUpload =
        finalItemUploads.length >
          1;


      const finalMediaUrl =
        finalItemUploads[0]
          ?.url ||
        (
          finalPath
            ? getAprovUpPublicUrl(
                finalPath
              )
            : ''
        );


      const coverUrl =
        coverPath
          ? getAprovUpPublicUrl(
              coverPath
            )
          : '';


      const storyItemUploads =
        storyItems.map(
          (
            item,
            index
          ) => ({
            url:
              getAprovUpPublicUrl(
                item.path
              ),

            mimeType:
              item.mimeType,

            position:
              index,
          })
        );


      const storyMediaUrl =
        storyItemUploads[0]
          ?.url ||
        (
          storyPath
            ? getAprovUpPublicUrl(
                storyPath
              )
            : ''
        );


      const storyCoverUrl =
        storyCoverPath
          ? getAprovUpPublicUrl(
              storyCoverPath
            )
          : '';


      const reviewStatus =
        content.area ===
          'SOCIAL_MEDIA'
          ? 'PRONTO_PARA_POSTAR'
          : content.area ===
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


      if (
        multiImageUpload
      ) {
        updateData.finalMediaUrl =
          finalMediaUrl;

        updateData.finalCoverUrl =
          coverUrl ||
          finalMediaUrl;

        updateData.finalMediaType =
          'carousel/image';
      }
      else if (
        finalMediaUrl
      ) {
        const finalMediaType =
          finalItemUploads[0]
            ?.mimeType ||
          (
            typeof body.finalMediaType ===
              'string'
              ? body.finalMediaType
              : ''
          );


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
          storyItemUploads[0]
            ?.mimeType ||
          (
            typeof body.storyMediaType ===
              'string'
              ? body.storyMediaType
              : ''
          );


        updateData.storyMediaUrl =
          storyMediaUrl;

        updateData.storyMediaType =
          storyMediaType;


        if (
          storyItemUploads.length >
            1
        ) {
          updateData.storyMediaItems =
            storyItemUploads;
        }
        else if (
          storyPath
        ) {
          updateData.storyMediaItems =
            [];
        }


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


      await prisma.$transaction(
        async (
          transaction
        ) => {
          await transaction.content.update({
            where: {
              id,
            },

            data:
              updateData,
          });


          if (
            multiImageUpload
          ) {
            await transaction
              .instagramMediaAsset
              .deleteMany({
                where: {
                  contentId:
                    id,
                },
              });


            await transaction
              .instagramMediaAsset
              .createMany({
                data:
                  finalItemUploads.map(
                    (
                      item,
                      index
                    ) => ({
                      contentId:
                        id,

                      url:
                        item.url,

                      mimeType:
                        item.mimeType,

                      position:
                        index,
                    })
                  ),
              });
          }
          else if (
            finalPath ||
            finalItemUploads.length ===
              1
          ) {
            await transaction
              .instagramMediaAsset
              .deleteMany({
                where: {
                  contentId:
                    id,
                },
              });
          }
        }
      );


      /*
       * LIV_EMERGENCY_READY_NOTIFICATION
       *
       * Demanda emergencial:
       * assim que Design ou Filmmaker envia o material
       * final, a Social Media responsável é avisada.
       */
      if (
        [
          'DEMANDA_EMERGENCIAL',
          'DESIGN_GRAFICO',
        ].includes(
          String(
            content.format ||
            ''
          )
        ) &&
        [
          'DESIGN',
          'FILMMAKER',
        ].includes(
          content.area
        )
      ) {
        const uploadedMaterialKey =
          [
            ...finalItems.map(
              (
                item
              ) =>
                item.path
            ),
            finalPath,
            coverPath,
            ...storyItems.map(
              (
                item
              ) =>
                item.path
            ),
            storyPath,
            storyCoverPath,
          ]
            .filter(
              Boolean
            )
            .join(
              '|'
            );


        /*
         * Arquivos enviados ao Storage possuem caminho
         * único. Isso permite reconhecer exatamente
         * a versão enviada.
         *
         * Quando a entrega for apenas por link externo,
         * usamos também o horário porque o mesmo link
         * do Drive pode receber uma nova versão.
         */
        const notificationSource =
          uploadedMaterialKey ||
          (
            finalExternalUrl +
            '|' +
            String(
              Date.now()
            )
          );


        const uploadKey =
          createHash(
            'sha256'
          )
            .update(
              notificationSource
            )
            .digest(
              'hex'
            )
            .slice(
              0,
              24
            );


        await notifyEmergencyDemandReadyToSocialMedia({
          agencyId:
            currentUser.agencyId,

          contentId:
            id,

          uploadKey,
        }).catch(
          (
            error
          ) => {
            /*
             * Falha no WhatsApp nunca pode impedir
             * o Design/Filmmaker de concluir o upload.
             */
            console.error(
              'LIV EMERGENCY READY NOTIFICATION ERROR',
              id,
              error
            );
          }
        );
      }


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
            content.area ===
              'SOCIAL_MEDIA'
              ? 'Material final salvo pela Social Media e enviado para Pronto para Postar.'
              : content.format ===
                  'DESIGN_GRAFICO'
                ? 'Material de Design Gráfico finalizado. A LIV avisou a Social Media responsável que o arquivo está disponível para download.'
                : content.format ===
                    'DEMANDA_EMERGENCIAL'
                  ? 'Demanda emergencial finalizada. A LIV avisou a Social Media responsável para revisar e encaminhar ao cliente.'
                  : 'Materiais finais enviados para conferência interna antes da 2ª Etapa de Aprovação.',
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

      updateData.storyMediaItems =
        [];


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
