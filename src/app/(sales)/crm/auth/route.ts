import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/crm-supabase/server";


import { requireCrmViewAccess } from "@/lib/crmAccess";

export async function GET(
  request: NextRequest
) {
  /*
   * Primeiro preservamos o controle de acesso
   * comercial do AprovUp.
   */
  await requireCrmViewAccess();


  /*
   * O createServerClient utiliza os cookies
   * da sessao Supabase.
   *
   * Como estamos em Route Handler, eventual
   * atualizacao de cookies pode ser persistida.
   */
  const supabase =
    await createClient();


  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser();


  /*
   * Sessao valida:
   * volta para o CRM normalmente.
   */
  if (
    user &&
    !error
  ) {
    return NextResponse.redirect(
      new URL(
        "/crm",
        request.url
      )
    );
  }


  /*
   * Nao existe sessao Supabase.
   *
   * Nao tentamos mais gerar magic link
   * administrativo e, portanto, esta rota
   * nunca depende de Secret Key.
   */
  console.error(
    "[APROVUP CRM] SESSAO_SUPABASE_AUSENTE:",
    error?.message ||
      "usuario nao autenticado"
  );


  const loginUrl =
    new URL(
      "/login",
      request.url
    );


  loginUrl.searchParams.set(
    "error",
    "crm-session"
  );


  return NextResponse.redirect(
    loginUrl
  );
}