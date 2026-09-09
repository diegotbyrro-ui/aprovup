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
        'Sessão expirada. Entre novamente.',
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
        'Usuário sem acesso ao AprovUp.',
    };
  }


  if (
    !hasPermission(
      user,
      'secretary.use'
    )
  ) {
    return {
      ok:
        false as const,

      status:
        403,

      message:
        'Você não tem acesso à Secretária IA.',
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
