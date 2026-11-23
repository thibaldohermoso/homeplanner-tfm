import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { isPwaPublicPath } from "@/lib/utils/pwa";

describe("manifest de HomePlanner", () => {
  const value = manifest();

  it("declara la configuración PWA principal", () => {
    expect(value.name).toBe("HomePlanner");
    expect(value.short_name).toBe("HomePlanner");
    expect(value.lang).toBe("es");
    expect(value.display).toBe("standalone");
    expect(value.start_url).toBe("/dashboard");
    expect(value.scope).toBe("/");
    expect(value.theme_color).toBe("#0f766e");
  });

  it("apunta a iconos que existen en disco", () => {
    for (const icon of value.icons ?? []) {
      expect(existsSync(path.join(process.cwd(), "public", icon.src.replace(/^\//, "")))).toBe(true);
    }
  });
});

describe("rutas públicas de la PWA", () => {
  it("excluye recursos PWA del control de sesión", () => {
    expect(isPwaPublicPath("/sw.js")).toBe(true);
    expect(isPwaPublicPath("/manifest.webmanifest")).toBe(true);
    expect(isPwaPublicPath("/offline")).toBe(true);
    expect(isPwaPublicPath("/icons/icon-192.png")).toBe(true);
    expect(isPwaPublicPath("/icon.png")).toBe(true);
    expect(isPwaPublicPath("/apple-icon.png")).toBe(true);
    expect(isPwaPublicPath("/favicon.ico")).toBe(true);
    expect(isPwaPublicPath("/dashboard")).toBe(false);
  });
});
