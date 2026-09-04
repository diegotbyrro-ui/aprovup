import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  isDirector,
} from "@/lib/auth";


type ClientAccessUser = {
  role:
    string;

  name?:
    string |
    null;

  email?:
    string |
    null;

  agencyId?:
    string |
    null;
};


type ClientAccessClient = {
  agencyId?:
    string |
    null;

  internalResponsible?:
    string |
    null;
};


function normalizeAccessText(
  value?:
    string |
    null
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}


function getResponsibleNames(
  value?:
    string |
    null
) {

  const normalized =
    normalizeAccessText(
      value
    );


  if (!normalized) {
    return [];
  }


  /*
   * Aceita formatos como:
   *
   * Maria
   * Maria, Joao
   * Maria / Joao
   * Maria e Joao
   */
  return normalized
    .split(
      /[,;\n|/]+|\s+(?:e|&)\s+/
    )
    .map(
      (
        item
      ) =>
        item.trim()
    )
    .filter(
      Boolean
    );
}


export function canAccessClient(
  user:
    ClientAccessUser,

  client:
    ClientAccessClient
) {

  /*
   * Primeiro: isolamento entre agencias.
   */
  if (
    !user.agencyId ||
    !client.agencyId ||
    user.agencyId !==
      client.agencyId
  ) {
    return false;
  }


  /*
   * Diretoria sempre enxerga tudo
   * dentro da propria agencia.
   */
  if (
    isDirector(
      user.role
    )
  ) {
    return true;
  }


  /*
   * Esta nova divisao e exclusiva do Social Media.
   *
   * Design e Filmmaker continuam seguindo
   * as permissoes e fluxos que ja possuem.
   */
  if (
    user.role !==
    "SOCIAL_MEDIA"
  ) {
    return true;
  }


  const identities = [
    normalizeAccessText(
      user.name
    ),

    normalizeAccessText(
      user.email
    ),
  ].filter(
    Boolean
  );


  if (
    identities.length ===
    0
  ) {
    return false;
  }


  const responsibleNames =
    getResponsibleNames(
      client.internalResponsible
    );


  if (
    responsibleNames.length ===
    0
  ) {
    return false;
  }


  return identities.some(
    (
      identity
    ) =>
      responsibleNames.includes(
        identity
      )
  );
}


export async function requireClientAccess(
  user:
    ClientAccessUser,

  clientId:
    string
) {

  const client =
    await prisma.client.findFirst({
      where: {
        id:
          clientId,

        agencyId:
          user.agencyId ||
          "__SEM_AGENCIA__",
      },

      select: {
        id:
          true,

        agencyId:
          true,

        internalResponsible:
          true,
      },
    });


  if (
    !client ||
    !canAccessClient(
      user,
      client
    )
  ) {
    redirect(
      "/clientes"
    );
  }


  return client;
}