import { addDays } from "./hijri";

export interface MuhasabaItem {
  id: string;
  label: string;
}
export interface DayRecord {
  done: string[];
  note?: string;
}

export const DEFAULT_ITEMS: MuhasabaItem[] = [
  { id: "salah", label: "الصلاة في وقتها" },
  { id: "adhkar-am", label: "أذكار الصباح" },
  { id: "adhkar-pm", label: "أذكار المساء" },
  { id: "quran", label: "قراءة القرآن" },
  { id: "istighfar", label: "الذكر والاستغفار" },
  { id: "gaze", label: "غض البصر" },
  { id: "tongue", label: "حفظ اللسان" },
  { id: "qiyam", label: "قيام الليل" },
];

export function toggleDone(rec: DayRecord | undefined, itemId: string): DayRecord {
  const base = rec ?? { done: [] };
  const done = base.done.includes(itemId) ? base.done.filter((x) => x !== itemId) : [...base.done, itemId];
  return { ...base, done };
}

export function dayProgress(items: MuhasabaItem[], rec: DayRecord | undefined): { done: number; total: number } {
  const ids = new Set(items.map((i) => i.id));
  const done = (rec?.done ?? []).filter((d) => ids.has(d)).length;
  return { done, total: items.length };
}

/** أيام الحضور المتتالية: يوم فيه بند واحد على الأقل. اليوم الحالي الفارغ لا يكسر السلسلة. */
export function presenceStreak(records: Record<string, DayRecord>, today: string): number {
  let day = (records[today]?.done.length ?? 0) > 0 ? today : addDays(today, -1);
  let n = 0;
  while ((records[day]?.done.length ?? 0) > 0) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}