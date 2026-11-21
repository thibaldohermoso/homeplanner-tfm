import { createClient } from "@/lib/supabase/browser";

export type ShoppingList = {
  id: string;
  household_id: string;
  name: string;
  is_archived: boolean;
  created_at: string;
};

export type ShoppingItem = {
  id: string;
  list_id: string;
  household_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  estimated_price: number | null;
  is_checked: boolean;
  checked_by: string | null;
};

export async function listShoppingLists(householdId: string, includeArchived = false) {
  let query = createClient()
    .from("shopping_lists")
    .select("id, household_id, name, is_archived, created_at")
    .eq("household_id", householdId)
    .order("is_archived", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeArchived) query = query.eq("is_archived", false);
  return query;
}

export async function createShoppingList(householdId: string, name: string) {
  return createClient()
    .from("shopping_lists")
    .insert({ household_id: householdId, name: name.trim() })
    .select("id, household_id, name, is_archived, created_at")
    .single();
}

export async function renameShoppingList(listId: string, name: string) {
  return createClient()
    .from("shopping_lists")
    .update({ name: name.trim() })
    .eq("id", listId)
    .select("id, household_id, name, is_archived, created_at")
    .single();
}

export async function archiveShoppingList(listId: string, archived: boolean) {
  return createClient()
    .from("shopping_lists")
    .update({ is_archived: archived })
    .eq("id", listId)
    .select("id, household_id, name, is_archived, created_at")
    .single();
}

export async function listShoppingItems(listId: string) {
  return createClient()
    .from("shopping_items")
    .select("id, list_id, household_id, name, quantity, unit, estimated_price, is_checked, checked_by")
    .eq("list_id", listId)
    .order("is_checked", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function createShoppingItem(input: {
  householdId: string;
  listId: string;
  name: string;
  quantity: number;
  unit?: string;
  estimatedPrice?: number | null;
}) {
  return createClient()
    .from("shopping_items")
    .insert({
      household_id: input.householdId,
      list_id: input.listId,
      name: input.name.trim(),
      quantity: input.quantity,
      unit: input.unit?.trim() || null,
      estimated_price: input.estimatedPrice ?? null,
    })
    .select("id, list_id, household_id, name, quantity, unit, estimated_price, is_checked, checked_by")
    .single();
}

export async function toggleShoppingItem(itemId: string, checked: boolean) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  return supabase
    .from("shopping_items")
    .update({ is_checked: checked, checked_by: checked ? userData.user?.id ?? null : null })
    .eq("id", itemId)
    .select("id, list_id, household_id, name, quantity, unit, estimated_price, is_checked, checked_by")
    .single();
}

export function translateShoppingError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("permission") || normalized.includes("policy") || normalized.includes("rls")) return "No tienes permiso para modificar esta lista.";
  if (normalized.includes("check") || normalized.includes("quantity") || normalized.includes("estimated_price")) return "Revisa la cantidad y el precio del artículo.";
  return "No se ha podido actualizar la lista. Inténtalo de nuevo.";
}

export async function deleteShoppingItem(itemId: string) {
  return createClient().from("shopping_items").delete().eq("id", itemId);
}
