"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { AppNav } from "@/components/app-nav";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const supabase = createClient();

    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: displayName.trim() } } });

    if (result.error) {
      setError("No se ha podido completar la operación. Comprueba tus datos e inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    if (isLogin) {
      window.location.href = "/dashboard";
    } else if (!result.data.session) {
      setSuccess("Cuenta creada. Revisa tu correo para confirmar la dirección antes de iniciar sesión.");
      setLoading(false);
    } else {
      window.location.href = "/onboarding";
    }
  }

  return (
    <><AppNav /><main className="auth-shell">
      <section className="auth-card">
        <div className="brand"><span className="brand-mark">⌂</span> HomePlanner</div>
        <p className="eyebrow" style={{ marginTop: 32 }}>{isLogin ? "Bienvenido de nuevo" : "Empieza ahora"}</p>
        <h1>{isLogin ? "Inicia sesión" : "Crea tu cuenta"}</h1>
        <p className="muted">Gestiona tu hogar junto a las personas que lo comparten.</p>

        <form className="form" onSubmit={handleSubmit}>
          {!isLogin && <div className="field"><label htmlFor="displayName">Nombre</label><input id="displayName" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /></div>}
          <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">Contraseña</label><input id="password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isLogin ? "current-password" : "new-password"} /></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          {success && <div className="form-success" role="status">{success}</div>}
          <button className="button button-primary" disabled={loading}>{loading ? "Procesando…" : isLogin ? "Iniciar sesión" : "Crear cuenta"}</button>
        </form>

        <div className="auth-footer">
          {isLogin ? <>¿Todavía no tienes cuenta? <Link className="link" href="/register">Crear una cuenta</Link></> : <>¿Ya tienes cuenta? <Link className="link" href="/login">Iniciar sesión</Link></>}
        </div>
      </section>
    </main></>
  );
}
