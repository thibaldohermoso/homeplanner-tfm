import { OnboardingForm } from "@/components/onboarding-form";
import { AppNav } from "@/components/app-nav";

export default function OnboardingPage() {
  return <><AppNav /><main className="auth-shell"><section className="shell" style={{ width: "min(900px, 100%)" }}><div style={{ marginTop: 44 }}><p className="eyebrow">Primer paso</p><h1>Configura tu hogar</h1><p className="muted">Crea un espacio nuevo o únete a uno existente para empezar.</p><OnboardingForm /></div></section></main></>;
}
