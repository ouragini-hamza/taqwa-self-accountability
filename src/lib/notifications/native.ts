import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type LocalNotificationSchedule } from "@capacitor/local-notifications";
import type { UserReminder } from "../reminders";
import type { NotificationProvider, NotifyPayload, PermissionState } from "./types";

const ID_START = 410000;
const ID_END = 419999;

export const nativeProvider: NotificationProvider = {
  name: "capacitor-local-notifications",
  async permission(): Promise<PermissionState> {
    if (!Capacitor.isNativePlatform()) return "unsupported";
    const result = await LocalNotifications.checkPermissions();
    return result.display as PermissionState;
  },
  async requestPermission(): Promise<PermissionState> {
    if (!Capacitor.isNativePlatform()) return "unsupported";
    const result = await LocalNotifications.requestPermissions();
    return result.display as PermissionState;
  },
  async show(payload: NotifyPayload): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    await LocalNotifications.schedule({
      notifications: [{
        id: ID_START + Math.floor(Math.random() * 9000),
        title: payload.title,
        body: payload.body,
        schedule: { at: new Date(Date.now() + 1200), allowWhileIdle: true },
        channelId: "taqwa-reminders"
      }]
    });
    return true;
  }
};

function makeNotification(id: number, title: string, body: string, schedule: LocalNotificationSchedule) {
  return { id, title, body, schedule, channelId: "taqwa-reminders", autoCancel: true };
}

/**
 * Native daily/weekly/one-time notifications are scheduled by Android.
 * Interval reminders are queued in a rolling batch and refreshed when the app opens.
 */
export async function syncNativeReminders(reminders: UserReminder[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: "taqwa-reminders",
      name: "التذكيرات الإيمانية",
      description: "تذكيرات تقوى ومحاسبة النفس",
      importance: 3,
      visibility: 1
    });
    const pending = await LocalNotifications.getPending();
    const old = pending.notifications.filter(n => n.id >= ID_START && n.id <= ID_END).map(n => ({ id: n.id }));
    if (old.length) await LocalNotifications.cancel({ notifications: old });

    const notifications = [];
    let id = ID_START;
    const now = new Date();
    for (const reminder of reminders.filter(r => r.enabled)) {
      if (id >= ID_END - 10) break;
      const body = reminder.text;
      if (reminder.schedule.type === "daily") {
        const [hour, minute] = reminder.schedule.time.split(":").map(Number);
        notifications.push(makeNotification(id++, "تقوى · تذكير يومي", body, { on: { hour, minute }, repeats: true, allowWhileIdle: true }));
      } else if (reminder.schedule.type === "weekly") {
        const [hour, minute] = reminder.schedule.time.split(":").map(Number);
        for (const day of reminder.schedule.days) {
          if (id >= ID_END - 10) break;
          notifications.push(makeNotification(id++, "تقوى · تذكير أسبوعي", body, { on: { weekday: day + 1, hour, minute }, repeats: true, allowWhileIdle: true }));
        }
      } else if (reminder.schedule.type === "once") {
        const at = new Date(reminder.schedule.at);
        if (at.getTime() > now.getTime()) notifications.push(makeNotification(id++, "تقوى · تذكير", body, { at, allowWhileIdle: true }));
      } else {
        // 32 queued occurrences = 8 hours at the minimum 15-minute interval.
        for (let n = 1; n <= 32 && id < ID_END - 10; n++) {
          const at = new Date(now.getTime() + reminder.schedule.minutes * 60000 * n);
          notifications.push(makeNotification(id++, "تقوى · وقفة مع النفس", body, { at, allowWhileIdle: true }));
        }
      }
    }
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (error) {
    console.warn("تعذرت مزامنة التذكيرات المحلية", error);
  }
}
