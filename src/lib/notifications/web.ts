import type { NotificationProvider, NotifyPayload, PermissionState } from "./types";

function supported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export const webProvider: NotificationProvider = {
  name: "web",
  async permission(): Promise<PermissionState> {
    return supported() ? (Notification.permission as PermissionState) : "unsupported";
  },
  async requestPermission(): Promise<PermissionState> {
    if (!supported()) return "unsupported";
    return (await Notification.requestPermission()) as PermissionState;
  },
  async show(p: NotifyPayload) {
    if (!supported() || Notification.permission !== "granted") return false;
    const opts: NotificationOptions = { body: p.body, tag: p.tag, icon: "/icon-192.png", badge: "/icon-192.png", lang: "ar", dir: "rtl" };
    try {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      if (reg) {
        await reg.showNotification(p.title, opts);
        return true;
      }
      new Notification(p.title, opts);
      return true;
    } catch {
      return false;
    }
  },
};