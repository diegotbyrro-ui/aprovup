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
  prisma,
} from "@/lib/prisma";


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


  cookieStore.set(
    "levelup_user_id",
    user.id,
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",

      maxAge:
        60 *
        60 *
        24 *
        30,
    }
  );


  redirect(
    "/clientes"
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
    "levelup_user_id"
  );


  redirect(
    "/login"
  );
}