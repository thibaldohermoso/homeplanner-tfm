import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: { default: "HomePlanner", template: "%s · HomePlanner" },
  description: "Organiza las tareas, compras, gastos y comidas de tu hogar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "HomePlanner", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#134e4a" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={jakarta.variable}><PwaRegister />{children}</body>
    </html>
  );
}
