"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Introduce un email válido.");
      return;
    }
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    setMessage("Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña.");
    setLoading(false);
  }

  return <><AppNav /><main className="auth-shell"><section className="auth-card"><div className="brand"><span className="brand-mark">⌂</span> HomePlanner</div><p className="eyebrow" style={{ marginTop: 32 }}>Recupera el acceso</p><h1>¿Has olvidado tu contraseña?</h1><p className="muted">Te enviaremos un enlace para crear una contraseña nueva.</p><form className="form" onSubmit={handleSubmit}><div className="field"><label htmlFor="forgot-email">Email</label><input id="forgot-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="form-success" role="status">{message}</div>}<button className="button button-primary" disabled={loading}>{loading ? "Enviando…" : "Enviar enlace"}</button></form><div className="auth-footer"><Link className="link" href="/login">Volver a iniciar sesión</Link></div></section></main></>;
}
