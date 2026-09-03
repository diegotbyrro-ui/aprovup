import {
  redirect,
} from "next/navigation";

import {
  getCurrentUser,
} from "@/lib/auth";


export const PERMISSIONS = [
  "dashboard.view",

  "social.view",
  "social.manage",

  "design.view",
  "design.manage",

  "filmmaker.view",
  "filmmaker.manage",

  "crm.view",
  "crm.manage",

  "users.manage",
  "settings.manage",
] as const;


export type PermissionKey =
  (typeof PERMISSIONS)[number];


export const ROLE_DEFAULT_PERMISSIONS:
  Record<
    string,
    PermissionKey[]
  > = {

  DIRECTOR: [
    ...PERMISSIONS,
  ],


  SOCIAL_MEDIA: [
    "dashboard.view",
    "social.view",
    "social.manage",
  ],


  DESIGN: [
    "design.view",
    "design.manage",
  ],


  FILMMAKER: [
    "filmmaker.view",
    "filmmaker.manage",
  ],
};


type AccessUser = {
  role:
    string;

  permissions?:
    unknown;
};


function parseStoredPermissions(
  value:
    unknown
):
  PermissionKey[] |
  null {

  if (
    !Array.isArray(
      value
    )
  ) {
    return null;
  }


  return value.filter(
    (
      item
    ): item is PermissionKey =>
      typeof item ===
        "string" &&
      (
        PERMISSIONS as
          readonly string[]
      ).includes(
        item
      )
  );
}


export function getEffectivePermissions(
  user:
    AccessUser
) {
  /*
   * Diretor/Administrador sempre tem acesso total.
   * Isso evita que a conta mestre seja bloqueada
   * acidentalmente pela tela de permissoes.
   */
  if (
    user.role ===
    "DIRECTOR"
  ) {
    return [
      ...PERMISSIONS,
    ];
  }


  const stored =
    parseStoredPermissions(
      user.permissions
    );


  /*
   * NULL = usa o padrao do cargo.
   * []   = administrador removeu todos os acessos.
   */
  if (
    stored !==
    null
  ) {
    return stored;
  }


  return [
    ...(
      ROLE_DEFAULT_PERMISSIONS[
        user.role
      ] ||
      []
    ),
  ];
}


export function hasPermission(
  user:
    AccessUser,
  permission:
    PermissionKey
) {
  return getEffectivePermissions(
    user
  ).includes(
    permission
  );
}


export function hasAnyPermission(
  user:
    AccessUser,
  permissions:
    PermissionKey[]
) {
  return permissions.some(
    (
      permission
    ) =>
      hasPermission(
        user,
        permission
      )
  );
}


export async function requirePermission(
  permission:
    PermissionKey
) {
  const user =
    await getCurrentUser();


  if (!user) {
    redirect(
      "/login"
    );
  }


  if (
    user.status !==
    "APROVADO"
  ) {
    redirect(
      "/acesso-bloqueado"
    );
  }


  if (
    !hasPermission(
      user,
      permission
    )
  ) {
    redirect(
      "/acesso-bloqueado"
    );
  }


  if (!user.agencyId) {
    redirect(
      "/acesso-bloqueado"
    );
  }

  return {
    ...user,
    agencyId:
      user.agencyId,
  };
}


export async function requireAnyPermission(
  permissions: PermissionKey[]
) {
  const user =
    await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    user.status !==
    "APROVADO"
  ) {
    redirect(
      "/acesso-bloqueado"
    );
  }

  if (
    !hasAnyPermission(
      user,
      permissions
    )
  ) {
    redirect(
      "/acesso-bloqueado"
    );
  }

  if (!user.agencyId) {
    redirect(
      "/acesso-bloqueado"
    );
  }

  return {
    ...user,
    agencyId:
      user.agencyId,
  };
}