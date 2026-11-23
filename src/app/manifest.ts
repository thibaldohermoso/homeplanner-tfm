import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HomePlanner",
    short_name: "HomePlanner",
    description: "Organiza las tareas, compras, gastos y comidas de tu hogar.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    lang: "es",
    background_color: "#fafaf9",
    theme_color: "#0f766e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nueva tarea", short_name: "Tarea", url: "/tasks", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Lista de compras", short_name: "Compras", url: "/shopping", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Añadir gasto", short_name: "Gasto", url: "/expenses?new=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
