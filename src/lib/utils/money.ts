export function amountToCents(value: number | string | null | undefined) {
  const normalized = String(value ?? "0").replace(",", ".").trim();
  const [whole = "0", decimal = ""] = normalized.split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const absoluteWhole = whole.replace(/^-/, "");
  const cents = Number(`${absoluteWhole || "0"}${decimal.padEnd(2, "0").slice(0, 2)}`);
  return (Number.isFinite(cents) ? cents : 0) * sign;
}

export function centsToAmount(cents: number) {
  const safeCents = Math.max(0, Math.round(cents));
  return `${Math.floor(safeCents / 100)}.${String(safeCents % 100).padStart(2, "0")}`;
}
