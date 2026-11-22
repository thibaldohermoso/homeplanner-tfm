import { describe, expect, it } from "vitest";
import { dateKey, mondayOf, monthCells, weekDates } from "@/lib/utils/calendar";

describe("calendario y planificador", () => {
  it("usa lunes como primer día de la semana", () => {
    const monday = mondayOf(new Date(2026, 10, 22));
    expect(dateKey(monday)).toBe("2026-11-16");
    expect(weekDates(monday)).toHaveLength(7);
    expect(dateKey(weekDates(monday)[6])).toBe("2026-11-22");
  });

  it("genera una cuadrícula mensual empezando en lunes", () => {
    const cells = monthCells(new Date(2026, 1, 1));
    expect(cells).toHaveLength(35);
    expect(cells.slice(0, 6).every((cell) => cell === null)).toBe(true);
    expect(dateKey(cells[6]!)).toBe("2026-02-01");
  });
});
