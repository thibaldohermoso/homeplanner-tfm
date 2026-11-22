import { describe, expect, it } from "vitest";
import { amountToCents, centsToAmount } from "@/lib/utils/money";

describe("importes en céntimos", () => {
  it("acepta coma decimal y completa los céntimos", () => {
    expect(amountToCents("12,5")).toBe(1250);
    expect(amountToCents("12.50")).toBe(1250);
  });

  it("maneja vacíos, negativos y más de dos decimales como la aplicación", () => {
    expect(amountToCents("")).toBe(0);
    expect(amountToCents("-2,35")).toBe(-235);
    expect(amountToCents("1,239")).toBe(123);
  });

  it("redondea céntimos al formatear", () => {
    expect(centsToAmount(105.6)).toBe("1.06");
    expect(centsToAmount(-20)).toBe("0.00");
    expect(centsToAmount(7)).toBe("0.07");
  });
});
