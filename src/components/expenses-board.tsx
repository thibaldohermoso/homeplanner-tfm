"use client";

import { ChevronLeft, ChevronRight, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddFab, AppNav } from "@/components/app-nav";
import { Avatar, Badge, Button, Card, Drawer, EmptyState, Skeleton, Toast } from "@/components/ui/primitives";
import { getHouseholds } from "@/lib/services/households";
import { createClient } from "@/lib/supabase/browser";
import {
  amountToCents,
  centsToAmount,
  createExpense,
  createExpenseCategory,
  deleteExpense,
  listExpenseCategories,
  listExpenseShoppingLists,
  listExpenses,
  updateExpense,
  type Expense,
  type ExpenseCategory,
  type ExpenseMember,
  type ExpenseShoppingList,
} from "@/lib/services/expenses";
import { listHouseholdMembers } from "@/lib/services/tasks";

type Household = { id: string; name: string };
type ToastState = { message: string; tone: "success" | "error" | "info" } | null;
type ExpenseForm = {
  amount: string;
  spentOn: string;
  categoryId: string;
  description: string;
  paidBy: string;
  shoppingListId: string;
};

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthStart(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function nextMonthStart(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return monthStart(next);
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(normalized)) return null;
  const cents = amountToCents(normalized);
  return cents > 0 ? cents : null;
}

function formatMoney(cents: number) {
  return currency.format(cents / 100);
}

function formatDay(date: string) {
  return dayFormatter.format(new Date(`${date}T12:00:00`));
}

function categoryOf(expense: Expense) {
  return Array.isArray(expense.expense_categories) ? expense.expense_categories[0] ?? null : expense.expense_categories ?? null;
}

function personOf(expense: Expense) {
  const profile = Array.isArray(expense.profiles) ? expense.profiles[0] : expense.profiles;
  return profile?.display_name ?? "Sin asignar";
}

function listOf(expense: Expense) {
  return Array.isArray(expense.shopping_lists) ? expense.shopping_lists[0] ?? null : expense.shopping_lists ?? null;
}

function emptyForm(currentUserId: string | null, categories: ExpenseCategory[]) : ExpenseForm {
  return {
    amount: "",
    spentOn: today(),
    categoryId: categories[0]?.id ?? "",
    description: "",
    paidBy: currentUserId ?? "",
    shoppingListId: "",
  };
}

export function ExpensesBoard() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<ExpenseMember[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ExpenseShoppingList[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState<ExpenseForm>(() => emptyForm(null, []));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#64748b");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queryApplied, setQueryApplied] = useState(false);

  const monthKey = monthStart(month);

  async function refreshExpenses(householdId: string, targetMonth: Date = month) {
    const { data, error: expenseError } = await listExpenses(householdId, monthStart(targetMonth), nextMonthStart(targetMonth));
    if (expenseError) setError(expenseError.message);
    else setExpenses((data ?? []) as Expense[]);
  }

  async function loadData() {
    const supabase = createClient();
    const [{ data: households, error: householdError }, { data: userData }] = await Promise.all([getHouseholds(), supabase.auth.getUser()]);
    if (householdError) { setError(householdError.message); setLoading(false); return; }
    const active = (households as Household[] | null)?.[0] ?? null;
    if (!active) { router.replace("/onboarding"); return; }

    setHousehold(active);
    setCurrentUserId(userData.user?.id ?? null);
    const [{ data: memberRows, error: memberError }, { data: categoryRows, error: categoryError }, { data: listRows, error: listError }] = await Promise.all([
      listHouseholdMembers(active.id),
      listExpenseCategories(active.id),
      listExpenseShoppingLists(active.id),
    ]);
    if (memberError) setError(memberError.message);
    if (categoryError) setError(categoryError.message);
    if (listError) setError(listError.message);
    const nextCategories = (categoryRows ?? []) as ExpenseCategory[];
    setMembers((memberRows ?? []) as ExpenseMember[]);
    setCategories(nextCategories);
    setShoppingLists((listRows ?? []) as ExpenseShoppingList[]);
    setForm((current) => ({ ...emptyForm(userData.user?.id ?? null, nextCategories), ...current, paidBy: current.paidBy || userData.user?.id || "" }));
    await refreshExpenses(active.id);
    setLoading(false);

    if (!queryApplied && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("new") === "1") {
        const queryCategory = params.get("category") ?? "";
        const matchingCategory = nextCategories.find((category) => category.id === queryCategory || category.name.toLowerCase() === queryCategory.toLowerCase());
        setForm((current) => ({
          ...current,
          amount: params.get("amount") ?? current.amount,
          description: params.get("description") ?? current.description,
          categoryId: matchingCategory?.id ?? current.categoryId,
          shoppingListId: params.get("list") ?? current.shoppingListId,
        }));
        setEditorOpen(true);
      }
      setQueryApplied(true);
    }
  }

  useEffect(() => { void loadData(); }, [router]);

  useEffect(() => {
    if (household?.id) void refreshExpenses(household.id, month);
  }, [household?.id, monthKey]);

  useEffect(() => {
    if (!household?.id) return;
    const supabase = createClient();
    const channel = supabase.channel(`expenses-${household.id}`).on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `household_id=eq.${household.id}` }, () => {
      void refreshExpenses(household.id, month);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [household?.id, monthKey]);

  const totalCents = useMemo(() => expenses.reduce((total, expense) => total + amountToCents(expense.amount), 0), [expenses]);
  const filteredExpenses = useMemo(() => categoryFilter === "all" ? expenses : expenses.filter((expense) => expense.category_id === categoryFilter), [categoryFilter, expenses]);
  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    filteredExpenses.forEach((expense) => groups.set(expense.spent_on, [...(groups.get(expense.spent_on) ?? []), expense]));
    return [...groups.entries()].map(([date, rows]) => ({ date, rows }));
  }, [filteredExpenses]);
  const categoryTotals = useMemo(() => categories.map((category) => ({ category, cents: expenses.filter((expense) => expense.category_id === category.id).reduce((sum, expense) => sum + amountToCents(expense.amount), 0) })).filter((row) => row.cents > 0).sort((a, b) => b.cents - a.cents), [categories, expenses]);
  const memberTotals = useMemo(() => members.map((member) => ({ member, cents: expenses.filter((expense) => expense.paid_by === member.user_id).reduce((sum, expense) => sum + amountToCents(expense.amount), 0) })).filter((row) => row.cents > 0).sort((a, b) => b.cents - a.cents), [expenses, members]);
  const maxCategoryCents = categoryTotals[0]?.cents ?? 1;

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setCategoryFilter("all");
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(currentUserId, categories));
    setNewCategoryOpen(false);
    setNewCategoryName("");
    setEditorOpen(true);
    setError(null);
  }

  function openEdit(expense: Expense) {
    setEditingId(expense.id);
    setForm({ amount: centsToAmount(amountToCents(expense.amount)), spentOn: expense.spent_on, categoryId: expense.category_id ?? "", description: expense.description ?? "", paidBy: expense.paid_by ?? currentUserId ?? "", shoppingListId: expense.shopping_list_id ?? "" });
    setNewCategoryOpen(false);
    setEditorOpen(true);
    setError(null);
  }

  function closeEditor() {
    if (!saving) setEditorOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!household) return;
    const amountCents = parseAmount(form.amount);
    if (!amountCents) { setError("Introduce un importe válido mayor que cero, con hasta dos decimales."); return; }
    if (!form.spentOn) { setError("Selecciona una fecha."); return; }
    setSaving(true); setError(null);
    let categoryId = form.categoryId || null;
    if (newCategoryOpen) {
      if (!newCategoryName.trim()) { setError("Indica el nombre de la nueva categoría."); setSaving(false); return; }
      const { data: category, error: categoryError } = await createExpenseCategory(household.id, newCategoryName, newCategoryColor);
      if (categoryError) { setError(categoryError.message); setSaving(false); return; }
      if (category) {
        categoryId = category.id;
        setCategories((current) => [...current, category as ExpenseCategory].sort((a, b) => a.name.localeCompare(b.name, "es")));
      }
    }
    const input = { householdId: household.id, categoryId, amount: centsToAmount(amountCents), description: form.description, spentOn: form.spentOn, paidBy: form.paidBy || currentUserId, shoppingListId: form.shoppingListId || null };
    const result = editingId ? await updateExpense(editingId, input) : await createExpense(input);
    if (result.error) setError(result.error.message);
    else {
      setEditorOpen(false);
      setToast({ message: editingId ? "Gasto actualizado." : "Gasto añadido.", tone: "success" });
      await refreshExpenses(household.id);
    }
    setSaving(false);
  }

  async function handleDelete(expense: Expense) {
    if (!window.confirm(`¿Eliminar el gasto de ${formatMoney(amountToCents(expense.amount))}?`)) return;
    const { error: deleteError } = await deleteExpense(expense.id);
    if (deleteError) setToast({ message: deleteError.message, tone: "error" });
    else { setToast({ message: "Gasto eliminado.", tone: "success" }); setExpenses((current) => current.filter((row) => row.id !== expense.id)); }
  }

  if (loading) return <><AppNav /><main className="shell page"><div className="expenses-loading"><Skeleton width="220px" /><Skeleton width="100%" /><Skeleton width="100%" /></div></main></>;

  return <><AppNav /><main className="shell page expenses-page">
    <div className="page-header expenses-header"><div><p className="eyebrow">{household?.name ?? "Tu hogar"}</p><h1>Gastos</h1><p className="muted">Controla los gastos comunes y quién los ha pagado.</p></div><Button onClick={openCreate}><Plus size={17} aria-hidden="true" /> Añadir gasto</Button></div>
    {error && <div className="form-error expenses-error" role="alert">{error}</div>}
    <section className="expenses-month-nav" aria-label="Navegador de mes"><button className="button button-quiet icon-button" type="button" aria-label="Mes anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={20} /></button><div><strong>{monthFormatter.format(month)}</strong><button className="link current-month-button" type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Mes actual</button></div><button className="button button-quiet icon-button" type="button" aria-label="Mes siguiente" onClick={() => changeMonth(1)}><ChevronRight size={20} /></button></section>
    <section className="expenses-summary-grid"><Card className="expense-total-card"><p className="stat-label">Total del mes</p><strong className="expense-total">{formatMoney(totalCents)}</strong><span className="muted">{expenses.length} {expenses.length === 1 ? "gasto registrado" : "gastos registrados"}</span></Card><Card><div className="panel-header"><div><h2>Por categoría</h2><p className="muted" style={{ marginBottom: 0 }}>Distribución del mes.</p></div></div>{categoryTotals.length === 0 ? <p className="muted expense-summary-empty">Sin gastos categorizados.</p> : <div className="category-bars">{categoryTotals.map(({ category, cents }) => <div className="category-bar-row" key={category.id}><div className="category-bar-label"><span className="category-dot" style={{ background: category.color }} /> <span>{category.name}</span><strong>{formatMoney(cents)}</strong></div><div className="category-bar-track"><span style={{ width: `${Math.max(7, (cents / maxCategoryCents) * 100)}%`, background: category.color }} /></div></div>)}</div>}</Card><Card><div className="panel-header"><div><h2>Pagado por</h2><p className="muted" style={{ marginBottom: 0 }}>Aportación de cada miembro.</p></div></div>{memberTotals.length === 0 ? <p className="muted expense-summary-empty">Sin pagos registrados.</p> : <div className="member-totals">{memberTotals.map(({ member, cents }) => { const name = member.profiles?.[0]?.display_name ?? "Usuario"; return <div className="member-total" key={member.user_id}><Avatar name={name} size="sm" /><span>{name}</span><strong>{formatMoney(cents)}</strong></div>; })}</div>}</Card></section>
    <section className="expense-filters" aria-label="Filtrar por categoría"><button type="button" className={`filter-chip ${categoryFilter === "all" ? "active" : ""}`} aria-pressed={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>Todos</button>{categories.map((category) => <button type="button" className={`filter-chip ${categoryFilter === category.id ? "active" : ""}`} aria-pressed={categoryFilter === category.id} key={category.id} onClick={() => setCategoryFilter(category.id)}><span className="category-dot" style={{ background: category.color }} />{category.name}</button>)}</section>
    <section className="expense-list-panel"><div className="panel-header"><div><h2>Movimientos</h2><p className="muted" style={{ marginBottom: 0 }}>{filteredExpenses.length} {filteredExpenses.length === 1 ? "resultado" : "resultados"}</p></div></div>{groupedExpenses.length === 0 ? <EmptyState icon={<Receipt size={32} />} title="No hay gastos en este periodo" description="Añade el primer gasto para empezar a controlar el presupuesto." action={<Button onClick={openCreate}><Plus size={16} /> Añadir gasto</Button>} /> : <div className="expense-groups">{groupedExpenses.map(({ date, rows }) => <div className="expense-day" key={date}><h3>{formatDay(date)}</h3><div className="expense-rows">{rows.map((expense) => { const category = categoryOf(expense); const person = personOf(expense); const shoppingList = listOf(expense); return <article className="expense-row" key={expense.id}><span className="expense-category-icon" style={{ background: category?.color ?? "#64748b" }}><Receipt size={17} aria-hidden="true" /></span><div className="expense-row-main"><div className="expense-row-title"><strong>{expense.description || category?.name || "Gasto"}</strong>{shoppingList && <Badge tone="info">Compra: {shoppingList.name}</Badge>}</div><div className="expense-row-meta"><span>{category?.name ?? "Sin categoría"}</span><span className="expense-payer"><Avatar name={person} size="sm" />{person}</span></div></div><strong className="expense-row-amount">{formatMoney(amountToCents(expense.amount))}</strong><div className="expense-row-actions"><button className="button button-quiet icon-button" type="button" aria-label={`Editar gasto de ${formatMoney(amountToCents(expense.amount))}`} onClick={() => openEdit(expense)}><Pencil size={16} /></button><button className="button button-quiet icon-button danger-icon" type="button" aria-label={`Eliminar gasto de ${formatMoney(amountToCents(expense.amount))}`} onClick={() => void handleDelete(expense)}><Trash2 size={16} /></button></div></article>; })}</div></div>)}</div>}</section>
    <AddFab href="/expenses?new=1" />
    <Drawer open={editorOpen} title={editingId ? "Editar gasto" : "Nuevo gasto"} onClose={closeEditor}><form className="expense-form" onSubmit={handleSubmit}><div className="field"><label htmlFor="expense-amount">Importe (€)</label><input id="expense-amount" required inputMode="decimal" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0,00" /></div><div className="form-row"><div className="field"><label htmlFor="expense-date">Fecha</label><input id="expense-date" required type="date" value={form.spentOn} onChange={(event) => setForm((current) => ({ ...current, spentOn: event.target.value }))} /></div><div className="field"><label htmlFor="expense-category">Categoría</label><select id="expense-category" value={form.categoryId} disabled={newCategoryOpen} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}><option value="">Sin categoría</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div></div><div className="category-create-toggle"><button className="link" type="button" onClick={() => setNewCategoryOpen((current) => !current)}>{newCategoryOpen ? "Usar una categoría existente" : "+ Crear categoría nueva"}</button></div>{newCategoryOpen && <div className="new-category-fields"><div className="field"><label htmlFor="new-category-name">Nombre de categoría</label><input id="new-category-name" maxLength={60} value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Ej. Mascotas" /></div><div className="field"><label htmlFor="new-category-color">Color</label><input id="new-category-color" type="color" value={newCategoryColor} onChange={(event) => setNewCategoryColor(event.target.value)} /></div></div>}<div className="field"><label htmlFor="expense-description">Descripción</label><input id="expense-description" maxLength={200} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ej. Compra semanal" /></div><div className="field"><label htmlFor="expense-paid-by">Pagado por</label><select id="expense-paid-by" value={form.paidBy} onChange={(event) => setForm((current) => ({ ...current, paidBy: event.target.value }))}><option value="">Sin asignar</option>{members.map((member) => <option value={member.user_id} key={member.user_id}>{member.profiles?.[0]?.display_name ?? "Usuario"}</option>)}</select></div><div className="field"><label htmlFor="expense-shopping-list">Lista de compra <span className="muted">(opcional)</span></label><select id="expense-shopping-list" value={form.shoppingListId} onChange={(event) => setForm((current) => ({ ...current, shoppingListId: event.target.value }))}><option value="">Sin vincular</option>{shoppingLists.map((list) => <option value={list.id} key={list.id}>{list.name}</option>)}</select></div><div className="expense-form-actions"><Button variant="ghost" type="button" onClick={closeEditor}>Cancelar</Button><Button type="submit" loading={saving}>{editingId ? "Guardar cambios" : "Añadir gasto"}</Button></div></form></Drawer>
    {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
  </main></>;
}
