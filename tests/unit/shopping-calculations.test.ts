import { describe, expect, it } from "vitest";
import { itemTotalCents, quantityToHundredths } from "@/lib/utils/shopping-calculations";

describe("totales de compra", () => {
  it("calcula cantidades decimales por precio en céntimos", () => {
    expect(quantityToHundredths("1,5")).toBe(150);
    expect(itemTotalCents("2,5", "1,20")).toBe(300);
    expect(itemTotalCents(3, 0.99)).toBe(297);
    expect(itemTotalCents(2, null)).toBe(0);
  });
});
