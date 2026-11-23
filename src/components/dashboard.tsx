"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckSquare, Copy, ShoppingBasket, Utensils, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { getHouseholds } from "@/lib/services/households";
import { amountToCents, listExpenses } from "@/lib/services/expenses";
import { listMealPlans } from "@/lib/services/meals";
import { AppNav, MealsLink } from "@/components/app-nav";
import { Avatar, Button, Card, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { getProfileName, type Profile } from "@/lib/utils/profiles";
import { localDateKey } from "@/lib/utils/dates";

type Household = { id: string; name: string; invite_code: string; created_by: string };
type Member = { user_id: string; role: "owner" | "member"; profiles?: Profile | Profile[] | null };
const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
function formatMoney(cents: number) { return currency.format(cents / 100); }
function mealTypeLabel(type: string) { return ({ breakfast: "Desayuno", lunch: "Comida", dinner: "Cena", snack: "Merienda" } as Record<string, string>)[type] ?? type; }
const eventDate = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const eventTime = new Intl.DateTimeFormat("es-ES", { timeStyle: "short" });

export function Dashboard() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [stats, setStats] = useState({ tasks: 0, shopping: 0, expenseTotalCents: 0, events: 0 });
  const [todayMeals, setTodayMeals] = useState<{ meal_type: string; title: string; notes: string | null }[]>([]);
  const [dueTasks, setDueTasks] = useState<{ id: string; title: string; due_date: string }[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; title: string; starts_at: string; all_day: boolean }[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: userData }, { data: households, error: householdError }] = await Promise.all([supabase.auth.getUser(), getHouseholds()]);
      if (userData.user) {
        setEmail(userData.user.email ?? "");
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userData.user.id).maybeSingle();
        setDisplayName(profile?.display_name ?? userData.user.user_metadata?.full_name ?? "");
      }
      if (householdError) { setLoadError(true); setLoading(false); return; }
      const active = (households as Household[] | null)?.[0] ?? null;
      if (!active) { router.replace("/onboarding"); return; }
      setHousehold(active);
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const [{ data: memberRows }, tasks, shopping, expenses, events, meals, due, upcoming] = await Promise.all([
        supabase.from("household_members").select("user_id, role, profiles(display_name)").eq("household_id", active.id),
        supabase.from("tasks").select("id").eq("household_id", active.id).neq("status", "done"),
        supabase.from("shopping_items").select("id, shopping_lists!inner(is_archived)").eq("household_id", active.id).eq("is_checked", false).eq("shopping_lists.is_archived", false),
        listExpenses(active.id, monthStart, nextMonthStart),
        supabase.from("events").select("id").eq("household_id", active.id).gte("starts_at", now.toISOString()).lt("starts_at", new Date(now.getTime() + 7 * 86400000).toISOString()),
        listMealPlans(active.id, localDateKey(now), localDateKey(tomorrow)),
        supabase.from("tasks").select("id, title, due_date").eq("household_id", active.id).neq("status", "done")
          .lte("due_date", localDateKey(now)).order("due_date", { ascending: true }),
        supabase.from("events").select("id, title, starts_at, all_day").eq("household_id", active.id)
          .gte("starts_at", now.toISOString()).order("starts_at", { ascending: true }).limit(3),
      ]);
      setMembers((memberRows ?? []) as Member[]);
      setTodayMeals((meals.data ?? []) as { meal_type: string; title: string; notes: string | null }[]);
      setDueTasks(due.data ?? []);
      setUpcomingEvents(upcoming.data ?? []);
      setLoadError(Boolean(due.error || upcoming.error || meals.error));
      const expenseTotalCents = (expenses.data ?? []).reduce((total, expense) => total + amountToCents(expense.amount), 0);
      setStats({ tasks: tasks.data?.length ?? 0, shopping: shopping.data?.length ?? 0, expenseTotalCents, events: events.data?.length ?? 0 });
      setLoading(false);
    }
    void load();
  }, [router]);

  async function copyInvite() { if (!household) return; await navigator.clipboard.writeText(household.invite_code); setCopied(true); setTimeout(() => setCopied(false), 1600); }

  if (loading) return <><AppNav /><PageSkeleton label="Cargando tu hogar…" /></>;
  if (!household && loadError) return <><AppNav /><main className="shell page"><p className="form-error" role="alert">No se ha podido cargar tu hogar.</p></main></>;
  if (!household) return null;

  const statCards = [
    { href: "/tasks", label: "Tareas pendientes", value: stats.tasks, icon: CheckSquare, tone: "teal", empty: "Todo al día" },
    { href: "/shopping", label: "Artículos por comprar", value: stats.shopping, icon: ShoppingBasket, tone: "amber", empty: "Lista vacía" },
    { href: "/expenses", label: "Gastos registrados", value: formatMoney(stats.expenseTotalCents), icon: Wallet, tone: "violet", empty: "Sin gastos este mes", isEmpty: stats.expenseTotalCents === 0 },
    { href: "/calendar", label: "Próximos eventos", value: stats.events, icon: CalendarDays, tone: "blue", empty: "Agenda despejada" },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const name = displayName.trim() || email.split("@")[0];
  const today = localDateKey(now);

  return <>
    <AppNav />
    <main className="shell page">
      <PageHeader eyebrow={household.name} title={name ? `${greeting}, ${name}` : greeting} description="Consulta lo que necesita atención en tu hogar." action={<MealsLink />} />
      <div className="grid stats-grid">
        {statCards.map(({ href, label, value, icon: Icon, tone, empty, isEmpty }) => (
          <Link className="stat-card" href={href} key={href}>
            <div className={`stat-icon stat-icon-${tone}`}><Icon size={19} aria-hidden="true" /></div>
            <span className="stat-label">{label}</span>
            <strong className="stat-value">{value}</strong>
            {(isEmpty ?? value === 0) && <small className="stat-empty">{empty}</small>}
          </Link>
        ))}
      </div>
      <div className="grid content-grid dashboard-grid">
        <Card className="today-panel">
          <div className="panel-header"><h2>Para hoy</h2></div>
          {loadError && <p className="form-error" role="alert">Algunos datos de hoy no se han podido cargar.</p>}
          <section className="today-section">
            <h3><CheckSquare size={18} aria-hidden="true" /> Tareas que requieren atención</h3>
            {dueTasks.length ? <ul>{dueTasks.map((task) => (
              <li key={task.id}><Link href="/tasks"><strong>{task.title}</strong><span className={task.due_date < today ? "overdue" : undefined}>{task.due_date < today ? `Vencida · ${eventDate.format(new Date(`${task.due_date}T12:00:00`))}` : "Vence hoy"}</span></Link></li>
            ))}</ul> : <p className="muted">Sin tareas pendientes para hoy. <Link className="link" href="/tasks">Ver tareas</Link></p>}
          </section>
          <section className="today-section">
            <h3><CalendarDays size={18} aria-hidden="true" /> Próximos eventos</h3>
            {upcomingEvents.length ? <ul>{upcomingEvents.map((event) => {
              const date = new Date(event.starts_at);
              return <li key={event.id}><Link href="/calendar"><strong>{event.title}</strong><span>{eventDate.format(date)}{event.all_day ? " · Todo el día" : ` · ${eventTime.format(date)}`}</span></Link></li>;
            })}</ul> : <p className="muted">Sin eventos próximos. <Link className="link" href="/calendar">Abrir calendario</Link></p>}
          </section>
          <section className="today-section">
            <h3><Utensils size={18} aria-hidden="true" /> Comidas de hoy</h3>
            {todayMeals.length ? <ul>{todayMeals.map((meal) => <li key={meal.meal_type}><Link href="/meals"><strong>{meal.title}</strong><span>{mealTypeLabel(meal.meal_type)}</span></Link></li>)}</ul> : <p className="muted">Aún no hay comidas previstas. <Link className="link" href="/meals">Planificar comidas</Link></p>}
          </section>
        </Card>
        <aside className="grid dashboard-aside">
          <Card>
            <div className="panel-header"><h2>Miembros del hogar</h2></div>
            <div className="member-list">{members.map((member) => {
              const memberName = getProfileName(member.profiles);
              return <div className="member" key={member.user_id}><Avatar name={memberName} /><div><strong>{memberName}</strong><small>{member.role === "owner" ? "Propietario" : "Miembro"}</small></div></div>;
            })}</div>
          </Card>
          <Card>
            <h2>Invita a alguien</h2>
            <p className="muted">Comparte este código para añadir un miembro.</p>
            <div className="invite-code"><span>{household.invite_code}</span><Button variant="secondary" onClick={copyInvite}><Copy size={16} aria-hidden="true" /> {copied ? "Copiado" : "Copiar"}</Button></div>
          </Card>
        </aside>
      </div>
    </main>
  </>;
}
