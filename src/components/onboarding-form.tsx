"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createHousehold, joinHousehold } from "@/lib/services/households";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"create" | "join" | null>(null);

  async function submitCreate(event: FormEvent) {
    event.preventDefault(); setError(null); setLoading("create");
    const { error: rpcError } = await createHousehold(name);
    if (rpcError) {
      console.error("create_household failed", { message: rpcError.message, code: rpcError.code, details: rpcError.details, hint: rpcError.hint });
      setError(rpcError.message.includes("profiles")
        ? "Tu usuario no tiene perfil en la base de datos. Ejecuta la migración 0002 y vuelve a intentarlo."
        : `No se ha podido crear el hogar. ${process.env.NODE_ENV === "development" ? rpcError.message : "Comprueba el nombre e inténtalo de nuevo."}`);
    }
    else router.push("/dashboard");
    setLoading(null);
  }

  async function submitJoin(event: FormEvent) {
    event.preventDefault(); setError(null); setLoading("join");
    const { error: rpcError } = await joinHousehold(code);
    if (rpcError) {
      console.error("join_household failed", rpcError);
      setError("El código no es válido o ya no está disponible.");
    }
    else router.push("/dashboard");
    setLoading(null);
  }

  return <>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="grid onboarding-grid">
      <section className="panel option-card"><p className="eyebrow">Primera opción</p><h2>Crea un hogar</h2><p className="muted">Serás el propietario y podrás invitar a otras personas.</p><form className="form" onSubmit={submitCreate}><div className="field"><label htmlFor="household-name">Nombre del hogar</label><input id="household-name" required minLength={1} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Casa, Piso…" /></div><button className="button button-primary" disabled={loading !== null}>{loading === "create" ? "Creando…" : "Crear hogar"}</button></form></section>
      <section className="panel option-card"><p className="eyebrow">Segunda opción</p><h2>Únete a un hogar</h2><p className="muted">Introduce el código que te ha compartido otra persona.</p><form className="form" onSubmit={submitJoin}><div className="field"><label htmlFor="invite-code">Código de invitación</label><input id="invite-code" required maxLength={8} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="A1B2C3D4" /></div><button className="button button-secondary" disabled={loading !== null}>{loading === "join" ? "Uniéndote…" : "Unirme al hogar"}</button></form></section>
    </div>
  </>;
}
