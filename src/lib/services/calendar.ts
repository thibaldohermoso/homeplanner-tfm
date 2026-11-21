import { createClient } from "@/lib/supabase/browser";

export type CalendarEvent = {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  task_id: string | null;
  created_by: string | null;
};

export type DatedTask = {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
};

export type CalendarEventInput = {
  householdId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  taskId?: string | null;
};

export async function listCalendarEvents(householdId: string, from: string, to: string) {
  return createClient()
    .from("events")
    .select("id, household_id, title, description, starts_at, ends_at, all_day, task_id, created_by")
    .eq("household_id", householdId)
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at", { ascending: true });
}

export async function listDatedTasks(householdId: string, from: string, to: string) {
  return createClient()
    .from("tasks")
    .select("id, title, status, priority, due_date")
    .eq("household_id", householdId)
    .gte("due_date", from)
    .lt("due_date", to)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function createCalendarEvent(input: CalendarEventInput) {
  return createClient()
    .from("events")
    .insert({
      household_id: input.householdId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt || null,
      all_day: input.allDay,
      task_id: input.taskId || null,
    })
    .select("id, household_id, title, description, starts_at, ends_at, all_day, task_id, created_by")
    .single();
}

export async function updateCalendarEvent(eventId: string, input: CalendarEventInput) {
  return createClient()
    .from("events")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt || null,
      all_day: input.allDay,
      task_id: input.taskId || null,
    })
    .eq("id", eventId)
    .eq("household_id", input.householdId)
    .select("id, household_id, title, description, starts_at, ends_at, all_day, task_id, created_by")
    .single();
}

export async function deleteCalendarEvent(eventId: string) {
  return createClient().from("events").delete().eq("id", eventId);
}
