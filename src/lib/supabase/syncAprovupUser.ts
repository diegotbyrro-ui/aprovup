import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type SyncAprovupUserInput = {
  aprovupUserId: string;
  email: string;
  password: string;
  name?: string | null;
};

export async function syncAprovupUserToSupabase(
  input: SyncAprovupUserInput
) {
  const admin = createSupabaseAdminClient();

  const email = input.email
    .trim()
    .toLowerCase();

  let existingUserId: string | null = null;

  for (let page = 1; page <= 100; page++) {
    const {
      data,
      error,
    } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(
        `Erro ao consultar Supabase Auth: ${error.message}`
      );
    }

    const existing = data.users.find(
      (user) =>
        user.email?.trim().toLowerCase() === email
    );

    if (existing) {
      existingUserId = existing.id;
      break;
    }

    if (data.users.length < 1000) {
      break;
    }
  }

  if (existingUserId) {
    const {
      data,
      error,
    } = await admin.auth.admin.updateUserById(
      existingUserId,
      {
        password: input.password,
        email_confirm: true,
        user_metadata: {
          aprovup_user_id: input.aprovupUserId,
          name: input.name ?? undefined,
        },
      }
    );

    if (error) {
      throw new Error(
        `Erro ao atualizar usuario Supabase: ${error.message}`
      );
    }

    return {
      created: false,
      userId: data.user.id,
    };
  }

  const {
    data,
    error,
  } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      aprovup_user_id: input.aprovupUserId,
      name: input.name ?? undefined,
    },
  });

  if (error) {
    throw new Error(
      `Erro ao criar usuario Supabase: ${error.message}`
    );
  }

  if (!data.user) {
    throw new Error(
      'Usuario nao retornado pelo Supabase.'
    );
  }

  return {
    created: true,
    userId: data.user.id,
  };
}