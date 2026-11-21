"use client";

import Link from "next/link";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddFab, AppNav } from "@/components/app-nav";
import { Button, Drawer, EmptyState, Skeleton, Toast } from "@/components/ui/primitives";
import { getHouseholds } from "@/lib/services/households";
import { createClient } from "@/lib/supabase/browser";
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, listDatedTasks, updateCalendarEvent, type CalendarEvent, type DatedTask } from "@/lib/services/calendar";

type Household = { id: string; name: string };
type ToastState = { message: string; tone: "success" | "error" | "info" } | null;
type EventForm = { title: string; description: string; startsAt: string; endsAt: string; allDay: boolean; taskId: string };

const madridZone = "Europe/Madrid";
const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: madridZone });
const dateFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: madridZone });
const timeFormatter = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: madridZone });
const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayKey() {
  return dateKey(new Date());
}

function dateKeyFromIso(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: madridZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isoForMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

function dateTimeLocalForIso(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isoForDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function emptyForm(selectedDate: string): EventForm {
  return { title: "", description: "", startsAt: `${selectedDate}T09:00`, endsAt: `${selectedDate}T10:00`, allDay: false, taskId: "" };
}

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((mondayOffset + last.getDate()) / 7) * 7;
  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - mondayOffset + 1;
    return day < 1 || day > last.getDate() ? null : new Date(month.getFullYear(), month.getMonth(), day);
  });
}

export function CalendarBoard() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<DatedTask[]>([]);
  const [form, setForm] = useState<EventForm>(() => emptyForm(todayKey()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queryApplied, setQueryApplied] = useState(false);

  const monthKey = dateKey(month);
  const cells = useMemo(() => monthCells(month), [monthKey]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => map.set(dateKeyFromIso(event.starts_at), [...(map.get(dateKeyFromIso(event.starts_at)) ?? []), event]));
    return map;
  }, [events]);
  const tasksByDay = useMemo(() => {
    const map = new Map<string, DatedTask[]>();
    tasks.forEach((task) => { if (task.due_date) map.set(task.due_date, [...(map.get(task.due_date) ?? []), task]); });
    return map;
  }, [tasks]);
  const selectedEvents = eventsByDay.get(selectedDate) ?? [];
  const selectedTasks = tasksByDay.get(selectedDate) ?? [];

  async function refreshMonth(householdId: string, targetMonth: Date = month) {
    const fromDate = dateKey(targetMonth);
    const toDate = dateKey(new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1));
    const [{ data: eventRows, error: eventError }, { data: taskRows, error: taskError }] = await Promise.all([
      listCalendarEvents(householdId, isoForMonth(targetMonth), isoForMonth(new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1))),
      listDatedTasks(householdId, fromDate, toDate),
    ]);
    if (eventError) setError(eventError.message); else setEvents((eventRows ?? []) as CalendarEvent[]);
    if (taskError) setError(taskError.message); else setTasks((taskRows ?? []) as DatedTask[]);
  }

  async function loadData() {
    const [{ data: households, error: householdError }] = await Promise.all([getHouseholds()]);
    if (householdError) { setError(householdError.message); setLoading(false); return; }
    const active = (households as Household[] | null)?.[0] ?? null;
    if (!active) { router.replace("/onboarding"); return; }
    setHousehold(active);
    await refreshMonth(active.id);
    setLoading(false);
    if (!queryApplied && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryDate = params.get("date");
      if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) setSelectedDate(queryDate);
      if (params.get("new") === "1") {
        const newDate = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : selectedDate;
        setSelectedDate(newDate);
        setForm(emptyForm(newDate));
        setEditorOpen(true);
      }
      setQueryApplied(true);
    }
  }

  useEffect(() => { void loadData(); }, [router]);
  useEffect(() => { if (household?.id) void refreshMonth(household.id, month); }, [household?.id, monthKey]);
  useEffect(() => {
    if (!household?.id) return;
    const supabase = createClient();
    const channel = supabase.channel(`calendar-${household.id}`).on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `household_id=eq.${household.id}` }, () => void refreshMonth(household.id, month)).on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${household.id}` }, () => void refreshMonth(household.id, month)).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [household?.id, monthKey]);

  function selectDate(key: string) {
    setSelectedDate(key);
    if ((eventsByDay.get(key) ?? []).length === 0 && (tasksByDay.get(key) ?? []).length === 0) openCreate(key);
  }

  function handleCellKey(event: KeyboardEvent<HTMLDivElement>, key: string) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectDate(key); }
  }

  function openCreate(date = selectedDate) {
    setEditingId(null); setForm(emptyForm(date)); setEditorOpen(true); setError(null);
  }

  function openEdit(event: CalendarEvent) {
    setEditingId(event.id); setForm({ title: event.title, description: event.description ?? "", startsAt: dateTimeLocalForIso(event.starts_at), endsAt: dateTimeLocalForIso(event.ends_at), allDay: event.all_day, taskId: event.task_id ?? "" }); setEditorOpen(true); setError(null);
  }

  async function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    if (!household) return;
    if (!form.title.trim()) { setError("El título del evento es obligatorio."); return; }
    if (!form.startsAt) { setError("Selecciona la fecha y hora de inicio."); return; }
    if (!form.allDay && form.endsAt && form.endsAt < form.startsAt) { setError("La fecha de fin debe ser posterior o igual al inicio."); return; }
    setSaving(true); setError(null);
    const startsAt = form.allDay ? isoForDateTimeLocal(`${form.startsAt.slice(0, 10)}T00:00`) : isoForDateTimeLocal(form.startsAt);
    const endsAt = form.allDay ? null : isoForDateTimeLocal(form.endsAt);
    const input = { householdId: household.id, title: form.title, description: form.description, startsAt: startsAt ?? "", endsAt, allDay: form.allDay, taskId: form.taskId || null };
    const result = editingId ? await updateCalendarEvent(editingId, input) : await createCalendarEvent(input);
    if (result.error) setError(result.error.message);
    else { setEditorOpen(false); setToast({ message: editingId ? "Evento actualizado." : "Evento creado.", tone: "success" }); await refreshMonth(household.id); }
    setSaving(false);
  }

  async function handleDelete(event: CalendarEvent) {
    if (!window.confirm(`¿Eliminar el evento «${event.title}»?`)) return;
    const { error: deleteError } = await deleteCalendarEvent(event.id);
    if (deleteError) setToast({ message: deleteError.message, tone: "error" });
    else { setToast({ message: "Evento eliminado.", tone: "success" }); setEvents((current) => current.filter((row) => row.id !== event.id)); }
  }

  function moveMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(dateKey(next));
  }

  if (loading) return <><AppNav /><main className="shell page"><div className="calendar-loading"><Skeleton width="220px" /><Skeleton width="100%" /><Skeleton width="100%" /></div></main></>;

  return <><AppNav /><main className="shell page calendar-page">
    <div className="page-header calendar-header"><div><p className="eyebrow">{household?.name ?? "Tu hogar"}</p><h1>Calendario</h1><p className="muted">Eventos y tareas con fecha, coordinados en un solo lugar.</p></div><Button onClick={() => openCreate()}><Plus size={17} aria-hidden="true" /> Nuevo evento</Button></div>
    {error && <div className="form-error calendar-error" role="alert">{error}</div>}
    <div className="calendar-toolbar"><button className="button button-quiet icon-button" type="button" aria-label="Mes anterior" onClick={() => moveMonth(-1)}><ChevronLeft size={20} /></button><h2>{monthFormatter.format(month)}</h2><button className="button button-quiet icon-button" type="button" aria-label="Mes siguiente" onClick={() => moveMonth(1)}><ChevronRight size={20} /></button><button className="button button-secondary today-button" type="button" onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(todayKey()); }}>Hoy</button></div>
    <section className="calendar-grid-wrap"><div className="calendar-weekdays" role="row">{weekDays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid" role="grid">{cells.map((date, index) => { if (!date) return <div className="calendar-cell calendar-cell-empty" key={`empty-${index}`} />; const key = dateKey(date); const dayEvents = eventsByDay.get(key) ?? []; const dayTasks = tasksByDay.get(key) ?? []; const isToday = key === todayKey(); return <div className={`calendar-cell ${key === selectedDate ? "selected" : ""} ${isToday ? "today" : ""}`} role="gridcell" tabIndex={0} key={key} onClick={() => selectDate(key)} onKeyDown={(event) => handleCellKey(event, key)}><button className="calendar-day-number" type="button" onClick={(event) => { event.stopPropagation(); selectDate(key); }}>{date.getDate()}</button><div className="calendar-cell-items">{dayEvents.slice(0, 3).map((event) => <button className="calendar-event" type="button" key={event.id} onClick={(clickEvent) => { clickEvent.stopPropagation(); openEdit(event); }}><span className="calendar-event-dot" />{event.title}</button>)}{dayTasks.slice(0, 2).map((task) => <Link className="calendar-task" href="/tasks" key={task.id} onClick={(clickEvent) => clickEvent.stopPropagation()}><Check size={12} />{task.title}</Link>)}</div><div className="calendar-mobile-dots" aria-hidden="true">{dayEvents.length > 0 && <span className="event-dot" />}{dayTasks.length > 0 && <span className="task-dot" />}</div></div>; })}</div></section>
    <section className="calendar-agenda"><div className="panel-header"><div><h2>Agenda del {dateFormatter.format(new Date(`${selectedDate}T12:00:00`))}</h2><p className="muted" style={{ marginBottom: 0 }}>{selectedEvents.length + selectedTasks.length} elementos</p></div><Button variant="secondary" onClick={() => openCreate(selectedDate)}><Plus size={16} /> Añadir</Button></div>{selectedEvents.length === 0 && selectedTasks.length === 0 ? <EmptyState icon={<CalendarDays size={30} />} title="Día despejado" description="No hay eventos ni tareas con fecha para este día." /> : <div className="agenda-list">{selectedEvents.map((event) => <article className="agenda-item" key={event.id}><span className="agenda-icon event-agenda-icon"><CalendarDays size={17} /></span><div><strong>{event.title}</strong><span>{event.all_day ? "Todo el día" : timeFormatter.format(new Date(event.starts_at))}{event.description ? ` · ${event.description}` : ""}</span></div><div className="agenda-actions"><button className="button button-quiet icon-button" type="button" aria-label={`Editar ${event.title}`} onClick={() => openEdit(event)}><Pencil size={15} /></button><button className="button button-quiet icon-button danger-icon" type="button" aria-label={`Eliminar ${event.title}`} onClick={() => void handleDelete(event)}><Trash2 size={15} /></button></div></article>)}{selectedTasks.map((task) => <Link className="agenda-item task-agenda-item" href="/tasks" key={task.id}><span className="agenda-icon task-agenda-icon"><Check size={17} /></span><div><strong>{task.title}</strong><span>Tarea con fecha · {task.status === "done" ? "Completada" : "Pendiente"}</span></div><span className="link">Ver tarea</span></Link>)}</div>}</section>
    <AddFab href="/calendar?new=1" />
    <Drawer open={editorOpen} title={editingId ? "Editar evento" : "Nuevo evento"} onClose={() => { if (!saving) setEditorOpen(false); }}><form className="calendar-form" onSubmit={handleSubmit}><div className="field"><label htmlFor="event-title">Título</label><input id="event-title" required maxLength={200} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Reunión del hogar" /></div><div className="field"><label htmlFor="event-description">Descripción</label><textarea id="event-description" maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Detalles opcionales" /></div><label className="checkbox"><input type="checkbox" checked={form.allDay} onChange={(event) => setForm((current) => ({ ...current, allDay: event.target.checked }))} /><span>{form.allDay ? <Check size={14} /> : null}</span>Todo el día</label><div className="form-row"><div className="field"><label htmlFor="event-start">Inicio</label><input id="event-start" required type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} /></div><div className="field"><label htmlFor="event-end">Fin</label><input id="event-end" type="datetime-local" disabled={form.allDay} value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} /></div></div><div className="field"><label htmlFor="event-task">Tarea enlazada <span className="muted">(opcional)</span></label><select id="event-task" value={form.taskId} onChange={(event) => setForm((current) => ({ ...current, taskId: event.target.value }))}><option value="">Sin tarea enlazada</option>{tasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></div><div className="calendar-form-actions"><Button variant="ghost" type="button" onClick={() => setEditorOpen(false)}>Cancelar</Button><Button type="submit" loading={saving}>{editingId ? "Guardar cambios" : "Crear evento"}</Button></div></form></Drawer>
    {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
  </main></>;
}
