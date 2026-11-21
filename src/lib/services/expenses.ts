import { createClient } from "@/lib/supabase/browser";

export type ExpenseCategory = {
  id: string;
  household_id: string;
  name: string;
  color: string;
};

export type ExpenseMember = {
  user_id: string;
  role: "owner" | "member";
  profiles?: { display_name: string }[] | null;
};

export type ExpenseShoppingList = {
  id: string;
  name: string;
};

export type Expense = {
  id: string;
  household_id: string;
  category_id: string | null;
  amount: number | string;
  description: string | null;
  spent_on: string;
  paid_by: string | null;
  shopping_list_id: string | null;
  created_at: string;
  updated_at: string;
  expense_categories?: ExpenseCategory | ExpenseCategory[] | null;
  profiles?: { id?: string; display_name: string } | { id?: string; display_name: string }[] | null;
  shopping_lists?: ExpenseShoppingList | ExpenseShoppingList[] | null;
};

export type ExpenseInput = {
  householdId: string;
  categoryId?: string | null;
  amount: string;
  description?: string;
  spentOn: string;
  paidBy?: string | null;
  shoppingListId?: string | null;
};

export async function listExpenses(householdId: string, from: string, to: string) {
  return createClient()
    .from("expenses")
    .select("id, household_id, category_id, amount, description, spent_on, paid_by, shopping_list_id, created_at, updated_at, expense_categories:category_id(id, household_id, name, color), profiles:paid_by(id, display_name), shopping_lists:shopping_list_id(id, name)")
    .eq("household_id", householdId)
    .gte("spent_on", from)
    .lt("spent_on", to)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function listExpenseCategories(householdId: string) {
  return createClient()
    .from("expense_categories")
    .select("id, household_id, name, color")
    .eq("household_id", householdId)
    .order("name", { ascending: true });
}

export async function listExpenseShoppingLists(householdId: string) {
  return createClient()
    .from("shopping_lists")
    .select("id, name")
    .eq("household_id", householdId)
    .eq("is_archived", false)
    .order("created_at", { ascending: true });
}

export async function createExpense(input: ExpenseInput) {
  return createClient()
    .from("expenses")
    .insert({
      household_id: input.householdId,
      category_id: input.categoryId || null,
      amount: input.amount,
      description: input.description?.trim() || null,
      spent_on: input.spentOn,
      paid_by: input.paidBy || null,
      shopping_list_id: input.shoppingListId || null,
    })
    .select("id, household_id, category_id, amount, description, spent_on, paid_by, shopping_list_id, created_at, updated_at")
    .single();
}

export async function updateExpense(expenseId: string, input: ExpenseInput) {
  return createClient()
    .from("expenses")
    .update({
      category_id: input.categoryId || null,
      amount: input.amount,
      description: input.description?.trim() || null,
      spent_on: input.spentOn,
      paid_by: input.paidBy || null,
      shopping_list_id: input.shoppingListId || null,
    })
    .eq("id", expenseId)
    .eq("household_id", input.householdId)
    .select("id, household_id, category_id, amount, description, spent_on, paid_by, shopping_list_id, created_at, updated_at")
    .single();
}

export async function deleteExpense(expenseId: string) {
  return createClient().from("expenses").delete().eq("id", expenseId);
}

export async function createExpenseCategory(householdId: string, name: string, color: string) {
  return createClient()
    .from("expense_categories")
    .insert({ household_id: householdId, name: name.trim(), color })
    .select("id, household_id, name, color")
    .single();
}

export function amountToCents(value: number | string | null | undefined) {
  const normalized = String(value ?? "0").replace(",", ".").trim();
  const [whole = "0", decimal = ""] = normalized.split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const absoluteWhole = whole.replace(/^-/, "");
  const cents = Number(`${absoluteWhole || "0"}${decimal.padEnd(2, "0").slice(0, 2)}`);
  return (Number.isFinite(cents) ? cents : 0) * sign;
}

export function centsToAmount(cents: number) {
  const safeCents = Math.max(0, Math.round(cents));
  return `${Math.floor(safeCents / 100)}.${String(safeCents % 100).padStart(2, "0")}`;
}
