"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui/primitives";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(standalone);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return <Card className="profile-card install-app-card"><div className="profile-card-header"><div><h2 id="install-section">Instalar HomePlanner</h2><p className="muted">Accede más rápido desde la pantalla de inicio.</p></div><Download size={20} aria-hidden="true" /></div>{installed ? <p className="form-success" role="status">Ya tienes la app instalada.</p> : ios ? <p className="muted">En Safari, pulsa Compartir y después «Añadir a pantalla de inicio».</p> : deferredPrompt ? <Button type="button" onClick={() => void handleInstall()}><Download size={16} /> Instalar app</Button> : <p className="muted">La opción de instalación aparecerá cuando el navegador la habilite.</p>}</Card>;
}
