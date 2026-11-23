import Link from "next/link";
import { Logo } from "@/components/logo";

export function StatusPage({ eyebrow, title, description, action }: {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <main className="offline-shell">
      <section className="auth-card offline-card">
        <Logo size="lg" />
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
        <Link className="button button-primary" href="/">{action}</Link>
      </section>
    </main>
  );
}
