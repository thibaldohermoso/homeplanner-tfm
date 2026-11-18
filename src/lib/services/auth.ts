import { createClient } from "@/lib/supabase/browser";

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}
