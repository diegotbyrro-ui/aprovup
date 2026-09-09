import {
  getCurrentUser,
} from '@/lib/auth';

import {
  hasPermission,
} from '@/lib/userAccess';


export async function getSecretaryApiUser() {
  const user =
    await getCurrentUser();


  if (!user) {
    return {
      ok:
        false as const,

      status:
        401,

      message:
        'SessÃ£o expirada. Entre novamente.',
    };
  }


  if (
    user.status !==
      'APROVADO' ||
    !user.agencyId
  ) {
    return {
      ok:
        false as const,

      status:
        403,

      message:
        'UsuÃ¡rio sem acesso ao AprovUp.',
    };
  }


  if (
    !hasPermission(
      user,
      'dashboard.view'
    )
  ) {
    return {
      ok:
        false as const,

      status:
        403,

      message:
        'VocÃª nÃ£o tem acesso Ã  SecretÃ¡ria IA.',
    };
  }


  return {
    ok:
      true as const,

    user: {
      ...user,

      agencyId:
        user.agencyId,
    },
  };
}