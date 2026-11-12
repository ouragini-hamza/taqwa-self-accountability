import { z } from "zod";
import { DEFAULT_ITEMS } from "../muhasaba";

export const SCHEMA_VERSION = 1;

const quranRef = z.object({ surah: z.number().int(), ayah: z.number().int(), ayahTo: z.number().int().optional() });
const schedule = z.discriminatedUnion("type", [
  z.object({ type: z.literal("interval"), minutes: z.number() }),
  z.object({ type: z.literal("daily"), time: z.string() }),
  z.object({ type: z.literal("weekly"), days: z.array(z.number().int().min(0).max(6)), time: z.string() }),
  z.object({ type: z.literal("once"), at: z.string() }),
]);

export const appDataSchema = z.object({
  version: z.literal(1),
  settings: z.object({
    timezone: z.string(),
    hijriMethod: z.enum(["umalqura", "civil"]),
    hijriOffset: z.number().int().min(-2).max(2),
    theme: z.enum(["light", "dark"]),
    periodic: z.object({ enabled: z.boolean(), minutes: z.number(), lastFiredAt: z.number().optional() }),
  }),
  reminders: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      kind: z.enum(["ayah", "dhikr", "question", "message"]),
      quran: quranRef.optional(),
      schedule,
      enabled: z.boolean(),
      createdAt: z.number(),
      lastFiredAt: z.number().optional(),
      linkedEventId: z.string().optional(),
      linkedEventTitle: z.string().optional(),
    }),
  ),
  muhasaba: z.object({
    items: z.array(z.object({ id: z.string(), label: z.string() })),
    records: z.record(z.object({ done: z.array(z.string()), note: z.string().optional() })),
  }),
  adhkar: z.object({ date: z.string(), counts: z.record(z.number()) }),
});

export type AppData = z.infer<typeof appDataSchema>;

export function defaultData(): AppData {
  return {
    version: 1,
    settings: {
      timezone: "Africa/Tunis",
      hijriMethod: "umalqura",
      hijriOffset: 0,
      theme: "light",
      periodic: { enabled: false, minutes: 60 },
    },
    reminders: [],
    muhasaba: { items: DEFAULT_ITEMS.map((i) => ({ ...i })), records: {} },
    adhkar: { date: "", counts: {} },
  };
}

/** يرقّي البيانات القديمة إلى النسخة الحالية، أو يرمي خطأ إن كانت غير صالحة. */
export function migrate(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") throw new Error("ملف غير صالح");
  const obj = raw as { version?: number };
  if (obj.version === undefined) throw new Error("الملف لا يحتوي رقم نسخة");
  if (obj.version > SCHEMA_VERSION) throw new Error("الملف من نسخة أحدث من التطبيق");
  // مستقبلاً: if (obj.version === 1) raw = upgradeV1toV2(raw) ...
  const parsed = appDataSchema.safeParse(raw);
  if (!parsed.success) throw new Error("بنية البيانات غير صحيحة");
  return parsed.data;
}