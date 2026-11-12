import { describe, expect, it } from "vitest";
import { validateReminder, isDue } from "../lib/reminders";
import { eventsForDay } from "../lib/events";
import { toHijri } from "../lib/hijri";
import { DEFAULT_ITEMS, dayProgress, toggleDone, presenceStreak } from "../lib/muhasaba";

describe("reminders", () => {
  it("rejects an ayah without a valid Quran reference", () => {
    expect(validateReminder({ text: "تذكر", kind: "ayah", schedule: { type: "daily", time: "08:00" } }).quran).toBeTruthy();
  });
  it("accepts a personal reminder and validates a minimum interval", () => {
    expect(validateReminder({ text: "راجع نيتك", kind: "question", schedule: { type: "interval", minutes: 15 } })).toEqual({});
    expect(validateReminder({ text: "راجع نيتك", kind: "question", schedule: { type: "interval", minutes: 5 } }).schedule).toBeTruthy();
  });
  it("checks interval reminders only after the interval elapsed", () => {
    const base = new Date("2026-11-12T08:00:00").getTime();
    const reminder = { enabled: true, createdAt: base, schedule: { type: "interval" as const, minutes: 30 } };
    expect(isDue(reminder, new Date(base + 29 * 60000))).toBe(false);
    expect(isDue(reminder, new Date(base + 30 * 60000))).toBe(true);
  });
});

describe("Hijri agenda", () => {
  it("converts Gregorian dates to a valid Hijri month", () => {
    const h = toHijri("2026-11-12");
    expect(h.month).toBeGreaterThanOrEqual(1);
    expect(h.month).toBeLessThanOrEqual(12);
    expect(h.day).toBeGreaterThanOrEqual(1);
  });
  it("generates recurring Friday events from the weekday", () => {
    const events = eventsForDay("2026-11-13", { method: "umalqura", offset: 0 });
    expect(events.some(e => e.kind === "friday")).toBe(true);
  });
});

describe("daily accountability", () => {
  it("toggles a task and calculates progress", () => {
    const first = toggleDone(undefined, DEFAULT_ITEMS[0].id);
    expect(dayProgress(DEFAULT_ITEMS, first)).toEqual({ done: 1, total: DEFAULT_ITEMS.length });
    expect(toggleDone(first, DEFAULT_ITEMS[0].id).done).toHaveLength(0);
  });
  it("counts consecutive active days", () => {
    const records = {
      "2026-11-10": { done: ["salah"] },
      "2026-11-11": { done: ["quran"] },
      "2026-11-12": { done: ["salah"] }
    };
    expect(presenceStreak(records, "2026-11-12")).toBe(3);
  });
});
