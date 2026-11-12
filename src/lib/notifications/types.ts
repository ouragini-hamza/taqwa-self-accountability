/** واجهة موحدة لمزوّد الإشعارات. الويب الآن، ويمكن إضافة مزوّد Capacitor Local Notifications لاحقاً. */
export type PermissionState = "granted" | "denied" | "default" | "unsupported";

export interface NotifyPayload {
  title: string;
  body: string;
  tag?: string;
}

export interface NotificationProvider {
  readonly name: string;
  permission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  show(p: NotifyPayload): Promise<boolean>;
}