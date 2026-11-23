"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/browser";
import { isValidPassword } from "@/lib/utils/account-validation";
import { Logo } from "@/components/logo";
import { Button, PasswordInput, Skeleton } from "@/components/ui/primitives";

export function ResetPasswordForm({ recoverySession }: { recoverySession: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await createClient().auth.getUser();
      setHasUser(Boolean(data.user));
      setChecking(false);
    }
    void checkSession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isValidPassword(password)) { setError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== repeatPassword) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError("No se ha podido actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  const unavailable = !recoverySession || !hasUser;
  return <><AppNav /><main className="auth-shell"><section className="auth-card"><Logo size="lg" className="auth-logo" /><p className="eyebrow">Nueva contraseña</p><h1>Restablece tu contraseña</h1>{checking ? <div className="form" role="status"><span className="visually-hidden">Comprobando el enlace…</span><Skeleton /><Skeleton width="70%" /></div> : unavailable ? <><p className="muted">Este enlace de recuperación no es válido o ha caducado.</p><Link className="button button-primary" href="/forgot-password">Solicitar otro enlace</Link></> : <><p className="muted">Crea una contraseña de al menos 8 caracteres.</p><form className="form" onSubmit={handleSubmit}><div className="field"><label htmlFor="reset-password">Nueva contraseña</label><PasswordInput id="reset-password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div><div className="field"><label htmlFor="reset-repeat-password">Repetir contraseña</label><PasswordInput id="reset-repeat-password" aria-describedby={error ? "reset-error" : undefined} minLength={8} required autoComplete="new-password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} />{error && <small id="reset-error" className="form-error" role="alert">{error}</small>}</div><Button type="submit" loading={loading}>{loading ? "Guardando…" : "Guardar contraseña"}</Button></form></>}</section></main></>;
}
