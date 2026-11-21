"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckSquare, ShoppingBasket, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { getHouseholds } from "@/lib/services/households";
import { amountToCents, listExpenses } from "@/lib/services/expenses";
import { listMealPlans } from "@/lib/services/meals";
import { AppNav, MealsLink } from "@/components/app-nav";

type Household = { id: string; name: string; invite_code: string; created_by: string };
type Member = { user_id: string; role: "owner" | "member"; profiles?: { display_name: string }[] | null };
const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
function formatMoney(cents: number) { return currency.format(cents / 100); }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function mealTypeLabel(type: string) { return ({ breakfast: "Desayuno", lunch: "Comida", dinner: "Cena", snack: "Merienda" } as Record<string, string>)[type] ?? type; }

export function Dashboard() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState({ tasks: 0, shopping: 0, expenseTotalCents: 0, events: 0 });
  const [todayMeals, setTodayMeals] = useState<{ meal_type: string; title: string; notes: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: userData }, { data: households, error: householdError }] = await Promise.all([supabase.auth.getUser(), getHouseholds()]);
      if (userData.user) setEmail(userData.user.email ?? "");
      if (householdError) { setLoading(false); return; }
      const active = (households as Household[] | null)?.[0] ?? null;
      if (!active) { router.replace("/onboarding"); return; }
      setHousehold(active);
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const [{ data: memberRows }, tasks, shopping, expenses, events, meals] = await Promise.all([
        supabase.from("household_members").select("user_id, role, profiles(display_name)").eq("household_id", active.id),
        supabase.from("tasks").select("id").eq("household_id", active.id).neq("status", "done"),
        supabase.from("shopping_items").select("id").eq("household_id", active.id).eq("is_checked", false),
        listExpenses(active.id, monthStart, nextMonthStart),
        supabase.from("events").select("id").eq("household_id", active.id).gte("starts_at", now.toISOString()).lt("starts_at", new Date(now.getTime() + 7 * 86400000).toISOString()),
        listMealPlans(active.id, localDateKey(now), localDateKey(tomorrow)),
      ]);
      setMembers((memberRows ?? []) as Member[]);
      setTodayMeals((meals.data ?? []) as { meal_type: string; title: string; notes: string | null }[]);
      const expenseTotalCents = (expenses.data ?? []).reduce((total, expense) => total + amountToCents(expense.amount), 0);
      setStats({ tasks: tasks.data?.length ?? 0, shopping: shopping.data?.length ?? 0, expenseTotalCents, events: events.data?.length ?? 0 });
      setLoading(false);
    }
    void load();
  }, [router]);

  async function copyInvite() { if (!household) return; await navigator.clipboard.writeText(household.invite_code); setCopied(true); setTimeout(() => setCopied(false), 1600); }

  if (loading) return <main className="loading">Cargando tu hogar…</main>;
  if (!household) return null;

  const statCards = [
    { href: "/tasks", label: "Tareas pendientes", value: stats.tasks, icon: CheckSquare, tone: "teal", empty: "Todo al día" },
    { href: "/shopping", label: "Artículos por comprar", value: stats.shopping, icon: ShoppingBasket, tone: "amber", empty: "Lista vacía" },
    { href: "/expenses", label: "Gastos registrados", value: formatMoney(stats.expenseTotalCents), icon: Wallet, tone: "violet", empty: "Sin gastos este mes", isEmpty: stats.expenseTotalCents === 0 },
    { href: "/calendar", label: "Próximos eventos", value: stats.events, icon: CalendarDays, tone: "blue", empty: "Agenda despejada" },
  ];

  return <>
    <AppNav /><main className="shell page"><div className="page-header"><div><p className="eyebrow">Tu hogar</p><h1>{household.name}</h1><p className="muted">Una vista rápida de lo que necesita atención.</p></div><div className="dashboard-actions"><MealsLink /><div className="avatar">{(email[0] ?? "U").toUpperCase()}</div></div></div>
      <div className="grid stats-grid">{statCards.map(({ href, label, value, icon: Icon, tone, empty, isEmpty }) => <Link className="stat-card" href={href} key={href}><div className={`stat-icon stat-icon-${tone}`}><Icon size={19} /></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong>{isEmpty && <small className="stat-empty">{empty}</small>}</Link>)}</div>
      <div className="grid content-grid"><section className="panel"><div className="panel-header"><div><div className="section-title-row"><h2>Miembros del hogar</h2><span className="badge badge-info">{members.length} {members.length === 1 ? "miembro" : "miembros"}</span></div><p className="muted" style={{ marginBottom: 0 }}>Personas con acceso compartido.</p></div></div><div className="member-list">{members.map((member) => { const displayName = member.profiles?.[0]?.display_name ?? "Usuario"; return <div className="member" key={member.user_id}><div className="avatar">{(displayName[0] ?? "U").toUpperCase()}</div><div><strong>{displayName}</strong><small>{member.role === "owner" ? "Propietario" : "Miembro"}</small></div></div>; })}</div></section><section className="panel"><div className="panel-header"><div><h2>Invita a alguien</h2><p className="muted" style={{ marginBottom: 0 }}>Comparte este código.</p></div></div><div className="invite-code"><span>{household.invite_code}</span><button className="button button-secondary" onClick={copyInvite}>{copied ? "Copiado" : "Copiar"}</button></div></section></div>
      {todayMeals.length > 0 && <section className="panel today-meals"><div className="panel-header"><div><h2>Hoy se come</h2><p className="muted" style={{ marginBottom: 0 }}>Plan de comidas de hoy.</p></div><Link className="link" href="/meals">Ver plan semanal</Link></div><div className="today-meal-list">{todayMeals.map((meal) => <Link className="today-meal" href="/meals" key={meal.meal_type}><strong>{mealTypeLabel(meal.meal_type)}</strong><span>{meal.title}</span></Link>)}</div></section>}
    </main></>;
}
