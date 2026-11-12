import { defaultData, migrate, type AppData } from "./schema";

const KEY = "taqwa:data";
let cache: AppData | null = null;
const listeners = new Set<() => void>();
const SERVER = defaultData();

function load(): AppData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? migrate(JSON.parse(raw)) : defaultData();
  } catch (e) {
    console.error("تعذر قراءة البيانات المحلية، استُخدمت القيم الافتراضية", e);
    cache = defaultData();
  }
  return cache;
}

function persist(next: AppData) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.error("تعذر حفظ البيانات", e);
  }
  listeners.forEach((l) => l());
}

export const repository = {
  get: (): AppData => (typeof window === "undefined" ? SERVER : load()),
  getServer: (): AppData => SERVER,
  subscribe(l: () => void) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        cache = null;
        l();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  },
  update(fn: (d: AppData) => AppData) {
    persist(fn(load()));
  },
  exportJSON(): string {
    return JSON.stringify({ ...load(), exportedAt: new Date().toISOString() }, null, 2);
  },
  importJSON(text: string) {
    const parsed = JSON.parse(text);
    delete parsed.exportedAt;
    persist(migrate(parsed));
  },
  reset() {
    localStorage.removeItem(KEY);
    cache = null;
    persist(defaultData());
  },
};

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}