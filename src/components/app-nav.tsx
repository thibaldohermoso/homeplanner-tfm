"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/services/auth";

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = pathname === "/login" || pathname === "/register";

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return <header className="topbar app-nav">
    <div className="shell topbar-inner">
      <Link className="brand" href={isPublic ? "/login" : "/dashboard"}><span className="brand-mark">⌂</span> HomePlanner</Link>
      <nav className="main-nav" aria-label="Navegación principal">
        {isPublic ? <>
          <Link className={pathname === "/login" ? "nav-link active" : "nav-link"} href="/login">Iniciar sesión</Link>
          <Link className={pathname === "/register" ? "nav-link active" : "nav-link"} href="/register">Crear cuenta</Link>
        </> : <>
          <Link className={pathname === "/dashboard" ? "nav-link active" : "nav-link"} href="/dashboard">Dashboard</Link>
          <Link className={pathname === "/tasks" ? "nav-link active" : "nav-link"} href="/tasks">Tareas</Link>
          <Link className={pathname === "/onboarding" ? "nav-link active" : "nav-link"} href="/onboarding">Mi hogar</Link>
          <button className="button button-quiet nav-logout" onClick={handleLogout}>Cerrar sesión</button>
        </>}
      </nav>
    </div>
  </header>;
}
