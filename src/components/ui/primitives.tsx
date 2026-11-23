"use client";

import { Check, Eye, EyeOff, Inbox, Loader2, X } from "lucide-react";
import { useState, type ReactNode } from "react";

export function Button({ children, variant = "primary", loading, disabled, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean }) {
  return <button {...props} className={`button button-${variant === "ghost" ? "quiet" : variant} ${className}`} disabled={loading || disabled} aria-busy={loading || undefined}>{loading && <Loader2 size={16} className="spin" aria-hidden="true" />}{children}</button>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section>; }
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) { return <span className={`avatar avatar-${size}`} aria-label={name}>{name.trim().slice(0, 1).toUpperCase() || "U"}</span>; }
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <div className="field"><label>{label}</label>{children}{error && <small className="form-error">{error}</small>}</div>; }
export function EmptyState({ icon = <Inbox size={26} aria-hidden="true" />, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong>{description && <span>{description}</span>}{action}</div>;
}
export function Skeleton({ width = "100%" }: { width?: string }) { return <span className="skeleton" style={{ width }} aria-hidden="true" />; }

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-heading">
        <p className="eyebrow" title={eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <div className="page-description muted">{description}</div>
      </div>
      {action && <div className="page-action">{action}</div>}
    </header>
  );
}

export function PageSkeleton({ label }: { label: string }) {
  return (
    <main className="shell page" aria-busy="true">
      <span role="status" className="visually-hidden">{label}</span>
      <div className="page-skeleton-heading">
        <Skeleton width="92px" />
        <Skeleton width="min(280px, 85%)" />
        <Skeleton width="min(390px, 96%)" />
      </div>
      <div className="grid skeleton-panels">
        {[0, 1].map((panel) => <Card key={panel}><Skeleton width="52%" /><Skeleton /><Skeleton width="78%" /></Card>)}
      </div>
    </main>
  );
}

export function PasswordInput({ id, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="password-input">
      <input {...props} id={id} type={visible ? "text" : "password"} />
      <Button type="button" variant="ghost" className="icon-button" aria-controls={id} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setVisible((prev) => !prev)}>
        <Icon size={18} aria-hidden="true" />
      </Button>
    </div>
  );
}
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) { return <label className="checkbox"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{checked && <Check size={14} />}</span>{label}</label>; }
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) { if (!open) return null; return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><header><h2>{title}</h2><button className="button button-quiet" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></header>{children}</section></div>; }
export function Drawer(props: React.ComponentProps<typeof Modal>) { return <Modal {...props} />; }
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirmar", onClose, onConfirm, loading = false }: { open: boolean; title: string; message: string; confirmLabel?: string; onClose: () => void; onConfirm: () => void; loading?: boolean }) { return <Modal open={open} title={title} onClose={onClose}><p className="confirm-message">{message}</p><div className="confirm-actions"><Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button><Button type="button" variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button></div></Modal>; }
export function Toast({ message, tone = "info", onClose }: { message: string; tone?: "info" | "success" | "error"; onClose?: () => void }) { return <div className={`toast toast-${tone}`} role="status">{message}{onClose && <button className="button button-quiet" aria-label="Cerrar aviso" onClick={onClose}><X size={16} /></button>}</div>; }
