import {
  requireSaasFeature,
} from "@/lib/saasAccess";

import {
  requirePermission,
} from "@/lib/userAccess";


export async function requireCrmViewAccess() {

  const user =
    await requirePermission(
      "crm.view"
    );

  await requireSaasFeature(
    "crm"
  );

  return user;
}


export async function requireCrmManageAccess() {

  const user =
    await requirePermission(
      "crm.manage"
    );

  await requireSaasFeature(
    "crm"
  );

  return user;
}


export async function requireCrmAiManageAccess() {

  const user =
    await requireCrmManageAccess();

  await requireSaasFeature(
    "ai"
  );

  return user;
}
