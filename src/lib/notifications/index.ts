import { Capacitor } from "@capacitor/core";
import type { NotificationProvider } from "./types";
import { webProvider } from "./web";
import { nativeProvider } from "./native";

export function getNotifier(): NotificationProvider {
  return Capacitor.isNativePlatform() ? nativeProvider : webProvider;
}
export type { NotificationProvider, NotifyPayload, PermissionState } from "./types";
