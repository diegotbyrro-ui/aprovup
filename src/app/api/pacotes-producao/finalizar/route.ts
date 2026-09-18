import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  hasPermission,
} from "@/lib/userAccess";

import {
  uploadAprovUpFile,
} from "@/lib/aprovupStorage";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


function carouselFormat(
  value:
    string | null
) {
  const format =
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();


  return (
    format.includes(
      "CARROSSEL"
    ) ||
    format.includes(
      "CAROUSEL"
    ) ||
    format.includes(
      "ALBUM"
    )
  );
}


function parseExternalUrl(
  value:
    FormDataEntryValue |
    null
) {
  const raw =
    typeof value ===
      "string"
      ? value.trim()
      : "";


  if (!raw) {
    return {
      ok:
        true,

      url:
        "",
    };
  }


  if (
    raw.length >
    2048
  ) {
    return {
      ok:
        false,

      url:
        "",
    };
  }


  try {
    const parsed =
      new URL(
        raw
      );


    if (
      parsed.protocol !==
      "https:"
    ) {
      return {
        ok:
          false,

        url:
          "",
      };
    }


    return {
      ok:
        true,

      url:
        parsed.toString(),
    };
  }
  catch {
    return {
      ok:
        false,

      url:
        "",
    };
  }
}


export async function POST(
  request:
    NextRequest
) {
  try {
    const user =
      await getCurrentUser();


    if (
      !user ||
      user.status !==
        "APROVADO" ||
      !user.agencyId
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "Sessao expirada ou usuario sem acesso.",
        },
        {
          status:
            401,
        }
      );
    }


    const formData =
      await request.formData();


    const rawManifest =
      String(
        formData.get(
          "manifest"
        ) ||
        ""
      );


    let manifest:
      Array<{
        id:
          string;
      }> =
        [];


    try {
      const parsed =
        JSON.parse(
          rawManifest
        );


      if (
        !Array.isArray(
          parsed
        )
      ) {
        throw new Error();
      }


      manifest =
        parsed.map(
          (
            item:
              unknown
          ) => ({
            id:
              String(
                (
                  item as {
                    id?:
                      unknown;
                  }
                )?.id ||
                ""
              ),
          })
        );
    }
    catch {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "Pacote invalido.",
        },
        {
          status:
            400,
        }
      );
    }


    if (
      manifest.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "Nenhum conteudo foi informado.",
        },
        {
          status:
            400,
        }
      );
    }


    const ids =
      manifest
        .map(
          (
            item
          ) =>
            item.id
        )
        .filter(
          Boolean
        );


    if (
      ids.length !==
        manifest.length ||
      new Set(
        ids
      ).size !==
        ids.length
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "O pacote possui conteudos invalidos.",
        },
        {
          status:
            400,
        }
      );
    }


    const contents =
      await prisma
        .content
        .findMany({
          where: {
            id: {
              in:
                ids,
            },

            client: {
              agencyId:
                user.agencyId,
            },
          },

          include: {
            instagramMediaAssets:
              true,
          },
        });


    if (
      contents.length !==
      ids.length
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "Um ou mais conteudos nao foram encontrados.",
        },
        {
          status:
            404,
        }
      );
    }


    /*
     * Validamos TODO o pacote antes de
     * iniciar qualquer upload.
     */
    for (
      const content
      of contents
    ) {
      const permission =
        content.area ===
          "FILMMAKER"
          ? "filmmaker.manage"
          : "design.manage";


      if (
        !hasPermission(
          user,
          permission
        ) &&
        !hasPermission(
          user,
          "social.manage"
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              "Sem permissao para concluir " +
              content.title +
              ".",
          },
          {
            status:
              403,
          }
        );
      }


      if (
        content.status ===
        "ENVIADO_CLIENTE"
      ) {
        continue;
      }


      if (
        ![
          "DESIGN",
          "FILMMAKER",
        ].includes(
          content.area
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              content.title +
              " nao pertence ao Design ou Filmmaker.",
          },
          {
            status:
              400,
          }
        );
      }


      const selected =
        formData
          .getAll(
            "files:" +
              content.id
          )
          .filter(
            (
              value
            ): value is File =>
              value instanceof File &&
              value.size >
                0
          );


      const externalResult =
        parseExternalUrl(
          formData.get(
            "link:" +
              content.id
          )
        );


      if (
        !externalResult.ok
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              "Informe um link HTTPS valido para " +
              content.title +
              ".",
          },
          {
            status:
              422,
          }
        );
      }


      const externalUrl =
        externalResult.url;


      if (
        selected.length ===
          0 &&
        !externalUrl
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              "Envie um arquivo ou informe um link do Google Drive para " +
              content.title +
              ".",
          },
          {
            status:
              422,
          }
        );
      }


      if (
        carouselFormat(
          content.format
        )
      ) {
        if (
          selected.length >
            0 &&
          (
            selected.length <
              2 ||
            selected.length >
              10
          )
        ) {
          return NextResponse.json(
            {
              ok:
                false,

              message:
                "O carrossel " +
                content.title +
                " precisa possuir de 2 a 10 paginas.",
            },
            {
              status:
                422,
            }
          );
        }


        for (
          const file
          of selected
        ) {
          if (
            ![
              "image/jpeg",
              "image/png",
            ].includes(
              file.type
            )
          ) {
            return NextResponse.json(
              {
                ok:
                  false,

                message:
                  "Use somente JPG ou PNG no carrossel " +
                  content.title +
                  ".",
              },
              {
                status:
                  422,
              }
            );
          }


          if (
            file.size >
            8 *
              1024 *
              1024
          ) {
            return NextResponse.json(
              {
                ok:
                  false,

                message:
                  "Uma pagina de " +
                  content.title +
                  " ultrapassa 8 MB.",
              },
              {
                status:
                  422,
              }
            );
          }
        }
      }
      else if (
        selected.length >
        2
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              content.title +
              " aceita o arquivo principal e, opcionalmente, uma capa.",
          },
          {
            status:
              422,
          }
        );
      }
    }


    const completed:
      string[] =
        [];


    for (
      const content
      of contents
    ) {
      if (
        content.status ===
        "ENVIADO_CLIENTE"
      ) {
        completed.push(
          content.id
        );

        continue;
      }


      const selected =
        formData
          .getAll(
            "files:" +
              content.id
          )
          .filter(
            (
              value
            ): value is File =>
              value instanceof File &&
              value.size >
                0
          );


      const externalResult =
        parseExternalUrl(
          formData.get(
            "link:" +
              content.id
          )
        );


      const externalUrl =
        externalResult.ok
          ? externalResult.url
          : "";


      const carousel =
        carouselFormat(
          content.format
        );


      let finalMediaUrl =
        "";

      let finalCoverUrl =
        "";

      let finalMediaType =
        "";


      const carouselUrls:
        Array<{
          url:
            string;

          mimeType:
            string;

          position:
            number;
        }> =
          [];


      if (
        carousel &&
        selected.length >
          0
      ) {
        if (
          content
            .instagramMediaAssets
            .length >
          0
        ) {
          return NextResponse.json(
            {
              ok:
                false,

              message:
                content.title +
                " ja possui paginas salvas. Abra o conteudo individual antes de reenviar.",
            },
            {
              status:
                409,
            }
          );
        }


        for (
          let index =
            0;
          index <
          selected.length;
          index++
        ) {
          const file =
            selected[
              index
            ];


          const url =
            await uploadAprovUpFile(
              file,
              "instagram-carousel",
              "content-" +
                content.id +
                "-pagina-" +
                String(
                  index +
                  1
                )
            );


          carouselUrls.push({
            url,

            mimeType:
              file.type,

            position:
              index,
          });
        }


        finalMediaUrl =
          carouselUrls[0]
            .url;

        finalCoverUrl =
          carouselUrls[0]
            .url;

        finalMediaType =
          "carousel/image";
      }
      else if (
        !carousel &&
        selected.length >
          0
      ) {
        const mainFile =
          content.area ===
            "FILMMAKER"
            ? (
                selected.find(
                  (
                    file
                  ) =>
                    file.type.startsWith(
                      "video/"
                    )
                ) ||
                selected[0]
              )
            : selected[0];


        const coverFile =
          selected.find(
            (
              file
            ) =>
              file !==
                mainFile &&
              file.type.startsWith(
                "image/"
              )
          ) ||
          null;


        finalMediaUrl =
          await uploadAprovUpFile(
            mainFile,
            "final-content",
            "material-final-" +
              content.id
          );


        finalMediaType =
          mainFile.type ||
          (
            mainFile.name
              .toLowerCase()
              .endsWith(
                ".pdf"
              )
              ? "application/pdf"
              : "application/octet-stream"
          );


        if (
          coverFile
        ) {
          finalCoverUrl =
            await uploadAprovUpFile(
              coverFile,
              "final-content",
              "capa-" +
                content.id
            );
        }
        else if (
          mainFile.type.startsWith(
            "image/"
          )
        ) {
          finalCoverUrl =
            finalMediaUrl;
        }
      }


      const authorName =
        user.name ||
        user.email ||
        "Equipe AprovUp";


      await prisma
        .$transaction(
          async (
            transaction
          ) => {
            if (
              carouselUrls.length >
              0
            ) {
              await transaction
                .instagramMediaAsset
                .createMany({
                  data:
                    carouselUrls.map(
                      (
                        asset
                      ) => ({
                        contentId:
                          content.id,

                        url:
                          asset.url,

                        mimeType:
                          asset.mimeType,

                        position:
                          asset.position,
                      })
                    ),
                });
            }


            await transaction
              .content
              .update({
                where: {
                  id:
                    content.id,
                },

                data: {
                  status:
                    content.area ===
                      "FILMMAKER"
                      ? "FILMMAKER_ANALISE"
                      : "DESIGN_ANALISE",

                  finalMediaUrl:
                    finalMediaUrl ||
                    content.finalMediaUrl ||
                    null,

                  finalCoverUrl:
                    finalCoverUrl ||
                    content.finalCoverUrl ||
                    null,

                  finalMediaType:
                    finalMediaType ||
                    content.finalMediaType ||
                    null,

                  finalExternalUrl:
                    externalUrl ||
                    content.finalExternalUrl ||
                    null,

                  finalUploadedAt:
                    new Date(),
                },
              });


            await transaction
              .historyLog
              .create({
                data: {
                  entityType:
                    "CONTENT",

                  entityId:
                    content.id,

                  action:
                    "PACKAGE_SENT_TO_INTERNAL_REVIEW",

                  description:
                    "Material final enviado pelo pacote de producao para analise interna: " +
                    content.title +
                    ".",

                  authorName,
                },
              });
          }
        );


      completed.push(
        content.id
      );
    }


    return NextResponse.json({
      ok:
        true,

      completed:
        completed.length,

      total:
        contents.length,
    });
  }
  catch (
    error
  ) {
    console.error(
      "PRODUCTION PACKAGE FINALIZE:",
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Erro ao finalizar o pacote.",
      },
      {
        status:
          500,
      }
    );
  }
}
