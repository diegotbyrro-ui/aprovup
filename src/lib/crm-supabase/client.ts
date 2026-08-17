import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_CRM_SUPABASE_URL?.trim();

  const supabaseKey =
    process.env.NEXT_PUBLIC_CRM_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "As variaveis publicas do Supabase CRM nao foram configuradas."
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
}