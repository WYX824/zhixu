import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim();

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabaseUrl) {
  console.error(
    "缺少 VITE_SUPABASE_URL，请检查项目根目录的 .env.local。",
  );
}

if (!supabasePublishableKey) {
  console.error(
    "缺少 VITE_SUPABASE_PUBLISHABLE_KEY，请检查项目根目录的 .env.local。",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabasePublishableKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  },
);