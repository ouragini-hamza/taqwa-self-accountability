import { addDays, toHijri, weekday, type HijriDate, type HijriMethod } from "./hijri";

export type EventKind = "fasting" | "friday" | "season" | "eid" | "info";

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  fasting: "صيام مستحب",
  friday: "الجمعة",
  season: "مواسم",
  eid: "أعياد",
  info: "تنبيهات",
};

export interface AgendaEvent {
  id: string;
  date: string; // ميلادي ISO
  hijri: HijriDate;
  kind: EventKind;
  title: string;
  description: string;
  source?: string;
  /** مرتبط بالتقويم الهجري → تقديري وقد يختلف بحسب الرؤية */
  approximate: boolean;
}

export interface CalendarOptions {
  method: HijriMethod;
  offset: number;
}

function ev(
  key: string,
  date: string,
  hijri: HijriDate,
  kind: EventKind,
  title: string,
  description: string,
  approximate: boolean,
  source?: string,
): AgendaEvent {
  return { id: `${key}-${date}`, date, hijri, kind, title, description, approximate, source };
}

/** تُولَّد المناسبات ديناميكياً من التاريخ الهجري المحسوب لليوم — لا تُخزَّن تواريخ ميلادية ثابتة. */
export function eventsForDay(date: string, opts: CalendarOptions): AgendaEvent[] {
  const h = toHijri(date, opts.method, opts.offset);
  const wd = weekday(date);
  const out: AgendaEvent[] = [];
  const { month: m, day: d } = h;

  const isEid = (m === 10 && d === 1) || (m === 12 && d === 10);
  const isTashriq = m === 12 && d >= 11 && d <= 13;
  const isRamadan = m === 9;
  const noVoluntaryFast = isEid || isTashriq;

  if (m === 1 && d === 1)
    out.push(ev("new-year", date, h, "info", "رأس السنة الهجرية", "بداية عام هجري جديد؛ فرصة لمحاسبة النفس على عام مضى.", true));
  if (m === 1 && d === 9)
    out.push(ev("tasua", date, h, "fasting", "يوم تاسوعاء", "يستحب صيام التاسع مع العاشر من محرم.", true, "رواه مسلم (1134)"));
  if (m === 1 && d === 10)
    out.push(ev("ashura", date, h, "fasting", "يوم عاشوراء", "«صيام يوم عاشوراء أحتسب على الله أن يكفّر السنة التي قبله».", true, "رواه مسلم (1162)"));
  if (m === 9 && d === 1)
    out.push(ev("ramadan", date, h, "season", "بداية شهر رمضان (تقديري)", "يثبت دخول الشهر بالرؤية أو إعلان الجهة الرسمية في بلدك.", true));
  if (m === 9 && d === 21)
    out.push(ev("last-ten", date, h, "season", "بداية العشر الأواخر", "كان النبي ﷺ يجتهد في العشر الأواخر ما لا يجتهد في غيرها.", true, "رواه مسلم (1175)"));
  if (m === 10 && d === 1)
    out.push(ev("fitr", date, h, "eid", "عيد الفطر (تقديري)", "يحرم صيام يوم العيد. يُؤكَّد التاريخ محلياً.", true));
  if (m === 12 && d === 1)
    out.push(ev("dhul-hijja-ten", date, h, "season", "بداية العشر من ذي الحجة", "«ما من أيام العمل الصالح فيها أحب إلى الله من هذه الأيام» يعني العشر.", true, "رواه أبو داود (2438) والترمذي (757)، وأصله عند البخاري (969)"));
  if (m === 12 && d === 9)
    out.push(ev("arafah", date, h, "fasting", "يوم عرفة", "«صيام يوم عرفة أحتسب على الله أن يكفّر السنة التي قبله والسنة التي بعده» — لغير الحاج.", true, "رواه مسلم (1162)"));
  if (m === 12 && d === 10)
    out.push(ev("adha", date, h, "eid", "عيد الأضحى (تقديري)", "يحرم صيام يوم العيد. يُؤكَّد التاريخ محلياً.", true));
  if (isTashriq)
    out.push(ev("tashriq", date, h, "info", "من أيام التشريق", "«أيام التشريق أيام أكل وشرب وذكر لله» — لا يُصام فيها تطوعاً.", true, "رواه مسلم (1141)"));

  if (d >= 13 && d <= 15 && !isRamadan && !noVoluntaryFast)
    out.push(ev("white-days", date, h, "fasting", `الأيام البيض (${d})`, "صيام ثلاثة أيام من كل شهر: الثالث عشر والرابع عشر والخامس عشر.", true, "رواه الترمذي (761) والنسائي (2424)، وحسّنه الترمذي"));

  if ((wd === 1 || wd === 4) && !isRamadan && !noVoluntaryFast)
    out.push(ev(wd === 1 ? "monday" : "thursday", date, h, "fasting", wd === 1 ? "صيام الاثنين" : "صيام الخميس", "«تُعرض الأعمال يوم الاثنين والخميس، فأحب أن يُعرض عملي وأنا صائم».", false, "رواه الترمذي (747) وقال: حسن غريب"));

  if (wd === 5)
    out.push(ev("friday", date, h, "friday", "يوم الجمعة", "يوم الجمعة: الاغتسال والتبكير إلى الصلاة، والإكثار من الصلاة على النبي ﷺ.", false, "الصلاة على النبي ﷺ يوم الجمعة: رواه أبو داود (1047)"));

  return out;
}

export function eventsInRange(startIso: string, days: number, opts: CalendarOptions): AgendaEvent[] {
  const out: AgendaEvent[] = [];
  for (let i = 0; i < days; i++) out.push(...eventsForDay(addDays(startIso, i), opts));
  return out;
}

export function nextEvents(
  fromIso: string,
  opts: CalendarOptions,
  count = 5,
  kinds?: EventKind[],
  horizonDays = 400,
): AgendaEvent[] {
  const out: AgendaEvent[] = [];
  for (let i = 0; i < horizonDays && out.length < count; i++) {
    for (const e of eventsForDay(addDays(fromIso, i), opts)) {
      if (!kinds || kinds.includes(e.kind)) out.push(e);
      if (out.length >= count) break;
    }
  }
  return out;
}

export function findEventById(id: string, opts: CalendarOptions): AgendaEvent | undefined {
  const date = id.slice(-10);
  return eventsForDay(date, opts).find((e) => e.id === id);
}