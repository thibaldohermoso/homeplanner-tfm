"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/browser";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/primitives";

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

  return <><AppNav /><main className="auth-shell"><section className="auth-card"><Logo size="lg" className="auth-logo" /><p className="eyebrow">Recupera el acceso</p><h1>¿Has olvidado tu contraseña?</h1><p className="muted">Te enviaremos un enlace para crear una contraseña nueva.</p><form className="form" onSubmit={handleSubmit}><div className="field"><label htmlFor="forgot-email">Email</label><input id="forgot-email" aria-invalid={Boolean(error)} aria-describedby={error ? "forgot-error" : undefined} type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />{error && <small id="forgot-error" className="form-error" role="alert">{error}</small>}</div>{message && <div className="form-success" role="status">{message}</div>}<Button type="submit" loading={loading}>{loading ? "Enviando…" : "Enviar enlace"}</Button></form><div className="auth-footer"><Link className="link" href="/login">Volver a iniciar sesión</Link></div></section></main></>;
}
