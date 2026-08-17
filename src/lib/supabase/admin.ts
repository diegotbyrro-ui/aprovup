import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL
      ?.trim();

  /*
   * Preferimos a nova Secret API Key.
   * Se ela nao estiver configurada,
   * usamos a service_role legada.
   *
   * O uso de || aqui e intencional:
   * strings vazias tambem sao ignoradas.
   */
  const secretKey =
    process.env.SUPABASE_SECRET_KEY
      ?.trim();

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY
      ?.trim();

  const adminKey =
    secretKey || serviceRoleKey;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL nao configurada."
    );
  }

  if (!adminKey) {
    throw new Error(
      "Nenhuma chave administrativa valida do Supabase foi configurada."
    );
  }

  return createClient(
    supabaseUrl,
    adminKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}