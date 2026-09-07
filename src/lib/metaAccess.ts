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


  return isCommanderUser(
    user
  );
}