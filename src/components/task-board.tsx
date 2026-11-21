"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AddFab, AppNav } from "@/components/app-nav";
import { Button, ConfirmDialog, Drawer, Toast } from "@/components/ui/primitives";
import { getHouseholds } from "@/lib/services/households";
import { createClient } from "@/lib/supabase/browser";
import { createTask, deleteTask, listHouseholdMembers, listTasks, translateTaskError, updateTask, updateTaskStatus, type TaskPriority, type TaskStatus } from "@/lib/services/tasks";

type Household = { id: string; name: string };
type Member = { user_id: string; profiles?: { display_name: string }[] | null };
type Task = { id: string; title: string; description: string | null; status: TaskStatus; priority: TaskPriority; assigned_to: string | null; due_date: string | null; profiles?: { display_name: string }[] | null };
type TaskForm = { title: string; description: string; priority: TaskPriority; dueDate: string; assignedTo: string };
type ToastState = { message: string; tone: "success" | "error" | "info" } | null;

const priorityLabels: Record<TaskPriority, string> = { low: "Baja", medium: "Media", high: "Alta" };

function formatDate(date: string | null) {
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function taskForm(task: Task): TaskForm {
  return { title: task.title, description: task.description ?? "", priority: task.priority, dueDate: task.due_date ?? "", assignedTo: task.assigned_to ?? "" };
}

export function TaskBoard() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [editForm, setEditForm] = useState<TaskForm>({ title: "", description: "", priority: "medium", dueDate: "", assignedTo: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function refreshTasks(householdId: string) {
    const { data, error: taskError } = await listTasks(householdId);
    if (taskError) setError(translateTaskError(taskError.message));
    else setTasks((data ?? []) as Task[]);
  }

  async function loadData() {
    const [{ data: households, error: householdError }] = await Promise.all([getHouseholds()]);
    if (householdError) { setError("No se han podido cargar las tareas del hogar."); setLoading(false); return; }
    const active = (households as Household[] | null)?.[0] ?? null;
    if (!active) { router.replace("/onboarding"); return; }
    setHousehold(active);
    const [{ data: taskRows, error: taskError }, { data: memberRows, error: memberError }] = await Promise.all([listTasks(active.id), listHouseholdMembers(active.id)]);
    if (taskError) setError(translateTaskError(taskError.message));
    if (memberError) setError("No se han podido cargar los miembros del hogar.");
    setTasks((taskRows ?? []) as Task[]);
    setMembers((memberRows ?? []) as Member[]);
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [router]);

  useEffect(() => {
    if (!household?.id) return;
    const supabase = createClient();
    const channel = supabase.channel(`tasks-${household.id}`).on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${household.id}` }, () => void refreshTasks(household.id)).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [household?.id]);

  const visibleTasks = useMemo(() => filter === "all" ? tasks : tasks.filter((task) => task.status === filter), [filter, tasks]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!household || !title.trim()) return;
    setSaving(true); setError(null);
    const { error: createError } = await createTask({ householdId: household.id, title, description, priority, dueDate, assignedTo });
    if (createError) setError(translateTaskError(createError.message));
    else { setTitle(""); setDescription(""); setPriority("medium"); setDueDate(""); setAssignedTo(""); await refreshTasks(household.id); setToast({ message: "Tarea creada.", tone: "success" }); }
    setSaving(false);
  }

  async function handleEdit(event: FormEvent) {
    event.preventDefault();
    if (!household || !editingId || !editForm.title.trim()) return;
    setSaving(true); setError(null);
    const { error: updateError } = await updateTask(editingId, { householdId: household.id, title: editForm.title, description: editForm.description, priority: editForm.priority, dueDate: editForm.dueDate, assignedTo: editForm.assignedTo });
    if (updateError) setError(translateTaskError(updateError.message));
    else { setEditingId(null); await refreshTasks(household.id); setToast({ message: "Tarea actualizada.", tone: "success" }); }
    setSaving(false);
  }

  async function handleStatus(taskId: string, status: TaskStatus) {
    setError(null);
    const { error: updateError } = await updateTaskStatus(taskId, status);
    if (updateError) setError(translateTaskError(updateError.message));
    else if (household) await refreshTasks(household.id);
  }

  async function handleDeleteConfirmed() {
    if (!confirmTask) return;
    setDeleting(true);
    const { error: deleteError } = await deleteTask(confirmTask.id);
    if (deleteError) setError(translateTaskError(deleteError.message));
    else { setTasks((current) => current.filter((row) => row.id !== confirmTask.id)); setToast({ message: "Tarea eliminada.", tone: "success" }); }
    setDeleting(false);
    setConfirmTask(null);
  }

  if (loading) return <main className="loading">Cargando tareas…</main>;

  return <><AppNav /><main className="shell page"><div className="page-header"><div><p className="eyebrow">{household?.name ?? "Tu hogar"}</p><h1>Tareas</h1><p className="muted">Organiza las responsabilidades del hogar y su seguimiento.</p></div><Link className="button button-secondary" href="/dashboard">Volver al inicio</Link></div>
    {error && <div className="form-error task-error" role="alert">{error}</div>}
    <div className="task-layout">
      <section className="panel"><div className="panel-header"><div><h2>Nueva tarea</h2><p className="muted" style={{ marginBottom: 0 }}>Añade una responsabilidad para el hogar.</p></div></div><form className="form" onSubmit={handleCreate}><div className="field"><label htmlFor="task-title">Título</label><input id="task-title" required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Limpiar la cocina" /></div><div className="field"><label htmlFor="task-description">Descripción</label><textarea id="task-description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Detalles opcionales" rows={3} /></div><div className="form-row"><div className="field"><label htmlFor="task-priority">Prioridad</label><select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></div><div className="field"><label htmlFor="task-date">Fecha límite</label><input id="task-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div></div><div className="field"><label htmlFor="task-assignee">Asignar a</label><select id="task-assignee" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}><option value="">Sin asignar</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.profiles?.[0]?.display_name ?? "Usuario"}</option>)}</select></div><button className="button button-primary" disabled={saving}>{saving ? "Guardando…" : "Añadir tarea"}</button></form></section>
      <section className="panel"><div className="panel-header"><div><h2>Mis tareas</h2><p className="muted" style={{ marginBottom: 0 }}>{tasks.length} tareas en este hogar.</p></div><select className="filter-select" aria-label="Filtrar tareas" value={filter} onChange={(event) => setFilter(event.target.value as "all" | TaskStatus)}><option value="all">Todas</option><option value="pending">Pendientes</option><option value="in_progress">En curso</option><option value="done">Completadas</option></select></div>{visibleTasks.length === 0 ? <div className="empty">No hay tareas en este filtro.</div> : <div className="task-list">{visibleTasks.map((task) => <article className={`task-item priority-${task.priority} status-${task.status}`} key={task.id}><div className="task-main"><div className="task-title-row"><h3>{task.title}</h3><span className={`priority-badge priority-${task.priority}`}>{priorityLabels[task.priority]}</span></div>{task.description && <p>{task.description}</p>}<div className="task-meta"><span>{formatDate(task.due_date)}</span>{task.profiles?.[0]?.display_name && <span>Asignada a {task.profiles[0].display_name}</span>}</div></div><div className="task-actions"><select aria-label={`Estado de ${task.title}`} value={task.status} onChange={(event) => void handleStatus(task.id, event.target.value as TaskStatus)}><option value="pending">Pendiente</option><option value="in_progress">En curso</option><option value="done">Completada</option></select><div className="task-action-buttons"><button className="button button-quiet" type="button" onClick={() => { setEditingId(task.id); setEditForm(taskForm(task)); setError(null); }} aria-label={`Editar ${task.title}`}><Pencil size={16} /> Editar</button><button className="button button-quiet delete-button" type="button" onClick={() => setConfirmTask(task)} aria-label={`Eliminar ${task.title}`}><Trash2 size={16} /> Eliminar</button></div></div></article>)}</div>}</section>
    </div><AddFab href="#task-title" />
    <Drawer open={Boolean(editingId)} title="Editar tarea" onClose={() => { if (!saving) setEditingId(null); }}><form className="form task-edit-form" onSubmit={handleEdit}><div className="field"><label htmlFor="edit-task-title">Título</label><input id="edit-task-title" required maxLength={200} value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} /></div><div className="field"><label htmlFor="edit-task-description">Descripción</label><textarea id="edit-task-description" maxLength={2000} rows={3} value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} /></div><div className="form-row"><div className="field"><label htmlFor="edit-task-priority">Prioridad</label><select id="edit-task-priority" value={editForm.priority} onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></div><div className="field"><label htmlFor="edit-task-date">Fecha límite</label><input id="edit-task-date" type="date" value={editForm.dueDate} onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))} /></div></div><div className="field"><label htmlFor="edit-task-assignee">Asignar a</label><select id="edit-task-assignee" value={editForm.assignedTo} onChange={(event) => setEditForm((current) => ({ ...current, assignedTo: event.target.value }))}><option value="">Sin asignar</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.profiles?.[0]?.display_name ?? "Usuario"}</option>)}</select></div><div className="task-edit-actions"><Button type="button" variant="ghost" onClick={() => setEditingId(null)} disabled={saving}>Cancelar</Button><Button type="submit" loading={saving}>Guardar cambios</Button></div></form></Drawer>
    <ConfirmDialog open={Boolean(confirmTask)} title="Eliminar tarea" message={confirmTask ? `¿Quieres eliminar «${confirmTask.title}»? Esta acción no se puede deshacer.` : ""} confirmLabel="Eliminar" onClose={() => setConfirmTask(null)} onConfirm={() => void handleDeleteConfirmed()} loading={deleting} />
    {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
  </main></>;
}
