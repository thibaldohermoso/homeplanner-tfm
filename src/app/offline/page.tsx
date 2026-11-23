import { StatusPage } from "@/components/ui/status-page";

export default function OfflinePage() {
  return <StatusPage eyebrow="Sin conexión" title="No hay conexión ahora" description="Comprueba tu conexión a internet y vuelve a intentarlo." action="Reintentar" />;
}
