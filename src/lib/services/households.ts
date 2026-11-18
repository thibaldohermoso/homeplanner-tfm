import { createClient } from "@/lib/supabase/browser";

export async function createHousehold(name: string) {
  const supabase = createClient();
  return supabase.rpc("create_household", { p_name: name.trim() });
}

export async function joinHousehold(code: string) {
  const supabase = createClient();
  return supabase.rpc("join_household", { p_code: code.trim().toUpperCase() });
}

export async function getHouseholds() {
  const supabase = createClient();
  return supabase.from("households").select("id, name, invite_code, created_by").order("created_at", { ascending: true });
}
