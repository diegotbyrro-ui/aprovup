import {
  requireCurrentUser,
} from "@/lib/auth";

/**
 * Contexto de tenant autenticado.
 *
 * O agencyId sempre vem do usuario carregado no servidor.
 * Nunca deve vir de FormData, query string ou body enviado
 * pelo navegador.
 */
export async function requireAgencyContext() {
  const user =
    await requireCurrentUser();

  const agencyId =
    String(
      user.agencyId || ""
    ).trim();

  if (!agencyId) {
    throw new Error(
      "Usuário autenticado sem agência vinculada."
    );
  }

  return {
    user,
    agencyId,
  };
}

/**
 * Auxiliar para verificar se um agencyId pertence
 * ao tenant autenticado.
 */
export function assertSameAgency(
  currentAgencyId: string,
  resourceAgencyId: string | null | undefined
) {
  if (
    !resourceAgencyId ||
    resourceAgencyId !== currentAgencyId
  ) {
    throw new Error(
      "Recurso não encontrado ou acesso não autorizado."
    );
  }
}