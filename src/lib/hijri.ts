import {
  CalendarDate,
  GregorianCalendar,
  IslamicCivilCalendar,
  IslamicUmalquraCalendar,
  getDayOfWeek,
  toCalendar,
  today,
  type Calendar,
} from "@internationalized/date";

export type HijriMethod = "umalqura" | "civil";

export const HIJRI_MONTHS = [
  "محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة",
  "رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة",
];

export const WEEKDAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

function calendarFor(method: HijriMethod): Calendar {
  return method === "civil" ? new IslamicCivilCalendar() : new IslamicUmalquraCalendar();
}

export function parseIso(iso: string): CalendarDate {
  const [y, m, d] = iso.split("-").map(Number);
  return new CalendarDate(y, m, d);
}

export function todayIso(timeZone: string): string {
  return today(timeZone).toString();
}

/** offset: تعديل يدوي بالأيام (+1 يعني أن التاريخ الهجري المحلي متقدم يوماً). */
export function toHijri(iso: string, method: HijriMethod = "umalqura", offset = 0): HijriDate {
  const g = parseIso(iso).add({ days: offset });
  const h = toCalendar(g, calendarFor(method));
  return { year: h.year, month: h.month, day: h.day };
}

export function hijriToGregorianIso(h: HijriDate, method: HijriMethod = "umalqura", offset = 0): string {
  const hd = new CalendarDate(calendarFor(method), h.year, h.month, h.day);
  const g = toCalendar(hd, new GregorianCalendar()).subtract({ days: offset });
  return new CalendarDate(g.year, g.month, g.day).toString();
}

/** 0 = الأحد ... 6 = السبت */
export function weekday(iso: string): number {
  return getDayOfWeek(parseIso(iso), "en-US");
}

export function addDays(iso: string, days: number): string {
  return parseIso(iso).add({ days }).toString();
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = parseIso(fromIso).toDate("UTC").getTime();
  const b = parseIso(toIso).toDate("UTC").getTime();
  return Math.round((b - a) / 86400000);
}

export function formatHijri(h: HijriDate): string {
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} هـ`;
}

export function formatGregorian(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = parseIso(iso).toDate("UTC");
  return new Intl.DateTimeFormat("ar-TN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  }).format(d);
}