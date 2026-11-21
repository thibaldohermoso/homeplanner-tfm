import { createClient } from "@/lib/supabase/browser";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
};

export type HouseholdMember = {
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  profiles?: { id?: string; display_name: string; avatar_url?: string | null }[] | null;
};

export async function getProfile(userId: string) {
  const supabase = createClient();
  return supabase
    .from("profiles")
    .select("id, display_name, avatar_url, phone")
    .eq("id", userId)
    .single();
}

export async function updateProfile(userId: string, input: { displayName: string; phone: string | null }) {
  const supabase = createClient();
  return supabase
    .from("profiles")
    .update({ display_name: input.displayName.trim(), phone: input.phone?.trim() || null })
    .eq("id", userId)
    .select("id, display_name, avatar_url, phone")
    .single();
}

export async function getHouseholdsForProfile() {
  const supabase = createClient();
  return supabase
    .from("households")
    .select("id, name, invite_code, created_by")
    .order("created_at", { ascending: true });
}

export async function listProfileHouseholdMembers(householdId: string) {
  const supabase = createClient();
  return supabase
    .from("household_members")
    .select("user_id, role, joined_at, profiles(id, display_name, avatar_url)")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });
}

export async function updateHouseholdName(householdId: string, name: string) {
  const supabase = createClient();
  return supabase
    .from("households")
    .update({ name: name.trim() })
    .eq("id", householdId)
    .select("id, name, invite_code, created_by")
    .single();
}

export async function leaveHousehold(householdId: string, userId: string) {
  const supabase = createClient();
  const [{ data: membership, error: membershipError }, { count, error: countError }] = await Promise.all([
    supabase.from("household_members").select("role").eq("household_id", householdId).eq("user_id", userId).single(),
    supabase.from("household_members").select("user_id", { count: "exact", head: true }).eq("household_id", householdId),
  ]);
  if (membershipError) return { data: null, error: membershipError };
  if (countError) return { data: null, error: countError };

  if (membership.role === "owner" && (count ?? 0) > 1) {
    return { data: null, error: new Error("No puedes salir porque eres el único propietario del hogar") };
  }

  if (membership.role === "owner" && count === 1) {
    return supabase.from("households").delete().eq("id", householdId);
  }

  return supabase.from("household_members").delete().eq("household_id", householdId).eq("user_id", userId);
}

export function translateAccountError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("email")) {
    return "Ese email ya está en uso o no se puede utilizar.";
  }
  if (normalized.includes("password") && (normalized.includes("weak") || normalized.includes("short"))) {
    return "La nueva contraseña debe tener al menos 8 caracteres.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Has realizado demasiados intentos. Espera unos minutos y vuelve a probar.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "La contraseña actual no es correcta.";
  }
  if (normalized.includes("same password")) {
    return "La nueva contraseña debe ser distinta de la actual.";
  }
  return "No se ha podido completar la operación. Inténtalo de nuevo.";
}
