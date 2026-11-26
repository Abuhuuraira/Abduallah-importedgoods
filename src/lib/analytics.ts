/**
 * Visitor statistics — shared helpers (browser + server, no secrets).
 * Recording happens in components/analytics/visitor-tracker.tsx; the numbers
 * are read by admins only (Admin → Visitors).
 */

export type DeviceType = "mobile" | "tablet" | "desktop";

/** localStorage flag: visits from this browser are not counted (set when an admin opens /admin). */
export const ANALYTICS_IGNORE_KEY = "aig_ignore_visits";

export const VISITOR_RANGES = [7, 30, 90] as const;
export type VisitorRange = (typeof VISITOR_RANGES)[number];

export function parseVisitorRange(value: string | string[] | undefined): VisitorRange {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (VISITOR_RANGES as readonly number[]).includes(n) ? (n as VisitorRange) : 7;
}

export function detectDevice(userAgent: string, maxTouchPoints = 0): DeviceType {
  const ua = userAgent || "";
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua)) return "tablet";
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return "tablet";
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return "tablet"; // iPadOS reports as a Mac
  if (/Mobi|iPhone|iPod|Android|Opera Mini|IEMobile|BlackBerry/i.test(ua)) return "mobile";
  return "desktop";
}

/** Search engines, link previews and automated browsers are not people. */
export function isLikelyBot(userAgent: string, webdriver = false): boolean {
  return webdriver || /bot|crawler|crawling|spider|slurp|headless|lighthouse|pagespeed|prerender/i.test(userAgent || "");
}

const SOURCE_RULES: [RegExp, string][] = [
  [/(^|\.)google\.(com|co|[a-z]{2}|com?\.[a-z]{2})$/, "google"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(whatsapp\.com|whatsapp\.net|wa\.me|wl\.co)$/, "whatsapp"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "x"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)yahoo\.com$/, "yahoo"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)pinterest\.(com|[a-z]{2}|com?\.[a-z]{2})$/, "pinterest"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)(telegram\.org|telegram\.me|t\.me)$/, "telegram"],
];

/** Android apps send "android-app://<package>" as the referrer. */
const ANDROID_APPS: Record<string, string> = {
  "com.google.android.gm": "gmail",
  "com.google.android.googlequicksearchbox": "google",
  "com.facebook.katana": "facebook",
  "com.facebook.lite": "facebook",
  "com.facebook.orca": "facebook",
  "com.instagram.android": "instagram",
  "com.whatsapp": "whatsapp",
  "com.whatsapp.w4b": "whatsapp",
  "com.zhiliaoapp.musically": "tiktok",
  "com.google.android.youtube": "youtube",
  "org.telegram.messenger": "telegram",
};

const SAFE_SOURCE = /^[a-z0-9.-]{1,100}$/;

function bareHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, "").replace(/^(www|m|l|lm|mobile|mbasic|web)\./, "");
}

/**
 * Turns document.referrer into a short source name ("google", "facebook",
 * "example.com"), or "direct" when there is none or it is this website.
 * Links opened from the WhatsApp app usually arrive as "direct".
 */
export function normalizeReferrer(referrer: string, ownHost: string): string {
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return "direct";
  }
  if (url.protocol === "android-app:") {
    const app = url.hostname.toLowerCase();
    return ANDROID_APPS[app] ?? (SAFE_SOURCE.test(app) ? app : "direct");
  }
  if (!url.hostname) return "direct";
  const host = bareHost(url.hostname);
  if (host === bareHost(ownHost || "")) return "direct";
  for (const [pattern, name] of SOURCE_RULES) {
    if (pattern.test(host)) return name;
  }
  return SAFE_SOURCE.test(host) ? host : "direct";
}

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct / WhatsApp chats",
  google: "Google",
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  gmail: "Gmail",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X (Twitter)",
  bing: "Bing",
  yahoo: "Yahoo",
  duckduckgo: "DuckDuckGo",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  telegram: "Telegram",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export const DEVICE_LABELS: Record<DeviceType, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Computer",
};

/** Friendly name for a page path, e.g. "/" → "Home page". */
export function pageLabel(path: string, productName?: string | null): string {
  if (productName) return productName;
  if (path === "/") return "Home page";
  if (path === "/products") return "All products / search";
  if (path === "/offline") return "Offline page";
  if (path.startsWith("/products/")) return `Product: ${path.slice("/products/".length)}`;
  return path;
}

/** 95 → "1m 35s", 40 → "40s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ---------------------------------------------------------------------------
// Data shapes returned by the get_visitor_live / get_visitor_stats functions
// ---------------------------------------------------------------------------

export type LivePage = { path: string; visitors: number; productName: string | null; productCode: string | null };

export type VisitorLive = {
  activeNow: number;
  last30Minutes: number;
  todayVisitors: number;
  todayPageViews: number;
  pages: LivePage[];
  checkedAt: string;
};

export type VisitorStats = {
  days: number;
  start: string;
  end: string;
  totals: { visitors: number; visits: number; pageViews: number };
  newVisitors: number;
  avgSeconds: number;
  avgPages: number;
  daily: { day: string; visitors: number; pageViews: number }[];
  topProducts: {
    id: string;
    name: string;
    productCode: string;
    slug: string;
    status: string;
    views: number;
    visitors: number;
  }[];
  devices: { device: DeviceType; visits: number }[];
  sources: { source: string; visits: number }[];
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(obj) : []);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function parseVisitorLive(data: unknown): VisitorLive {
  const d = obj(data);
  const today = obj(d.today);
  return {
    activeNow: num(d.active_now),
    last30Minutes: num(d.last_30_minutes),
    todayVisitors: num(today.visitors),
    todayPageViews: num(today.page_views),
    pages: arr(d.pages).map((p) => ({
      path: str(p.path),
      visitors: num(p.visitors),
      productName: strOrNull(p.product_name),
      productCode: strOrNull(p.product_code),
    })),
    checkedAt: str(d.checked_at) || new Date().toISOString(),
  };
}

export function parseVisitorStats(data: unknown): VisitorStats {
  const d = obj(data);
  const totals = obj(d.totals);
  const visits = obj(d.visits);
  return {
    days: num(d.days),
    start: str(d.start).slice(0, 10),
    end: str(d.end).slice(0, 10),
    totals: { visitors: num(totals.visitors), visits: num(totals.visits), pageViews: num(totals.page_views) },
    newVisitors: num(visits.new_visitors),
    avgSeconds: num(visits.avg_seconds),
    avgPages: num(visits.avg_pages),
    daily: arr(d.daily).map((r) => ({ day: str(r.day).slice(0, 10), visitors: num(r.visitors), pageViews: num(r.page_views) })),
    topProducts: arr(d.top_products).map((p) => ({
      id: str(p.id),
      name: str(p.name),
      productCode: str(p.product_code),
      slug: str(p.slug),
      status: str(p.status),
      views: num(p.views),
      visitors: num(p.visitors),
    })),
    devices: arr(d.devices)
      .map((r) => ({ device: str(r.device) as DeviceType, visits: num(r.visits) }))
      .filter((r) => r.device in DEVICE_LABELS),
    sources: arr(d.sources).map((r) => ({ source: str(r.source), visits: num(r.visits) })),
  };
}

/** True when the visitor-statistics SQL file has not been run in Supabase yet. */
export function isAnalyticsNotInstalled(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message ?? "");
}
