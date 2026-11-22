import { localDateKey } from "@/lib/utils/dates";

export { localDateKey as dateKey };

export function mondayOf(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export function weekDates(week: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(week);
    date.setDate(week.getDate() + index);
    return date;
  });
}

export function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((mondayOffset + last.getDate()) / 7) * 7;
  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - mondayOffset + 1;
    return day < 1 || day > last.getDate() ? null : new Date(month.getFullYear(), month.getMonth(), day);
  });
}
