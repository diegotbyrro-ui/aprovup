import {
  NextResponse,
} from "next/server";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  hasPermission,
} from "@/lib/userAccess";

import {
  uploadAprovUpFile,
} from "@/lib/aprovupStorage";


function errorResponse(
  message:
    string,
  status:
    number
) {
  return NextResponse.json(
    {
      ok:
        false,

      error:
        message,
    },
    {
      status,
    }
  );
}


export async function POST(
  request:
    Request,
  context: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {
  const user =
    await getCurrentUser();


  if (
    !user ||
    user.status !==
      "APROVADO" ||
    !user.agencyId
  ) {
    return errorResponse(
      "Nao autorizado.",
      401
    );
  }


  if (
    !hasPermission(
      user,
      "mindmap.manage"
    )
  ) {
    return errorResponse(
      "Sem permissao.",
      403
    );
  }


  const {
    id,
  } =
    await context.params;


  const map =
    await prisma.mindMap.findFirst({
      where: {
        id,

        agencyId:
          user.agencyId,
      },

      include: {
        client: {
          select: {
            agencyId:
              true,

            internalResponsible:
              true,
          },
        },
      },
    });


  if (!map) {
    return errorResponse(
      "Mapa nao encontrado.",
      404
    );
  }


  if (
    map.client &&
    !canAccessClient(
      user,
      map.client
    )
  ) {
    return errorResponse(
      "Sem acesso.",
      403
    );
  }


  const formData =
    await request.formData();


  const rawFile =
    formData.get(
      "file"
    );


  if (
    !(
      rawFile instanceof
        File
    )
  ) {
    return errorResponse(
      "Imagem nao enviada.",
      400
    );
  }


  if (
    !rawFile.type.startsWith(
      "image/"
    )
  ) {
    return errorResponse(
      "Envie apenas arquivos de imagem.",
      400
    );
  }


  if (
    rawFile.size >
    8 *
    1024 *
    1024
  ) {
    return errorResponse(
      "A imagem deve ter no maximo 8 MB.",
      413
    );
  }


  try {
    const url =
      await uploadAprovUpFile(
        rawFile,
        "mindmap-" +
          map.id,
        "imagem"
      );


    return NextResponse.json({
      ok:
        true,

      url,
    });
  }
  catch (
    error
  ) {
    console.error(
      "[MIND MAP IMAGE]",
      error
    );


    return errorResponse(
      "Nao foi possivel salvar a imagem.",
      500
    );
  }
}
