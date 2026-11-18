import { createClient } from "@/lib/supabase/browser";

export type TaskStatus = "pending" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type TaskInput = {
  householdId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  assignedTo?: string;
};

export async function listTasks(householdId: string) {
  const supabase = createClient();
  return supabase
    .from("tasks")
    .select("id, household_id, title, description, status, priority, assigned_to, due_date, completed_at, created_at, profiles:assigned_to(display_name)")
    .eq("household_id", householdId)
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
}

export async function listHouseholdMembers(householdId: string) {
  const supabase = createClient();
  return supabase
    .from("household_members")
    .select("user_id, role, profiles(display_name)")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });
}

export async function createTask(input: TaskInput) {
  const supabase = createClient();
  return supabase.from("tasks").insert({
    household_id: input.householdId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    priority: input.priority,
    due_date: input.dueDate || null,
    assigned_to: input.assignedTo || null,
  }).select().single();
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = createClient();
  return supabase.from("tasks").update({ status }).eq("id", taskId).select().single();
}

export async function deleteTask(taskId: string) {
  const supabase = createClient();
  return supabase.from("tasks").delete().eq("id", taskId);
}
