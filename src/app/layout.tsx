import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomePlanner",
  description: "Gestión compartida del hogar",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
