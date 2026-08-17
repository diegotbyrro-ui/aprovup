import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore =
    await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_CRM_SUPABASE_URL?.trim();

  const supabaseKey =
    process.env.NEXT_PUBLIC_CRM_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "As variaveis publicas do Supabase CRM nao foram configuradas."
    );
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          }
          catch {
            /*
             * Server Components podem nao permitir
             * gravacao direta de cookies.
             *
             * Em Server Actions e Route Handlers
             * a sessao pode ser persistida.
             */
          }
        },
      },
    }
  );
}