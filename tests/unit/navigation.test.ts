import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/utils/navigation";

describe("safeNext", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/tasks")).toBe("/tasks");
    expect(safeNext("/expenses?new=1")).toBe("/expenses?new=1");
  });

  it("rechaza destinos externos o vacíos", () => {
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
  });
});
