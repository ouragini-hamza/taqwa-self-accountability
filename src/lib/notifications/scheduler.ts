import { LIBRARY, LIBRARY_KIND_LABELS } from "../../data/library";
import { formatQuranRef } from "../quran";
import { isDue } from "../reminders";
import type { AppData } from "../storage/schema";
import type { NotifyPayload } from "./types";

export interface TickResult {
  next: AppData;
  payloads: NotifyPayload[];
}

/** Pure scheduling tick: determine which reminders are due and update their last-fired timestamps. */
export function tick(data: AppData, now: Date, pick: () => number = Math.random): TickResult {
  const payloads: NotifyPayload[] = [];
  const t = now.getTime();
  let settings = data.settings;
  const p = settings.periodic;
  if (p.enabled && (p.lastFiredAt === undefined || t - p.lastFiredAt >= p.minutes * 60000)) {
    if (p.lastFiredAt !== undefined) {
      const item = LIBRARY[Math.floor(pick() * LIBRARY.length)];
      const ref = item.quran ? ` — ${formatQuranRef(item.quran)}` : item.source ? ` — ${item.source}` : "";
      payloads.push({ title: `تقوى · ${LIBRARY_KIND_LABELS[item.kind]}`, body: item.text + ref, tag: "periodic" });
    }
    settings = { ...settings, periodic: { ...p, lastFiredAt: t } };
  }
  const reminders = data.reminders.map((r) => {
    if (!isDue(r, now)) return r;
    const ref = r.quran ? ` — ${formatQuranRef(r.quran)}` : "";
    payloads.push({ title: r.linkedEventTitle ? `تقوى · ${r.linkedEventTitle}` : "تقوى · تذكير", body: r.text + ref, tag: r.id });
    return { ...r, lastFiredAt: t };
  });
  return { next: { ...data, settings, reminders }, payloads };
}