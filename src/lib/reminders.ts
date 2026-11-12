import type { QuranRef } from "./quran";
import { validateQuranRef } from "./quran";

export type ReminderKind = "ayah" | "dhikr" | "question" | "message";
export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  ayah: "آية",
  dhikr: "ذكر شخصي",
  question: "سؤال محاسبة",
  message: "رسالة",
};

export type Schedule =
  | { type: "interval"; minutes: number }
  | { type: "daily"; time: string }
  | { type: "weekly"; days: number[]; time: string }
  | { type: "once"; at: string }; // ISO datetime محلي "YYYY-MM-DDTHH:MM"

export interface UserReminder {
  id: string;
  text: string;
  kind: ReminderKind;
  quran?: QuranRef;
  schedule: Schedule;
  enabled: boolean;
  createdAt: number;
  lastFiredAt?: number;
  linkedEventId?: string;
  linkedEventTitle?: string;
}

export const INTERVAL_OPTIONS = [15, 30, 60, 120] as const;
const GRACE_MS = 2 * 60 * 60 * 1000;

function parseTime(time: string): [number, number] {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return [h, m];
}

/** آخر موعد مجدول ≤ now (بتوقيت الجهاز)، أو null */
export function lastOccurrence(s: Schedule, now: Date): Date | null {
  if (s.type === "once") {
    const at = new Date(s.at);
    return at.getTime() <= now.getTime() ? at : null;
  }
  if (s.type === "interval") return null;
  const [h, m] = parseTime(s.time);
  for (let back = 0; back < 8; back++) {
    const d = new Date(now);
    d.setDate(d.getDate() - back);
    d.setHours(h, m, 0, 0);
    if (d.getTime() > now.getTime()) continue;
    if (s.type === "daily" || s.days.includes(d.getDay())) return d;
  }
  return null;
}

export function isDue(r: Pick<UserReminder, "schedule" | "enabled" | "createdAt" | "lastFiredAt">, now: Date): boolean {
  if (!r.enabled) return false;
  const since = r.lastFiredAt ?? r.createdAt;
  const s = r.schedule;
  if (s.type === "interval") return now.getTime() - since >= s.minutes * 60000;
  const occ = lastOccurrence(s, now);
  if (!occ) return false;
  if (s.type === "once") return r.lastFiredAt === undefined;
  return occ.getTime() > since && now.getTime() - occ.getTime() <= GRACE_MS;
}

export function describeSchedule(s: Schedule): string {
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  switch (s.type) {
    case "interval":
      return s.minutes >= 60 ? `كل ${s.minutes / 60} ساعة` : `كل ${s.minutes} دقيقة`;
    case "daily":
      return `يومياً ${s.time}`;
    case "weekly":
      return `${s.days.map((d) => days[d]).join("، ")} — ${s.time}`;
    case "once":
      return `مرة واحدة: ${s.at.replace("T", " ")}`;
  }
}

export interface ReminderDraft {
  text: string;
  kind: ReminderKind;
  quran?: Partial<QuranRef>;
  schedule: Schedule;
}

export function validateReminder(d: ReminderDraft): Partial<Record<"text" | "quran" | "schedule", string>> {
  const errors: Partial<Record<"text" | "quran" | "schedule", string>> = {};
  const text = d.text.trim();
  if (text.length < 2) errors.text = "اكتب نص التذكير.";
  else if (text.length > 400) errors.text = "النص طويل جداً (الحد 400 حرف).";
  if (d.kind === "ayah") {
    const e = validateQuranRef(d.quran);
    if (e) errors.quran = `لا يمكن حفظ النص كآية دون مرجع صحيح: ${e}`;
  }
  const s = d.schedule;
  const timeOk = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  if (s.type === "interval" && !(s.minutes >= 15 && s.minutes <= 24 * 60)) errors.schedule = "الفاصل بين 15 دقيقة و24 ساعة.";
  if ((s.type === "daily" || s.type === "weekly") && !timeOk(s.time)) errors.schedule = "حدد وقتاً صحيحاً.";
  if (s.type === "weekly" && s.days.length === 0) errors.schedule = "اختر يوماً واحداً على الأقل.";
  if (s.type === "once" && Number.isNaN(new Date(s.at).getTime())) errors.schedule = "حدد تاريخاً ووقتاً صحيحين.";
  return errors;
}