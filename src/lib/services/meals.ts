import { createClient } from "@/lib/supabase/browser";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MealPlan = {
  id: string;
  household_id: string;
  plan_date: string;
  meal_type: MealType;
  title: string;
  notes: string | null;
};

export type MealPlanInput = {
  householdId: string;
  planDate: string;
  mealType: MealType;
  title: string;
  notes?: string;
};

export async function listMealPlans(householdId: string, from: string, to: string) {
  return createClient()
    .from("meal_plans")
    .select("id, household_id, plan_date, meal_type, title, notes")
    .eq("household_id", householdId)
    .gte("plan_date", from)
    .lt("plan_date", to)
    .order("plan_date", { ascending: true });
}

export async function upsertMealPlan(input: MealPlanInput) {
  return createClient()
    .from("meal_plans")
    .upsert({
      household_id: input.householdId,
      plan_date: input.planDate,
      meal_type: input.mealType,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
    }, { onConflict: "household_id,plan_date,meal_type" })
    .select("id, household_id, plan_date, meal_type, title, notes")
    .single();
}

export async function deleteMealPlan(mealPlanId: string) {
  return createClient().from("meal_plans").delete().eq("id", mealPlanId);
}
