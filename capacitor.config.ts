import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.taqwa.selfaccountability",
  appName: "تقوى",
  webDir: "dist",
  bundledWebRuntime: false,
  android: { allowMixedContent: false }
};

export default config;