import { describe, expect, it } from "vitest";
import { getProfileInitial, getProfileName } from "@/lib/utils/profiles";

describe("getProfileName", () => {
  it("lee el nombre cuando Supabase devuelve un objeto", () => {
    expect(getProfileName({ display_name: "Ana" })).toBe("Ana");
  });

  it("usa el primer perfil cuando Supabase devuelve un array", () => {
    expect(getProfileName([{ display_name: "  Luis  " }, { display_name: "Marta" }])).toBe("Luis");
  });

  it("devuelve el fallback para null y undefined", () => {
    expect(getProfileName(null)).toBe("Sin nombre");
    expect(getProfileName(undefined)).toBe("Sin nombre");
  });

  it("recorta espacios y reemplaza nombres vacíos", () => {
    expect(getProfileName({ display_name: "  " })).toBe("Sin nombre");
    expect(getProfileName({ display_name: "" }, "Persona desconocida")).toBe("Persona desconocida");
  });
});

describe("getProfileInitial", () => {
  it("obtiene la inicial del nombre real", () => {
    expect(getProfileInitial({ display_name: "  ana" })).toBe("A");
    expect(getProfileInitial(null)).toBe("S");
  });
});
