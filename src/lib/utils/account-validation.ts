export function isValidPhone(value: string) {
  const phone = value.trim();
  return !phone || (/^[\d+\s().-]+$/.test(phone) && phone.length >= 6 && phone.length <= 20);
}

export function isValidPassword(value: string) {
  return value.length >= 8;
}

export function translateAccountError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("email")) return "Ese email ya está en uso o no se puede utilizar.";
  if (normalized.includes("password") && (normalized.includes("weak") || normalized.includes("short"))) return "La nueva contraseña debe tener al menos 8 caracteres.";
  if (normalized.includes("rate limit") || normalized.includes("too many")) return "Has realizado demasiados intentos. Espera unos minutos y vuelve a probar.";
  if (normalized.includes("invalid login credentials")) return "La contraseña actual no es correcta.";
  if (normalized.includes("same password")) return "La nueva contraseña debe ser distinta de la actual.";
  return "No se ha podido completar la operación. Inténtalo de nuevo.";
}
