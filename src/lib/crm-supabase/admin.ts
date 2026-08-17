import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

export function createCrmAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_CRM_SUPABASE_URL?.trim();

  const secretKey =
    process.env.CRM_SUPABASE_SECRET_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_CRM_SUPABASE_URL nao configurada."
    );
  }

  if (!secretKey) {
    throw new Error(
      "CRM_SUPABASE_SECRET_KEY nao configurada."
    );
  }

  return createSupabaseClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}