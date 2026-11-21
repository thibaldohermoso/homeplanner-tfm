import { createClient } from "@/lib/supabase/browser";

export async function signOut(scope: "global" | "local" = "local") {
  const supabase = createClient();
  return supabase.auth.signOut({ scope });
}
