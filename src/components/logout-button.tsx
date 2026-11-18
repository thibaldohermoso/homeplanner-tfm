"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/services/auth";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return <button className="button button-quiet" onClick={handleLogout}>Cerrar sesión</button>;
}
