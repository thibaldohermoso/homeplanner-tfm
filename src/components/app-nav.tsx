"use client";

import Link from "next/link";
import { CalendarDays, CheckSquare, Home, LogOut, Plus, Receipt, ShoppingBasket, Utensils } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/services/auth";

const items = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/tasks", label: "Tareas", icon: CheckSquare },
  { href: "/shopping", label: "Compras", icon: ShoppingBasket },
  { href: "/expenses", label: "Gastos", icon: Receipt },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
];

export function AppNav() {
  const pathname = usePathname(); const router = useRouter(); const isPublic = pathname === "/login" || pathname === "/register";
  async function handleLogout() { await signOut(); router.replace("/login"); router.refresh(); }
  return <>
    <header className="topbar app-nav"><div className="shell topbar-inner"><Link className="brand" href={isPublic ? "/login" : "/dashboard"}><span className="brand-mark">⌂</span> HomePlanner</Link>
      <nav className="main-nav" aria-label="Navegación principal">{isPublic ? <><Link className={pathname === "/login" ? "nav-link active" : "nav-link"} href="/login">Iniciar sesión</Link><Link className={pathname === "/register" ? "nav-link active" : "nav-link"} href="/register">Crear cuenta</Link></> : <>{items.map(({ href, label, icon: Icon }) => <Link key={href} className={`nav-link desktop-nav-link ${pathname === href ? "active" : ""}`} href={href}><Icon size={15} aria-hidden="true" /><span>{label}</span></Link>)}<Link className={`nav-link ${pathname === "/onboarding" ? "active" : ""}`} href="/onboarding">Mi hogar</Link><button className="button button-quiet nav-logout" onClick={handleLogout}><LogOut size={16} /> Salir</button></>}</nav>
    </div></header>
    {!isPublic && <><nav className="bottom-nav" aria-label="Navegación móvil">{items.map(({ href, label, icon: Icon }) => <Link key={href} className={`nav-link ${pathname === href ? "active" : ""}`} href={href}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>)}</nav></>}
  </>;
}

export function AddFab({ href = "#" }: { href?: string }) { return <Link className="button button-primary mobile-fab" href={href} aria-label="Añadir"><Plus size={22} /></Link>; }

export function MealsLink() { return <Link className="button button-secondary" href="/meals"><Utensils size={16} /> Planificar comidas</Link>; }
