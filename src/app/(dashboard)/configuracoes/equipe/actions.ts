"use server";

import {
  randomUUID,
} from "crypto";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  PERMISSIONS,
  requirePermission,
  type PermissionKey,
} from "@/lib/userAccess";


const STAFF_ROLES = [
  "SOCIAL_MEDIA",
  "DESIGN",
  "FILMMAKER",
];


function readPermissions(
  formData:
    FormData
) {
  const values =
    formData
      .getAll(
        "permissions"
      )
      .map(
        (
          value
        ) =>
          String(
            value
          )
      );


  return values.filter(
    (
      item
    ): item is PermissionKey =>
      (
        PERMISSIONS as
          readonly string[]
      ).includes(
        item
      )
  );
}


export async function createEmployeeInviteAction(
  formData:
    FormData
) {
  const currentUser =
    await requirePermission(
      "users.manage"
    );


  const name =
    String(
      formData.get(
        "name"
      ) || ""
    ).trim();


  const email =
    String(
      formData.get(
        "email"
      ) || ""
    )
      .trim()
      .toLowerCase();


  const role =
    String(
      formData.get(
        "role"
      ) || ""
    ).trim();


  const permissions =
    readPermissions(
      formData
    );


  if (
    !name ||
    !email ||
    !role
  ) {
    redirect(
      "/configuracoes/equipe?error=empty"
    );
  }


  if (
    !STAFF_ROLES.includes(
      role
    )
  ) {
    redirect(
      "/configuracoes/equipe?error=role"
    );
  }


  const existing =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });


  if (existing) {
    redirect(
      "/configuracoes/equipe?error=exists"
    );
  }


  const inviteToken =
    randomUUID();


  const inviteExpiresAt =
    new Date(
      Date.now() +
        7 *
          24 *
          60 *
          60 *
          1000
    );


  const user =
    await prisma.user.create({
      data: {
        name,
        email,

        password:
          null,

        role,

        status:
          "PENDENTE",

        permissions,

        inviteToken,
        inviteExpiresAt,

        approvedByName:
          currentUser.name ||
          currentUser.email ||
          "Administrador",
      },
    });


  revalidatePath(
    "/configuracoes/equipe"
  );


  redirect(
    `/configuracoes/equipe?created=${user.id}`
  );
}


export async function updateEmployeeAccessAction(
  userId:
    string,
  formData:
    FormData
) {
  const currentUser =
    await requirePermission(
      "users.manage"
    );


  if (
    currentUser.id ===
    userId
  ) {
    redirect(
      "/configuracoes/equipe?error=self"
    );
  }


  const target =
    await prisma.user.findUnique({
      where: {
        id:
          userId,
      },
    });


  if (!target) {
    redirect(
      "/configuracoes/equipe?error=notfound"
    );
  }


  if (
    target.role ===
    "DIRECTOR"
  ) {
    redirect(
      "/configuracoes/equipe?error=admin"
    );
  }


  const role =
    String(
      formData.get(
        "role"
      ) || ""
    ).trim();


  const status =
    String(
      formData.get(
        "status"
      ) || ""
    ).trim();


  const permissions =
    readPermissions(
      formData
    );


  if (
    !STAFF_ROLES.includes(
      role
    )
  ) {
    redirect(
      "/configuracoes/equipe?error=role"
    );
  }


  if (
    ![
      "PENDENTE",
      "APROVADO",
      "INATIVO",
    ].includes(
      status
    )
  ) {
    redirect(
      "/configuracoes/equipe?error=status"
    );
  }


  await prisma.user.update({
    where: {
      id:
        userId,
    },

    data: {
      role,
      status,
      permissions,

      approvedAt:
        status ===
        "APROVADO"
          ? target.approvedAt ||
            new Date()
          : null,

      approvedByName:
        currentUser.name ||
        currentUser.email ||
        "Administrador",
    },
  });


  revalidatePath(
    "/configuracoes/equipe"
  );
}


export async function deactivateEmployeeAction(
  userId:
    string
) {
  const currentUser =
    await requirePermission(
      "users.manage"
    );


  if (
    currentUser.id ===
    userId
  ) {
    redirect(
      "/configuracoes/equipe?error=self"
    );
  }


  const target =
    await prisma.user.findUnique({
      where: {
        id:
          userId,
      },
    });


  if (
    !target ||
    target.role ===
      "DIRECTOR"
  ) {
    redirect(
      "/configuracoes/equipe?error=admin"
    );
  }


  await prisma.user.update({
    where: {
      id:
        userId,
    },

    data: {
      status:
        "INATIVO",
    },
  });


  revalidatePath(
    "/configuracoes/equipe"
  );
}


export async function reactivateEmployeeAction(
  userId:
    string
) {
  const currentUser =
    await requirePermission(
      "users.manage"
    );


  const target =
    await prisma.user.findUnique({
      where: {
        id:
          userId,
      },
    });


  if (
    !target ||
    target.role ===
      "DIRECTOR"
  ) {
    redirect(
      "/configuracoes/equipe?error=admin"
    );
  }


  await prisma.user.update({
    where: {
      id:
        userId,
    },

    data: {
      status:
        "APROVADO",

      approvedAt:
        target.approvedAt ||
        new Date(),

      approvedByName:
        currentUser.name ||
        currentUser.email ||
        "Administrador",
    },
  });


  revalidatePath(
    "/configuracoes/equipe"
  );
}


export async function regenerateInviteAction(
  userId:
    string
) {
  const currentUser =
    await requirePermission(
      "users.manage"
    );


  const target =
    await prisma.user.findUnique({
      where: {
        id:
          userId,
      },
    });


  if (
    !target ||
    target.role ===
      "DIRECTOR"
  ) {
    redirect(
      "/configuracoes/equipe?error=admin"
    );
  }


  await prisma.user.update({
    where: {
      id:
        userId,
    },

    data: {
      status:
        "PENDENTE",

      password:
        null,

      inviteToken:
        randomUUID(),

      inviteExpiresAt:
        new Date(
          Date.now() +
            7 *
              24 *
              60 *
              60 *
              1000
        ),

      approvedAt:
        null,

      approvedByName:
        currentUser.name ||
        currentUser.email ||
        "Administrador",
    },
  });


  revalidatePath(
    "/configuracoes/equipe"
  );
}


export async function deleteEmployeeAction(
  userId:
    string,
  _formData:
    FormData
) {
  const currentUser =
    await requirePermission(
      "users.manage"
    );


  /*
   * Nunca permite excluir a propria conta.
   */
  if (
    currentUser.id ===
    userId
  ) {
    redirect(
      "/configuracoes/equipe?error=self"
    );
  }


  const target =
    await prisma.user.findUnique({
      where: {
        id:
          userId,
      },
    });


  if (!target) {
    redirect(
      "/configuracoes/equipe?error=notfound"
    );
  }


  /*
   * Administradores nao podem ser excluidos
   * por esta funcionalidade.
   */
  if (
    target.role ===
    "DIRECTOR"
  ) {
    redirect(
      "/configuracoes/equipe?error=admin"
    );
  }


  const targetName =
    target.name ||
    target.email ||
    "Funcionário";


  await prisma.$transaction([
    prisma.user.delete({
      where: {
        id:
          userId,
      },
    }),

    prisma.historyLog.create({
      data: {
        entityType:
          "USER",

        entityId:
          userId,

        action:
          "DELETED",

        description:
          `Funcionário excluído: ${targetName}.`,

        authorName:
          currentUser.name ||
          currentUser.email ||
          "Administrador",
      },
    }),
  ]);


  revalidatePath(
    "/configuracoes/equipe"
  );
}
