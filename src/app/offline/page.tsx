import Link from "next/link";
import { Logo } from "@/components/logo";

export default function OfflinePage() {
  return <main className="offline-shell"><section className="auth-card offline-card"><Logo size="lg" /><p className="eyebrow">Sin conexión</p><h1>No hay conexión ahora</h1><p className="muted">Comprueba tu conexión a internet y vuelve a intentarlo para continuar gestionando tu hogar.</p><Link className="button button-primary" href="/">Reintentar</Link></section></main>;
}
