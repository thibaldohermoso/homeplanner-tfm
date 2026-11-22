import { amountToCents } from "@/lib/utils/money";

export function quantityToHundredths(value: number | string) {
  const normalized = String(value).replace(",", ".");
  const [whole = "0", decimal = ""] = normalized.split(".");
  return Number(`${whole || "0"}${decimal.padEnd(2, "0").slice(0, 2)}`) || 0;
}

export function itemTotalCents(quantity: number | string, estimatedPrice: number | string | null | undefined) {
  if (estimatedPrice == null) return 0;
  return Math.round(amountToCents(estimatedPrice) * quantityToHundredths(quantity) / 100);
}
