"use client";

import { ChevronLeft, ChevronRight, Coffee, Cookie, Moon, Pencil, Plus, Sun, Trash2, Utensils } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddFab, AppNav } from "@/components/app-nav";
import { Button, Drawer, PageHeader, PageSkeleton, Toast } from "@/components/ui/primitives";
import { getHouseholds } from "@/lib/services/households";
import { createClient } from "@/lib/supabase/browser";
import { deleteMealPlan, listMealPlans, upsertMealPlan, type MealPlan, type MealType } from "@/lib/services/meals";
import { dateKey, mondayOf, weekDates } from "@/lib/utils/calendar";

type Household = { id: string; name: string };
type ToastState = { message: string; tone: "success" | "error" | "info" } | null;
type MealForm = { title: string; notes: string; planDate: string; mealType: MealType };

const mealTypes: { type: MealType; label: string; icon: typeof Coffee }[] = [
  { type: "breakfast", label: "Desayuno", icon: Coffee },
  { type: "lunch", label: "Comida", icon: Sun },
  { type: "dinner", label: "Cena", icon: Moon },
  { type: "snack", label: "Merienda", icon: Cookie },
];
const dayFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" });
const weekFormatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });

function todayKey() { return dateKey(new Date()); }

function emptyForm(date: string, mealType: MealType = "breakfast"): MealForm {
  return { title: "", notes: "", planDate: date, mealType };
}

function mealLabel(type: MealType) { return mealTypes.find((meal) => meal.type === type)?.label ?? type; }

export function MealsBoard() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [form, setForm] = useState<MealForm>(() => emptyForm(todayKey()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queryApplied, setQueryApplied] = useState(false);

  const dates = useMemo(() => weekDates(week), [dateKey(week)]);
  const weekKey = dateKey(week);
  const plansByKey = useMemo(() => new Map(plans.map((plan) => [`${plan.plan_date}:${plan.meal_type}`, plan])), [plans]);
  const selectedPlans = mealTypes.map(({ type }) => plansByKey.get(`${selectedDate}:${type}`) ?? null);

  async function refreshWeek(householdId: string, targetWeek: Date = week) {
    const from = dateKey(targetWeek);
    const to = dateKey(new Date(targetWeek.getFullYear(), targetWeek.getMonth(), targetWeek.getDate() + 7));
    const { data, error: planError } = await listMealPlans(householdId, from, to);
    if (planError) setError(planError.message); else setPlans((data ?? []) as MealPlan[]);
  }

  async function loadData() {
    const [{ data: households, error: householdError }] = await Promise.all([getHouseholds()]);
    if (householdError) { setError(householdError.message); setLoading(false); return; }
    const active = (households as Household[] | null)?.[0] ?? null;
    if (!active) { router.replace("/onboarding"); return; }
    setHousehold(active);
    await refreshWeek(active.id);
    setLoading(false);
    if (!queryApplied && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryDate = params.get("date");
      const queryMeal = params.get("meal") as MealType | null;
      if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) setSelectedDate(queryDate);
      if (params.get("new") === "1") {
        const newDate = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : selectedDate;
        const newMeal = queryMeal && mealTypes.some((meal) => meal.type === queryMeal) ? queryMeal : "breakfast";
        setSelectedDate(newDate); setForm(emptyForm(newDate, newMeal)); setEditorOpen(true);
      }
      setQueryApplied(true);
    }
  }

  useEffect(() => { void loadData(); }, [router]);
  useEffect(() => { if (household?.id) void refreshWeek(household.id, week); }, [household?.id, weekKey]);
  useEffect(() => {
    if (!household?.id) return;
    const supabase = createClient();
    const channel = supabase.channel(`meals-${household.id}`).on("postgres_changes", { event: "*", schema: "public", table: "meal_plans", filter: `household_id=eq.${household.id}` }, () => void refreshWeek(household.id, week)).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [household?.id, weekKey]);

  function openCreate(date = selectedDate, mealType: MealType = "breakfast") { setEditingId(null); setForm(emptyForm(date, mealType)); setEditorOpen(true); setError(null); }
  function openEdit(plan: MealPlan) { setEditingId(plan.id); setForm({ title: plan.title, notes: plan.notes ?? "", planDate: plan.plan_date, mealType: plan.meal_type }); setEditorOpen(true); setError(null); }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!household) return;
    if (!form.title.trim()) { setError("El título de la comida es obligatorio."); return; }
    setSaving(true); setError(null);
    const { error: saveError } = await upsertMealPlan({ householdId: household.id, planDate: form.planDate, mealType: form.mealType, title: form.title, notes: form.notes });
    if (saveError) setError(saveError.message);
    else { setEditorOpen(false); setToast({ message: editingId ? "Comida actualizada." : "Comida guardada.", tone: "success" }); await refreshWeek(household.id); }
    setSaving(false);
  }

  async function handleDelete(plan: MealPlan) {
    if (!window.confirm(`¿Eliminar «${plan.title}» de ${mealLabel(plan.meal_type).toLowerCase()}?`)) return;
    const { error: deleteError } = await deleteMealPlan(plan.id);
    if (deleteError) setToast({ message: deleteError.message, tone: "error" });
    else { setToast({ message: "Comida eliminada.", tone: "success" }); setPlans((current) => current.filter((row) => row.id !== plan.id)); }
  }

  function moveWeek(offset: number) {
    const next = new Date(week); next.setDate(next.getDate() + offset * 7); setWeek(next);
    const nextSelected = new Date(next); nextSelected.setDate(nextSelected.getDate() + ((new Date().getDay() + 6) % 7)); setSelectedDate(dateKey(nextSelected));
  }

  async function copyPreviousWeek() {
    if (!household) return;
    if (!window.confirm("¿Copiar las comidas de la semana anterior solo en las franjas vacías?")) return;
    setSaving(true); setError(null);
    const previous = new Date(week); previous.setDate(previous.getDate() - 7);
    const previousRows = await listMealPlans(household.id, dateKey(previous), dateKey(week));
    if (previousRows.error) { setError(previousRows.error.message); setSaving(false); return; }
    const currentKeys = new Set(plans.map((plan) => `${plan.plan_date}:${plan.meal_type}`));
    const copies = ((previousRows.data ?? []) as MealPlan[]).map((plan) => { const offset = Math.round((new Date(`${plan.plan_date}T12:00:00`).getTime() - new Date(`${dateKey(previous)}T12:00:00`).getTime()) / 86400000); const targetDate = dateKey(new Date(week.getFullYear(), week.getMonth(), week.getDate() + offset)); return { ...plan, targetDate }; }).filter((plan) => !currentKeys.has(`${plan.targetDate}:${plan.meal_type}`));
    const results = await Promise.all(copies.map((plan) => upsertMealPlan({ householdId: household.id, planDate: plan.targetDate, mealType: plan.meal_type, title: plan.title, notes: plan.notes ?? "" })));
    const copyError = results.find((result) => result.error)?.error;
    if (copyError) setError(copyError.message); else { setToast({ message: copies.length ? "Semana anterior copiada en las franjas vacías." : "No había franjas nuevas que copiar.", tone: "success" }); await refreshWeek(household.id); }
    setSaving(false);
  }

  function planFor(date: Date, type: MealType) { return plansByKey.get(`${dateKey(date)}:${type}`) ?? null; }

  if (loading) return <><AppNav /><PageSkeleton label="Cargando plan de comidas…" /></>;

  return <><AppNav /><main className="shell page meals-page">
    <PageHeader eyebrow={household?.name ?? "Tu hogar"} title="Plan de comidas" description="Organiza las comidas de la semana." action={<Button onClick={() => openCreate()}><Plus size={18} aria-hidden="true" /> Añadir comida</Button>} />
    {error && <div className="form-error meals-error" role="alert">{error}</div>}
    <div className="meals-toolbar"><button className="button button-quiet icon-button" type="button" aria-label="Semana anterior" onClick={() => moveWeek(-1)}><ChevronLeft size={20} /></button><h2>{weekFormatter.format(dates[0])} – {weekFormatter.format(dates[6])}</h2><button className="button button-quiet icon-button" type="button" aria-label="Semana siguiente" onClick={() => moveWeek(1)}><ChevronRight size={20} /></button><button className="button button-secondary" type="button" onClick={() => { const current = mondayOf(new Date()); setWeek(current); setSelectedDate(todayKey()); }}>Esta semana</button><Button variant="ghost" loading={saving} onClick={() => void copyPreviousWeek()}>Copiar semana anterior</Button></div>
    <div className="meal-day-selector" aria-label="Seleccionar día">{dates.map((date) => { const key = dateKey(date); return <button type="button" className={`${selectedDate === key ? "active" : ""} ${key === todayKey() ? "today" : ""}`} key={key} aria-pressed={selectedDate === key} aria-current={key === todayKey() ? "date" : undefined} onClick={() => setSelectedDate(key)}>{dayFormatter.format(date)}</button>; })}</div>
    <section className="meal-plan-desktop"><div className="meal-grid"><div className="meal-grid-corner"><Utensils size={18} /> Franja</div>{dates.map((date) => <div className={`meal-day-heading ${dateKey(date) === todayKey() ? "today" : ""}`} key={dateKey(date)}>{dayFormatter.format(date)}</div>)}{mealTypes.map(({ type, label, icon: Icon }) => <div className="meal-grid-row" key={type}><div className="meal-row-label"><Icon size={17} /><span>{label}</span></div>{dates.map((date) => { const plan = planFor(date, type); return <button type="button" className={`meal-slot ${plan ? "filled" : "empty"} ${dateKey(date) === todayKey() ? "today" : ""}`} aria-label={`${plan ? "Editar" : "Añadir"} ${label.toLowerCase()} del ${dayFormatter.format(date)}`} key={`${dateKey(date)}-${type}`} onClick={() => plan ? openEdit(plan) : openCreate(dateKey(date), type)}>{plan ? <><strong>{plan.title}</strong>{plan.notes && <small>{plan.notes}</small>}<span className="meal-slot-actions"><Pencil size={13} /></span></> : <Plus size={18} aria-hidden="true" />}</button>; })}</div>)}</div></section>
    <section className={`meal-plan-mobile ${selectedDate === todayKey() ? "today" : ""}`}><div className="meal-mobile-day-heading"><div><p className="eyebrow">{selectedDate === todayKey() ? "Hoy" : "Día seleccionado"}</p><h2>{dayFormatter.format(new Date(`${selectedDate}T12:00:00`))}</h2></div><span className="muted">{selectedPlans.filter(Boolean).length}/4 franjas</span></div><div className="meal-mobile-cards">{mealTypes.map(({ type, label, icon: Icon }, index) => { const plan = selectedPlans[index]; return <article className={`meal-mobile-card ${plan ? "filled" : "empty"}`} key={type}><div className="meal-mobile-icon"><Icon size={18} /></div><div className="meal-mobile-main"><strong>{label}</strong>{plan ? <><span>{plan.title}</span>{plan.notes && <small>{plan.notes}</small>}</> : <span className="muted">Sin planificar</span>}</div>{plan ? <div className="meal-mobile-actions"><button className="button button-quiet icon-button" type="button" aria-label={`Editar ${label}`} onClick={() => openEdit(plan)}><Pencil size={15} /></button><button className="button button-quiet icon-button danger-icon" type="button" aria-label={`Eliminar ${label}`} onClick={() => void handleDelete(plan)}><Trash2 size={15} /></button></div> : <Button className="icon-button" variant="ghost" aria-label={`Añadir ${label.toLowerCase()}`} onClick={() => openCreate(selectedDate, type)}><Plus size={18} aria-hidden="true" /></Button>}</article>; })}</div></section>
    <AddFab href="/meals?new=1" />
    <Drawer open={editorOpen} title={editingId ? "Editar comida" : "Nueva comida"} onClose={() => { if (!saving) setEditorOpen(false); }}><form className="meal-form" onSubmit={handleSubmit}><div className="field"><label htmlFor="meal-title">Título</label><input id="meal-title" required maxLength={150} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Pasta con verduras" /></div><div className="field"><label htmlFor="meal-notes">Notas</label><textarea id="meal-notes" maxLength={2000} rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ingredientes o indicaciones" /></div><div className="form-row"><div className="field"><label htmlFor="meal-date">Día</label><input id="meal-date" type="date" required value={form.planDate} onChange={(event) => setForm((current) => ({ ...current, planDate: event.target.value }))} /></div><div className="field"><label htmlFor="meal-type">Franja</label><select id="meal-type" value={form.mealType} onChange={(event) => setForm((current) => ({ ...current, mealType: event.target.value as MealType }))}>{mealTypes.map((meal) => <option value={meal.type} key={meal.type}>{meal.label}</option>)}</select></div></div><div className="meal-form-actions"><Button variant="ghost" type="button" onClick={() => setEditorOpen(false)}>Cancelar</Button><Button type="submit" loading={saving}>{editingId ? "Guardar cambios" : "Guardar comida"}</Button></div></form></Drawer>
    {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
  </main></>;
}
