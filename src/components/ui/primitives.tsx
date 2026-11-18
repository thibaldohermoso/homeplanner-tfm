"use client";

import { Check, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";

export function Button({ children, variant = "primary", loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean }) {
  return <button className={`button button-${variant === "ghost" ? "quiet" : variant}`} disabled={loading || props.disabled} {...props}>{loading && <Loader2 size={16} className="spin" aria-hidden="true" />}{children}</button>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section>; }
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) { return <span className={`avatar avatar-${size}`} aria-label={name}>{name.trim().slice(0, 1).toUpperCase() || "U"}</span>; }
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <div className="field"><label>{label}</label>{children}{error && <small className="form-error">{error}</small>}</div>; }
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) { return <div className="empty-state">{icon}<strong>{title}</strong>{description && <span>{description}</span>}{action}</div>; }
export function Skeleton({ width = "100%" }: { width?: string }) { return <span className="skeleton" style={{ width }} aria-hidden="true" />; }
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) { return <label className="checkbox"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{checked && <Check size={14} />}</span>{label}</label>; }
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) { if (!open) return null; return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><header><h2>{title}</h2><button className="button button-quiet" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></header>{children}</section></div>; }
export function Drawer(props: React.ComponentProps<typeof Modal>) { return <Modal {...props} />; }
export function Toast({ message, tone = "info", onClose }: { message: string; tone?: "info" | "success" | "error"; onClose?: () => void }) { return <div className={`toast toast-${tone}`} role="status">{message}{onClose && <button className="button button-quiet" aria-label="Cerrar aviso" onClick={onClose}><X size={16} /></button>}</div>; }
