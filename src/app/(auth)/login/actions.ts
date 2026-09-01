"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createClient as createCrmClient,
} from "@/lib/crm-supabase/server";

import {
  syncAprovupUserToCrm,
} from "@/lib/crm-supabase/syncAprovupUser";

import {
  APROVUP_SESSION_COOKIE,
  APROVUP_SESSION_MAX_AGE,
  createAprovUpSession,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  hasPermission,
} from "@/lib/userAccess";


export async function loginAction(
  formData: FormData
) {

  const email =
    String(
      formData.get("email") ||
      ""
    )
      .trim()
      .toLowerCase();


  const password =
    String(
      formData.get("password") ||
      ""
    ).trim();


  if (
    !email ||
    !password
  ) {
    redirect(
      "/login?error=empty"
    );
  }


  /*
   * ========================================================
   * 1. AUTH PRINCIPAL DO APROVUP
   * ========================================================
   *
   * Prisma + bcrypt continuam sendo a fonte primaria.
   */
  const user =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });


  if (
    !user ||
    !user.password
  ) {
    redirect(
      "/login?error=invalid"
    );
  }


  if (
    user.status ===
    "PENDENTE"
  ) {
    redirect(
      "/login?error=pending"
    );
  }


  if (
    user.status ===
    "RECUSADO"
  ) {
    redirect(
      "/login?error=rejected"
    );
  }


  if (
    user.status ===
    "INATIVO"
  ) {
    redirect(
      "/login?error=inactive"
    );
  }


  if (
    user.status !==
    "APROVADO"
  ) {
    redirect(
      "/login?error=unauthorized"
    );
  }


  const passwordMatches =
    await bcrypt.compare(
      password,
      user.password
    );


  if (!passwordMatches) {
    redirect(
      "/login?error=invalid"
    );
  }


  /*
   * ========================================================
   * 2. AUTH DO CRM
   * ========================================================
   *
   * Primeiro tentamos o login normal.
   *
   * Esse sera o caminho comum depois que o usuario
   * estiver sincronizado.
   */
  try {

    const supabase =
      await createCrmClient();


    let {
      data:
        supabaseLogin,

      error:
        supabaseLoginError,
    } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });


    /*
     * Se ainda nao existir no projeto novo
     * ou estiver com senha diferente,
     * sincronizamos usando a Secret Key.
     *
     * Isso ocorre somente depois que o AprovUp
     * ja validou a senha via bcrypt.
     */
    if (
      supabaseLoginError ||
      !supabaseLogin.user ||
      !supabaseLogin.session
    ) {

      console.log(
        "[APROVUP CRM] SINCRONIZANDO_USUARIO"
      );


      const syncResult =
        await syncAprovupUserToCrm({
          aprovupUserId:
            user.id,

          email,

          password,

          name:
            user.name,
        });


      console.log(
        `[APROVUP CRM] USUARIO_${syncResult.action.toUpperCase()}`
      );


      const retry =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });


      supabaseLogin =
        retry.data;

      supabaseLoginError =
        retry.error;
    }


    if (
      supabaseLoginError ||
      !supabaseLogin.user ||
      !supabaseLogin.session
    ) {

      console.error(
        "[APROVUP CRM] LOGIN_SUPABASE_FALHOU:",
        supabaseLoginError?.message ??
          "sessao ausente"
      );

    }
    else {

      console.log(
        "[APROVUP CRM] LOGIN_SUPABASE_OK"
      );


      /*
       * Garante organization + membership +
       * pipeline antes mesmo da entrada no CRM.
       */
      const {
        data:
          organizationId,

        error:
          bootstrapError,
      } =
        await supabase.rpc(
          "bootstrap_workspace"
        );


      if (
        bootstrapError ||
        !organizationId
      ) {

        console.error(
          "[APROVUP CRM] BOOTSTRAP_FALHOU:",
          bootstrapError?.message ??
            "organizationId ausente"
        );

      }
      else {

        console.log(
          "[APROVUP CRM] BOOTSTRAP_OK"
        );
      }
    }

  }
  catch (error) {

    /*
     * Uma indisponibilidade do CRM nao deve
     * impedir acesso ao AprovUp.
     */
    console.error(
      "[APROVUP CRM] INTEGRACAO_FALHOU:",
      error
    );
  }


  /*
   * ========================================================
   * 3. COOKIE PRINCIPAL DO APROVUP
   * ========================================================
   */
  const cookieStore =
    await cookies();


  const aprovUpSession =
    createAprovUpSession(
      user.id
    );


  cookieStore.set(
    APROVUP_SESSION_COOKIE,
    aprovUpSession,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",
      path: "/",

      maxAge:
        APROVUP_SESSION_MAX_AGE,
    }
  );


  /*
   * Remove o cookie legado que armazenava
   * diretamente o ID do usuario.
   */
  cookieStore.delete(
    "levelup_user_id"
  );


  let destination =
    "/acesso-bloqueado";


  if (
    hasPermission(
      user,
      "dashboard.view"
    )
  ) {
    destination =
      "/operacao";
  }
  else if (
    hasPermission(
      user,
      "social.view"
    )
  ) {
    destination =
      "/clientes";
  }
  else if (
    hasPermission(
      user,
      "design.view"
    )
  ) {
    destination =
      "/design";
  }
  else if (
    hasPermission(
      user,
      "filmmaker.view"
    )
  ) {
    destination =
      "/filmmaker";
  }
  else if (
    hasPermission(
      user,
      "crm.view"
    )
  ) {
    destination =
      "/crm";
  }


  redirect(
    destination
  );
}


export async function logoutAction() {

  /*
   * Encerra a sessao do CRM novo.
   */
  try {

    const supabase =
      await createCrmClient();

    await supabase.auth.signOut();

  }
  catch (error) {

    console.error(
      "[APROVUP CRM] LOGOUT_SUPABASE_FALHOU:",
      error
    );
  }


  /*
   * Encerra a sessao principal do AprovUp.
   */
  const cookieStore =
    await cookies();


  cookieStore.delete(
    APROVUP_SESSION_COOKIE
  );

  /*
   * Compatibilidade de limpeza com
   * sessoes antigas.
   */
  cookieStore.delete(
    "levelup_user_id"
  );


  redirect(
    "/login"
  );
}