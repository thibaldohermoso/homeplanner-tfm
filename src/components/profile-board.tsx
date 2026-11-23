"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Copy, Crown, Download, Home, KeyRound, Mail, RefreshCw, Save, ShieldAlert, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { InstallAppCard } from "@/components/install-app-card";
import { Avatar, Button, Card, ConfirmDialog, EmptyState, Skeleton, Toast } from "@/components/ui/primitives";
import { signOut } from "@/lib/services/auth";
import {
  getHouseholdsForProfile,
  getProfile,
  leaveHousehold,
  listProfileHouseholdMembers,
  regenerateHouseholdInviteCode,
  translateAccountError,
  transferHouseholdOwnership,
  updateHouseholdName,
  updateProfile,
  type Household,
  type HouseholdMember,
  type Profile,
} from "@/lib/services/profile";
import { createClient } from "@/lib/supabase/browser";
import { isValidPassword, isValidPhone } from "@/lib/utils/account-validation";
import { getProfileName } from "@/lib/utils/profiles";

type ToastState = { message: string; tone: "info" | "success" | "error" };

function memberName(member: HouseholdMember) {
  return getProfileName(member.profiles);
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric" }).format(new Date(value));
}

function passwordStrength(password: string) {
  if (!password) return { label: "Sin contraseña", tone: "neutral" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: "Débil", tone: "danger" };
  if (score <= 2) return { label: "Aceptable", tone: "warning" };
  return { label: "Fuerte", tone: "success" };
}

export function ProfileBoard({ canDeleteAccount }: { canDeleteAccount: boolean }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [memberToTransfer, setMemberToTransfer] = useState<HouseholdMember | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const currentMember = useMemo(() => members.find((member) => member.user_id === userId) ?? null, [members, userId]);
  const isOwner = currentMember?.role === "owner";
  const ownerCount = members.filter((member) => member.role === "owner").length;
  const canLeaveHousehold = Boolean(household && currentMember && (!isOwner || ownerCount > 1 || members.length === 1));
  const strength = passwordStrength(newPassword);
  const hasProfileChanges = Boolean(profile && (displayName !== profile.display_name || phone !== (profile.phone ?? "")));

  function notify(message: string, tone: ToastState["tone"] = "info") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4500);
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;
    if (userError || !user) {
      router.replace("/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email ?? "");
    setPendingEmail((user as typeof user & { new_email?: string }).new_email ?? "");
    const [{ data: profileData, error: profileError }, { data: householdRows, error: householdError }] = await Promise.all([
      getProfile(user.id),
      getHouseholdsForProfile(),
    ]);
    if (profileError) {
      setError("No se ha podido cargar tu perfil.");
      setLoading(false);
      return;
    }
    const nextProfile = profileData as Profile;
    const activeHousehold = (householdRows as Household[] | null)?.[0] ?? null;
    setProfile(nextProfile);
    setDisplayName(nextProfile.display_name);
    setPhone(nextProfile.phone ?? "");
    setHousehold(activeHousehold);
    setHouseholdName(activeHousehold?.name ?? "");
    if (householdError) setError("No se han podido cargar los hogares.");
    if (activeHousehold) {
      const { data: memberRows, error: memberError } = await listProfileHouseholdMembers(activeHousehold.id);
      if (memberError) setError("No se han podido cargar los miembros del hogar.");
      setMembers((memberRows ?? []) as HouseholdMember[]);
    } else {
      setMembers([]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [router]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = displayName.trim();
    const cleanPhone = phone.trim();
    if (cleanName.length < 1 || cleanName.length > 60) {
      notify("El nombre visible debe tener entre 1 y 60 caracteres.", "error");
      return;
    }
    if (!isValidPhone(cleanPhone)) {
      notify("El teléfono debe tener entre 6 y 20 caracteres y solo puede contener dígitos, espacios, +, paréntesis y guiones.", "error");
      return;
    }
    if (!userId) return;
    setSavingProfile(true);
    const { data, error: profileError } = await updateProfile(userId, { displayName: cleanName, phone: cleanPhone || null });
    if (profileError) {
      notify("No se ha podido guardar el perfil. Comprueba tus datos.", "error");
      setSavingProfile(false);
      return;
    }
    const { error: metadataError } = await createClient().auth.updateUser({ data: { full_name: cleanName } });
    setProfile(data as Profile);
    if (metadataError) notify("El perfil se guardó, pero no se pudo sincronizar el nombre de la cuenta.", "error");
    else notify("Perfil actualizado correctamente.", "success");
    setSavingProfile(false);
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      notify("Introduce un email válido.", "error");
      return;
    }
    if (cleanEmail === email.toLowerCase()) {
      notify("El nuevo email debe ser distinto del actual.", "error");
      return;
    }
    setSavingEmail(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/profile`;
    const { data, error: emailError } = await createClient().auth.updateUser({ email: cleanEmail }, { emailRedirectTo: redirectTo });
    if (emailError) notify(translateAccountError(emailError.message), "error");
    else {
      setPendingEmail((data.user as typeof data.user & { new_email?: string } | null)?.new_email ?? cleanEmail);
      setNewEmail("");
      notify("Te hemos enviado un enlace para confirmar el cambio de email.", "success");
    }
    setSavingEmail(false);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidPassword(newPassword)) {
      notify("La nueva contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }
    if (newPassword !== repeatPassword) {
      notify("Las contraseñas nuevas no coinciden.", "error");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) {
      notify("La contraseña actual no es correcta.", "error");
      setSavingPassword(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) notify(translateAccountError(updateError.message), "error");
    else {
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      notify("Contraseña actualizada correctamente.", "success");
    }
    setSavingPassword(false);
  }

  async function handleGlobalSignOut() {
    if (!window.confirm("¿Cerrar sesión en todos los dispositivos?")) return;
    await signOut("global");
    router.replace("/login");
    router.refresh();
  }

  async function handleHouseholdSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household || !isOwner) return;
    const cleanName = householdName.trim();
    if (cleanName.length < 1 || cleanName.length > 80) {
      notify("El nombre del hogar debe tener entre 1 y 80 caracteres.", "error");
      return;
    }
    setSavingHousehold(true);
    const { data, error: householdError } = await updateHouseholdName(household.id, cleanName);
    if (householdError) notify("No se ha podido actualizar el nombre del hogar.", "error");
    else {
      setHousehold(data as Household);
      notify("Hogar actualizado correctamente.", "success");
    }
    setSavingHousehold(false);
  }

  async function handleCopyInvite() {
    if (!household) return;
    await navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleTransferOwnership() {
    if (!household || !memberToTransfer) return;
    setSavingHousehold(true);
    const { error: transferError } = await transferHouseholdOwnership(household.id, memberToTransfer.user_id);
    if (transferError) notify("No se ha podido transferir la propiedad. Comprueba que la persona siga siendo miembro.", "error");
    else { notify("La propiedad del hogar se ha transferido.", "success"); setMemberToTransfer(null); await loadData(); }
    setSavingHousehold(false);
  }

  async function handleRegenerateInvite() {
    if (!household || !isOwner) return;
    if (!window.confirm("El código anterior dejará de funcionar. ¿Regenerar el código de invitación?")) return;
    setRegeneratingCode(true);
    const { data, error: regenerateError } = await regenerateHouseholdInviteCode(household.id);
    if (regenerateError) notify("No se ha podido regenerar el código de invitación.", "error");
    else { setHousehold((current) => current ? { ...current, invite_code: String(data) } : current); notify("Código de invitación regenerado.", "success"); }
    setRegeneratingCode(false);
  }

  async function handleLeaveHousehold() {
    if (!household || !currentMember || !canLeaveHousehold) return;
    const message = members.length === 1
      ? "Eres la única persona del hogar. Al salir se eliminarán el hogar y todos sus datos. ¿Continuar?"
      : "¿Quieres salir de este hogar? Perderás el acceso a sus datos.";
    if (!window.confirm(message)) return;
    setLeaving(true);
    const { error: leaveError } = await leaveHousehold(household.id, userId);
    if (leaveError) notify(leaveError.message || "No se ha podido salir del hogar.", "error");
    else {
      notify("Has salido del hogar.", "success");
      await loadData();
    }
    setLeaving(false);
  }

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmation !== "ELIMINAR" || !deletePassword) {
      notify("Escribe ELIMINAR y tu contraseña actual para continuar.", "error");
      return;
    }
    if (!window.confirm("Esta acción es permanente. ¿Eliminar definitivamente tu cuenta?")) return;
    setDeleting(true);
    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteConfirmation, password: deletePassword }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      notify(result.error ?? "No se ha podido eliminar la cuenta.", "error");
      setDeleting(false);
      return;
    }
    await signOut("local");
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return <><AppNav /><main className="shell page profile-page"><div className="profile-loading"><Skeleton width="150px" /><Skeleton width="280px" /><Skeleton width="100%" /></div></main></>;
  }

  if (!profile) return <><AppNav /><main className="shell page"><div className="form-error" role="alert">{error ?? "No se ha podido cargar el perfil."}</div></main></>;

  return <>
    <AppNav />
    <main className="shell page profile-page">
      <header className="profile-header">
        <Avatar name={displayName} size="lg" />
        <div><p className="eyebrow">Mi cuenta</p><h1>{displayName}</h1><p className="muted">{email}</p>{pendingEmail && <span className="badge badge-warning">Email pendiente de confirmar: {pendingEmail}</span>}</div>
      </header>
      {error && <div className="form-error profile-error" role="alert">{error}</div>}
      <div className="profile-layout">
        <nav className="profile-tabs" aria-label="Secciones de la cuenta">
          <a href="#profile-section"><UserRound size={16} /> Perfil</a>
          <a href="#email-section"><Mail size={16} /> Email</a>
          <a href="#password-section"><KeyRound size={16} /> Contraseña</a>
          <a href="#household-section"><Home size={16} /> Hogar</a>
          <a href="#install-section"><Download size={16} /> Instalar</a>
          <a href="#session-section"><ShieldAlert size={16} /> Sesión</a>
        </nav>
        <div className="profile-sections">
          <Card className="profile-card" >
            <div className="profile-card-header"><div><h2 id="profile-section">Perfil</h2><p className="muted">Cómo te ven las personas de tu hogar.</p></div><UserRound size={20} aria-hidden="true" /></div>
            <form className="form" onSubmit={handleProfileSubmit}>
              <div className="field"><label htmlFor="profile-name">Nombre visible</label><input id="profile-name" value={displayName} maxLength={60} required aria-describedby="profile-name-help" onChange={(event) => setDisplayName(event.target.value)} /><small id="profile-name-help" className="field-help">Entre 1 y 60 caracteres.</small></div>
              <div className="field"><label htmlFor="profile-phone">Teléfono <span className="muted">(opcional)</span></label><input id="profile-phone" value={phone} maxLength={20} inputMode="tel" aria-describedby="profile-phone-help" onChange={(event) => setPhone(event.target.value)} /><small id="profile-phone-help" className="field-help">Visible para los miembros de tu hogar.</small></div>
              <div className="profile-actions"><Button type="submit" loading={savingProfile} disabled={!hasProfileChanges}><Save size={16} /> Guardar cambios</Button></div>
            </form>
          </Card>

          <Card className="profile-card">
            <div className="profile-card-header"><div><h2 id="email-section">Email</h2><p className="muted">Tu dirección actual y su confirmación.</p></div><Mail size={20} aria-hidden="true" /></div>
            <div className="profile-current-value"><span>Email actual</span><strong>{email}</strong></div>
            <form className="form" onSubmit={handleEmailSubmit}>
              <div className="field"><label htmlFor="new-email">Nuevo email</label><input id="new-email" type="email" required value={newEmail} autoComplete="email" aria-describedby="email-help" onChange={(event) => setNewEmail(event.target.value)} /><small id="email-help" className="field-help">Te enviaremos un enlace de confirmación al nuevo email y el cambio no se aplicará hasta confirmarlo.</small></div>
              <div className="profile-actions"><Button type="submit" variant="secondary" loading={savingEmail}><Mail size={16} /> Solicitar cambio</Button></div>
            </form>
          </Card>

          <InstallAppCard />

          <Card className="profile-card">
            <div className="profile-card-header"><div><h2 id="password-section">Contraseña</h2><p className="muted">Primero comprobaremos tu contraseña actual.</p></div><KeyRound size={20} aria-hidden="true" /></div>
            <form className="form" onSubmit={handlePasswordSubmit}>
              <div className="field"><label htmlFor="current-password">Contraseña actual</label><input id="current-password" type={showPasswords ? "text" : "password"} required value={currentPassword} autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} /></div>
              <div className="form-row"><div className="field"><label htmlFor="new-password">Nueva contraseña</label><input id="new-password" type={showPasswords ? "text" : "password"} required minLength={8} value={newPassword} autoComplete="new-password" aria-describedby="password-strength" onChange={(event) => setNewPassword(event.target.value)} /><small id="password-strength" className={`strength strength-${strength.tone}`}>Fortaleza: {strength.label}</small></div><div className="field"><label htmlFor="repeat-password">Repetir nueva</label><input id="repeat-password" type={showPasswords ? "text" : "password"} required minLength={8} value={repeatPassword} autoComplete="new-password" onChange={(event) => setRepeatPassword(event.target.value)} /></div></div>
              <button type="button" className="button button-quiet password-toggle" aria-pressed={showPasswords} onClick={() => setShowPasswords((value) => !value)}>{showPasswords ? "Ocultar contraseñas" : "Mostrar contraseñas"}</button>
              <div className="profile-actions"><Button type="submit" loading={savingPassword}><KeyRound size={16} /> Cambiar contraseña</Button></div>
            </form>
          </Card>

          <Card className="profile-card">
            <div className="profile-card-header"><div><h2 id="household-section">Hogar</h2><p className="muted">Gestiona el acceso compartido y sus miembros.</p></div><Users size={20} aria-hidden="true" /></div>
            {household ? <>
              <form className="form household-form" onSubmit={handleHouseholdSubmit}>
                <div className="field"><label htmlFor="household-name">Nombre del hogar</label><input id="household-name" value={householdName} maxLength={80} disabled={!isOwner} onChange={(event) => setHouseholdName(event.target.value)} />{!isOwner && <small className="field-help">Solo el propietario puede cambiar el nombre.</small>}</div>
                {isOwner && <div className="profile-actions"><Button type="submit" variant="secondary" loading={savingHousehold} disabled={householdName.trim() === household.name}><Save size={16} /> Guardar hogar</Button></div>}
              </form>
              <div className="invite-panel"><div><span className="field-help">Código de invitación</span><strong>{household.invite_code}</strong></div><div className="invite-actions"><button className="button button-secondary" type="button" onClick={() => void handleCopyInvite}><Copy size={16} /> {copied ? "Copiado" : "Copiar"}</button>{isOwner && <button className="button button-quiet" type="button" onClick={() => void handleRegenerateInvite()} disabled={regeneratingCode}><RefreshCw size={16} /> {regeneratingCode ? "Regenerando…" : "Regenerar"}</button>}</div></div>
              <div className="member-section"><h3>Miembros ({members.length})</h3>{members.length === 0 ? <EmptyState title="No hay miembros" description="Este hogar todavía no tiene miembros." /> : <div className="profile-member-list">{members.map((member) => <div className="profile-member" key={member.user_id}><Avatar name={memberName(member)} size="sm" /><div><strong>{memberName(member)}</strong><small>{member.role === "owner" ? "Propietario" : "Miembro"} · desde {formatJoinedDate(member.joined_at)}</small></div>{isOwner && member.user_id !== userId && <button className="button button-quiet profile-member-owner" type="button" onClick={() => setMemberToTransfer(member)}><Crown size={15} /> Hacer propietario</button>}</div>)}</div>}</div>
              <div className="danger-row"><div><strong>Salir del hogar</strong><p>{isOwner && members.length > 1 && ownerCount === 1 ? "No puedes salir porque eres el único propietario. Transfiere la propiedad antes." : members.length === 1 ? "Se eliminarán el hogar y sus datos porque eres la única persona." : "Perderás el acceso a los datos compartidos."}</p></div><Button type="button" variant="danger" loading={leaving} disabled={!canLeaveHousehold} onClick={() => void handleLeaveHousehold()}>Salir del hogar</Button></div>
            </> : <EmptyState icon={<Home size={28} />} title="Todavía no tienes hogar" description="Crea o únete a un hogar para compartir tareas, compras y gastos." action={<Link className="button button-primary" href="/onboarding">Configurar hogar</Link>} />}
          </Card>

          <Card className="profile-card" >
            <div className="profile-card-header"><div><h2 id="session-section">Sesión</h2><p className="muted">Controla dónde permanece abierta tu cuenta.</p></div><ShieldAlert size={20} aria-hidden="true" /></div>
            <div className="session-actions"><div><strong>Cerrar sesión en todos los dispositivos</strong><p>Revoca las sesiones activas y vuelve a iniciar sesión cuando quieras.</p></div><Button type="button" variant="secondary" onClick={() => void handleGlobalSignOut()}>Cerrar todas</Button></div>
          </Card>

          <Card className="profile-card danger-card">
            <div className="profile-card-header"><div><h2>Zona de peligro</h2><p className="muted">Eliminar la cuenta es permanente y no se puede deshacer.</p></div><ShieldAlert size={20} aria-hidden="true" /></div>
            {!canDeleteAccount ? <div className="form-error" role="note">La eliminación de cuentas está deshabilitada porque falta configurar <code>SUPABASE_SERVICE_ROLE_KEY</code> en el servidor.</div> : <form className="form" onSubmit={handleDeleteAccount}><div className="form-error" role="note">Si compartes un hogar con otras personas, primero debes salir de él o eliminarlo. Si eres la única persona, se eliminarán el hogar y sus datos.</div><div className="field"><label htmlFor="delete-confirmation">Escribe ELIMINAR</label><input id="delete-confirmation" value={deleteConfirmation} autoComplete="off" aria-describedby="delete-help" onChange={(event) => setDeleteConfirmation(event.target.value)} /><small id="delete-help" className="field-help">Esta confirmación evita eliminaciones accidentales.</small></div><div className="field"><label htmlFor="delete-password">Contraseña actual</label><input id="delete-password" type="password" required value={deletePassword} autoComplete="current-password" onChange={(event) => setDeletePassword(event.target.value)} /></div><div className="profile-actions"><Button type="submit" variant="danger" loading={deleting} disabled={deleteConfirmation !== "ELIMINAR" || !deletePassword}>Eliminar mi cuenta</Button></div></form>}
          </Card>
        </div>
      </div>
    </main>
    {toast && <Toast message={toast.message} tone={toast.tone === "error" ? "error" : toast.tone} onClose={() => setToast(null)} />}
    <ConfirmDialog open={Boolean(memberToTransfer)} title="Transferir propiedad" message={memberToTransfer ? `¿Hacer propietario a ${memberName(memberToTransfer)}? Dejarás de ser el propietario actual.` : ""} confirmLabel="Transferir propiedad" onClose={() => setMemberToTransfer(null)} onConfirm={() => void handleTransferOwnership()} loading={savingHousehold} />
  </>;
}
