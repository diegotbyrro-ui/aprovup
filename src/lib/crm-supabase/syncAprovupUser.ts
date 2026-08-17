import type {
  User,
} from "@supabase/supabase-js";

import {
  createCrmAdminClient,
} from "@/lib/crm-supabase/admin";

type SyncAprovupUserInput = {
  aprovupUserId: string;
  email: string;
  password: string;
  name?: string | null;
};

export type SyncAprovupUserResult = {
  userId: string;
  action:
    | "created"
    | "updated";
};

export async function syncAprovupUserToCrm(
  input: SyncAprovupUserInput
): Promise<SyncAprovupUserResult> {

  const admin =
    createCrmAdminClient();

  const normalizedEmail =
    input.email
      .trim()
      .toLowerCase();

  let existingUser:
    User | null = null;

  const perPage = 200;

  /*
   * O AprovUp continua sendo a fonte primaria
   * de autenticacao.
   *
   * Procuramos o usuario no Supabase apenas
   * depois que Prisma + bcrypt ja validaram
   * a senha.
   */
  for (
    let page = 1;
    page <= 50;
    page++
  ) {

    const {
      data,
      error,
    } =
      await admin.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) {
      throw new Error(
        `Nao foi possivel consultar o Auth CRM: ${error.message}`
      );
    }

    existingUser =
      data.users.find(
        (item) =>
          item.email
            ?.trim()
            .toLowerCase() ===
          normalizedEmail
      ) ?? null;

    if (existingUser) {
      break;
    }

    if (
      data.users.length <
      perPage
    ) {
      break;
    }
  }


  const metadata = {
    source: "aprovup",
    aprovup_user_id:
      input.aprovupUserId,
    full_name:
      input.name ??
      undefined,
  };


  /*
   * Usuario novo.
   */
  if (!existingUser) {

    const {
      data,
      error,
    } =
      await admin.auth.admin.createUser({
        email:
          normalizedEmail,

        password:
          input.password,

        email_confirm:
          true,

        user_metadata:
          metadata,
      });


    if (
      error ||
      !data.user
    ) {
      throw new Error(
        error?.message ??
        "Nao foi possivel criar o usuario no CRM."
      );
    }


    return {
      userId:
        data.user.id,
      action:
        "created",
    };
  }


  /*
   * Usuario ja existente.
   *
   * Como a senha acabou de ser validada pelo
   * AprovUp, sincronizamos o Auth CRM com ela.
   *
   * Assim uma futura troca de senha no AprovUp
   * sera refletida no CRM no proximo login.
   */
  const {
    data,
    error,
  } =
    await admin.auth.admin.updateUserById(
      existingUser.id,
      {
        password:
          input.password,

        email_confirm:
          true,

        user_metadata: {
          ...(
            existingUser.user_metadata ??
            {}
          ),
          ...metadata,
        },
      }
    );


  if (
    error ||
    !data.user
  ) {
    throw new Error(
      error?.message ??
      "Nao foi possivel sincronizar o usuario CRM."
    );
  }


  return {
    userId:
      data.user.id,
    action:
      "updated",
  };
}