import {
  isCommanderUser,
} from "@/lib/commanderAccess";


type MetaAccessUser = {
  id?: string | null;
  role?: string | null;
  status?: string | null;
};


export function isMetaPublicAccessEnabled() {

  const value =
    String(
      process.env
        .META_PUBLIC_ACCESS_ENABLED ||
      ""
    )
      .trim()
      .toLowerCase();


  return (
    value === "1" ||
    value === "true" ||
    value === "yes" ||
    value === "on"
  );
}


export function canUseMetaIntegration(
  user:
    MetaAccessUser |
    null |
    undefined
) {

  if (
    isMetaPublicAccessEnabled()
  ) {
    return true;
  }


  if (
    user &&
    user.status ===
      "APROVADO" &&
    String(
      user.role ||
      ""
    )
      .trim()
      .toUpperCase() ===
      "DIRECTOR"
  ) {
    return true;
  }


  return isCommanderUser(
    user
  );
}


/*
 * A leitura de m?tricas pode ser usada pela equipe
 * mesmo enquanto a conex?o OAuth continua controlada.
 *
 * Diretor:
 * - m?tricas
 * - conex?o/reconex?o
 *
 * Social Media:
 * - m?tricas dos clientes aos quais possui acesso
 */
export function canUseMetaInsights(
  user:
    MetaAccessUser |
    null |
    undefined
) {
  if (
    canUseMetaIntegration(
      user
    )
  ) {
    return true;
  }


  if (
    !user ||
    user.status !==
      "APROVADO"
  ) {
    return false;
  }


  const role =
    String(
      user.role ||
      ""
    )
      .trim()
      .toUpperCase();


  return role ===
    "SOCIAL_MEDIA";
}


export function canUseMetaPublishing(
  user:
    MetaAccessUser |
    null |
    undefined
) {
  if (
    canUseMetaIntegration(
      user
    )
  ) {
    return true;
  }


  if (
    !user ||
    user.status !==
      "APROVADO"
  ) {
    return false;
  }


  const role =
    String(
      user.role ||
      ""
    )
      .trim()
      .toUpperCase();


  return [
    "DIRECTOR",
    "SOCIAL_MEDIA",
  ].includes(
    role
  );
}
