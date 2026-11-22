import { describe, expect, it } from "vitest";
import { isValidPassword, isValidPhone, translateAccountError } from "@/lib/utils/account-validation";

describe("validación de cuenta", () => {
  it("valida teléfonos opcionales con el formato del perfil", () => {
    expect(isValidPhone("")).toBe(true);
    expect(isValidPhone("+34 600-123-456")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("abc12345")).toBe(false);
  });

  it("exige ocho caracteres para las contraseñas", () => {
    expect(isValidPassword("1234567")).toBe(false);
    expect(isValidPassword("12345678")).toBe(true);
  });

  it("traduce errores frecuentes de Supabase", () => {
    expect(translateAccountError("User already registered")).toContain("email");
    expect(translateAccountError("Password is too weak")).toContain("8 caracteres");
    expect(translateAccountError("Rate limit exceeded")).toContain("demasiados");
    expect(translateAccountError("Invalid login credentials")).toContain("actual");
  });
});
