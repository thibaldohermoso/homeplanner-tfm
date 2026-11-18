"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getHouseholds } from "@/lib/services/households";
import { AppNav } from "@/components/app-nav";

type Household = { id: string; name: string; invite_code: string; created_by: string };
type Member = { user_id: string; role: "owner" | "member"; profiles?: { display_name: string }[] | null };

export function Dashboard() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState({ tasks: 0, shopping: 0, expenses: 0, events: 0 });
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
      const [{ data: memberRows }, tasks, shopping, expenses, events] = await Promise.all([
        supabase.from("household_members").select("user_id, role, profiles(display_name)").eq("household_id", active.id),
        supabase.from("tasks").select("id").eq("household_id", active.id).neq("status", "done"),
        supabase.from("shopping_items").select("id").eq("household_id", active.id).eq("is_checked", false),
        supabase.from("expenses").select("id").eq("household_id", active.id),
        supabase.from("events").select("id").eq("household_id", active.id).gte("starts_at", new Date().toISOString()),
      ]);
      setMembers((memberRows ?? []) as Member[]);
      setStats({ tasks: tasks.data?.length ?? 0, shopping: shopping.data?.length ?? 0, expenses: expenses.data?.length ?? 0, events: events.data?.length ?? 0 });
      setLoading(false);
    }
    void load();
  }, [router]);

  async function copyInvite() { if (!household) return; await navigator.clipboard.writeText(household.invite_code); setCopied(true); setTimeout(() => setCopied(false), 1600); }

  if (loading) return <main className="loading">Cargando tu hogar…</main>;
  if (!household) return null;

  return <>
    <><AppNav /><main className="shell page"><div className="page-header"><div><p className="eyebrow">Tu hogar</p><h1>{household.name}</h1><p className="muted">Una vista rápida de lo que necesita atención.</p></div><div className="avatar">{(email[0] ?? "U").toUpperCase()}</div></div>
      <div className="grid stats-grid"><div className="stat-card"><span className="stat-label">Tareas pendientes</span><strong className="stat-value">{stats.tasks}</strong></div><div className="stat-card"><span className="stat-label">Artículos por comprar</span><strong className="stat-value">{stats.shopping}</strong></div><div className="stat-card"><span className="stat-label">Gastos registrados</span><strong className="stat-value">{stats.expenses}</strong></div><div className="stat-card"><span className="stat-label">Próximos eventos</span><strong className="stat-value">{stats.events}</strong></div></div>
      <div className="grid content-grid"><section className="panel"><div className="panel-header"><div><h2>Miembros del hogar</h2><p className="muted" style={{ marginBottom: 0 }}>Personas con acceso compartido.</p></div><span className="muted">{members.length}</span></div><div className="member-list">{members.map((member) => { const displayName = member.profiles?.[0]?.display_name ?? "Usuario"; return <div className="member" key={member.user_id}><div className="avatar">{(displayName[0] ?? "U").toUpperCase()}</div><div><strong>{displayName}</strong><small>{member.role === "owner" ? "Propietario" : "Miembro"}</small></div></div>; })}</div></section><section className="panel"><div className="panel-header"><div><h2>Invita a alguien</h2><p className="muted" style={{ marginBottom: 0 }}>Comparte este código.</p></div></div><div className="invite-code"><span>{household.invite_code}</span><button className="button button-secondary" onClick={copyInvite}>{copied ? "Copiado" : "Copiar"}</button></div></section></div>
    </main><nav className="bottom-nav"><span>Inicio</span><span>Tareas</span><span>Compra</span><span>Más</span></nav></>
  </>;
}
