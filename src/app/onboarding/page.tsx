import { OnboardingForm } from "@/components/onboarding-form";
import { AppNav } from "@/components/app-nav";
import { PageHeader } from "@/components/ui/primitives";

export default function OnboardingPage() {
  return <><AppNav /><main className="shell page onboarding-page"><PageHeader eyebrow="Primer paso" title="Configura tu hogar" description="Crea un espacio nuevo o únete a uno existente." /><OnboardingForm /></main></>;
}
