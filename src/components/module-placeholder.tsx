import { CalendarDays, Receipt, ShoppingBasket, Utensils } from "lucide-react";
import { AppNav, AddFab } from "@/components/app-nav";

const content = {
  shopping: { title: "Compras", description: "Ten la lista compartida siempre a mano.", icon: ShoppingBasket },
  expenses: { title: "Gastos", description: "Controla los gastos comunes del hogar.", icon: Receipt },
  calendar: { title: "Calendario", description: "Coordina eventos y planes compartidos.", icon: CalendarDays },
  meals: { title: "Comidas", description: "Planifica qué vais a cocinar esta semana.", icon: Utensils },
} as const;

export function ModulePlaceholder({ module }: { module: keyof typeof content }) { const item = content[module]; const Icon = item.icon; return <><AppNav /><main className="shell page"><div className="page-header"><div><p className="eyebrow">Tu hogar</p><h1>{item.title}</h1><p className="muted">{item.description}</p></div><button className="button button-primary"><Icon size={16} /> Añadir</button></div><section className="panel"><div className="empty-state"><Icon size={32} /><strong>Este espacio está listo para ti</strong><span>La vista de {item.title.toLowerCase()} se conectará con los datos del hogar.</span><button className="button button-secondary">Empezar</button></div></section><AddFab /></main></>; }
