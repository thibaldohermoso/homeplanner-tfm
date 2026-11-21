"use client";

import Link from "next/link";
import { CalendarDays, CheckSquare, Home, LogOut, Plus, Receipt, ShoppingBasket, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/services/auth";
import { createClient } from "@/lib/supabase/browser";

const items = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/tasks", label: "Tareas", icon: CheckSquare },
  { href: "/shopping", label: "Compras", icon: ShoppingBasket },
  { href: "/expenses", label: "Gastos", icon: Receipt },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/meals", label: "Comidas", icon: Utensils },
];

export function AppNav() {
  const pathname = usePathname(); const router = useRouter(); const isPublic = pathname === "/login" || pathname === "/register";
  const [userName, setUserName] = useState("Usuario");
  const [householdName, setHouseholdName] = useState("Tu hogar");
  useEffect(() => {
    if (isPublic) return;
    let mounted = true;
    async function loadUser() {
      const supabase = createClient();
      const [{ data: userData }, { data: householdRows }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("households").select("name").order("created_at", { ascending: true }).limit(1),
      ]);
      if (!mounted || !userData.user) return;
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userData.user.id).maybeSingle();
      if (!mounted) return;
      setUserName(profile?.display_name?.trim() || userData.user.user_metadata?.full_name || userData.user.email?.split("@")[0] || "Usuario");
      setHouseholdName(householdRows?.[0]?.name ?? "Sin hogar");
    }
    void loadUser();
    return () => { mounted = false; };
  }, [isPublic]);
  async function handleLogout() { await signOut(); router.replace("/login"); router.refresh(); }
  const links = items.map(({ href, label, icon: Icon }) => <Link key={href} className={`nav-link ${pathname === href ? "active" : ""}`} href={href}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>);
  if (isPublic) return <header className="topbar public-topbar"><div className="shell topbar-inner"><Link className="brand" href="/login"><span className="brand-mark">⌂</span> HomePlanner</Link><nav className="main-nav" aria-label="Navegación pública"><Link className={pathname === "/login" ? "nav-link active" : "nav-link"} href="/login">Iniciar sesión</Link><Link className={pathname === "/register" ? "nav-link active" : "nav-link"} href="/register">Crear cuenta</Link></nav></div></header>;
  return <><aside className="sidebar"><Link className="brand sidebar-brand" href="/dashboard"><span className="brand-mark">⌂</span> HomePlanner</Link><nav className="sidebar-nav" aria-label="Navegación principal">{links}</nav><div className="sidebar-user"><Link className="sidebar-user-link" href="/profile"><div className="avatar">{userName.slice(0, 1).toUpperCase()}</div><div><strong>{userName}</strong><span>{householdName}</span></div></Link><button className="button button-quiet sidebar-logout" onClick={handleLogout} aria-label="Cerrar sesión"><LogOut size={17} /></button></div></aside><header className="topbar mobile-topbar"><div className="shell topbar-inner"><Link className="brand" href="/dashboard"><span className="brand-mark">⌂</span> HomePlanner</Link><Link className="mobile-profile-link" href="/profile" aria-label={`Abrir perfil de ${userName}`}><div className="avatar">{userName.slice(0, 1).toUpperCase()}</div></Link></div></header><nav className="bottom-nav" aria-label="Navegación móvil">{links.filter((_, index) => index < 5)}</nav></>;
}

export function AddFab({ href = "#" }: { href?: string }) { return <Link className="button button-primary mobile-fab" href={href} aria-label="Añadir"><Plus size={22} /></Link>; }
export function MealsLink() { return <Link className="button button-secondary" href="/meals"><Utensils size={16} /> Planificar comidas</Link>; }
