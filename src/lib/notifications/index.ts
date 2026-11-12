import type { NotificationProvider } from "./types";
import { webProvider } from "./web";

// عند التغليف بـ Capacitor: أنشئ capacitorProvider يستخدم @capacitor/local-notifications
// وأرجعه هنا عند Capacitor.isNativePlatform().
let provider: NotificationProvider = webProvider;

export function getNotifier(): NotificationProvider {
  return provider;
}
export function setNotifier(p: NotificationProvider) {
  provider = p;
}
export type { NotificationProvider, NotifyPayload, PermissionState } from "./types";