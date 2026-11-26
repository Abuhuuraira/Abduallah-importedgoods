import { describe, expect, it } from "vitest";
import {
  detectDevice,
  formatDuration,
  isAnalyticsNotInstalled,
  isLikelyBot,
  normalizeReferrer,
  pageLabel,
  parseVisitorLive,
  parseVisitorRange,
  parseVisitorStats,
  sourceLabel,
} from "@/lib/analytics";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE = "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const IPAD_DESKTOP_MODE = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

describe("detectDevice", () => {
  it("recognises phones, tablets and computers", () => {
    expect(detectDevice(IPHONE)).toBe("mobile");
    expect(detectDevice(ANDROID_PHONE)).toBe("mobile");
    expect(detectDevice(ANDROID_TABLET)).toBe("tablet");
    expect(detectDevice(IPAD_DESKTOP_MODE, 5)).toBe("tablet");
    expect(detectDevice(IPAD_DESKTOP_MODE, 0)).toBe("desktop");
    expect(detectDevice(WINDOWS)).toBe("desktop");
    expect(detectDevice("")).toBe("desktop");
  });
});

describe("isLikelyBot", () => {
  it("skips crawlers and automated browsers but not people", () => {
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 ... HeadlessChrome/130.0 Safari/537.36")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 ... Chrome-Lighthouse")).toBe(true);
    expect(isLikelyBot(WINDOWS, true)).toBe(true);
    expect(isLikelyBot(IPHONE)).toBe(false);
    expect(isLikelyBot(ANDROID_PHONE)).toBe(false);
  });
});

describe("normalizeReferrer", () => {
  const own = "abduallah-importedgoods.vercel.app";
  it("treats empty, invalid and same-site referrers as direct", () => {
    expect(normalizeReferrer("", own)).toBe("direct");
    expect(normalizeReferrer("not a url", own)).toBe("direct");
    expect(normalizeReferrer(`https://${own}/products`, own)).toBe("direct");
    expect(normalizeReferrer("https://www.example.com/a", "example.com")).toBe("direct");
  });
  it("groups well-known sources", () => {
    expect(normalizeReferrer("https://www.google.com/", own)).toBe("google");
    expect(normalizeReferrer("https://www.google.com.pk/search?q=x", own)).toBe("google");
    expect(normalizeReferrer("https://l.facebook.com/l.php?u=x", own)).toBe("facebook");
    expect(normalizeReferrer("https://m.facebook.com/", own)).toBe("facebook");
    expect(normalizeReferrer("https://l.instagram.com/?u=x", own)).toBe("instagram");
    expect(normalizeReferrer("https://web.whatsapp.com/", own)).toBe("whatsapp");
    expect(normalizeReferrer("https://t.co/abc", own)).toBe("x");
    expect(normalizeReferrer("https://www.youtube.com/watch?v=1", own)).toBe("youtube");
  });
  it("keeps other sites as their host name", () => {
    expect(normalizeReferrer("https://www.olx.com.pk/item/1", own)).toBe("olx.com.pk");
    expect(normalizeReferrer("android-app://com.example.shop/", own)).toBe("com.example.shop");
  });
  it("names Android apps and Google sites precisely", () => {
    expect(normalizeReferrer("android-app://com.google.android.gm/", own)).toBe("gmail");
    expect(normalizeReferrer("android-app://com.facebook.katana/", own)).toBe("facebook");
    expect(normalizeReferrer("android-app://com.google.android.googlequicksearchbox/", own)).toBe("google");
    expect(normalizeReferrer("https://news.google.com/", own)).toBe("google");
    expect(normalizeReferrer("https://www.google.co.uk/", own)).toBe("google");
    expect(normalizeReferrer("https://mygoogle.example.com/", own)).toBe("mygoogle.example.com");
  });
  it("output always matches the database rule", () => {
    for (const r of ["https://www.google.com/", "https://a-b.example.co.uk/x", "https://xn--mgbh0fb.xn--kgbechtv/"]) {
      expect(normalizeReferrer(r, own)).toMatch(/^[a-z0-9.-]{1,100}$/);
    }
  });
});

describe("labels and formatting", () => {
  it("labels sources, pages and durations", () => {
    expect(sourceLabel("direct")).toBe("Direct / WhatsApp chats");
    expect(sourceLabel("google")).toBe("Google");
    expect(sourceLabel("olx.com.pk")).toBe("olx.com.pk");
    expect(pageLabel("/")).toBe("Home page");
    expect(pageLabel("/products")).toBe("All products / search");
    expect(pageLabel("/products/fan", "Table Fan")).toBe("Table Fan");
    expect(pageLabel("/products/fan")).toBe("Product: fan");
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(40.4)).toBe("40s");
    expect(formatDuration(95)).toBe("1m 35s");
    expect(formatDuration(3725)).toBe("1h 2m");
  });
  it("accepts only the offered date ranges", () => {
    expect(parseVisitorRange(undefined)).toBe(7);
    expect(parseVisitorRange("30")).toBe(30);
    expect(parseVisitorRange(["90"])).toBe(90);
    expect(parseVisitorRange("365")).toBe(7);
    expect(parseVisitorRange("abc")).toBe(7);
  });
});

describe("parsing database results", () => {
  it("parses live data defensively", () => {
    const live = parseVisitorLive({
      active_now: "3",
      last_30_minutes: 5,
      today: { visitors: 12, page_views: 40 },
      pages: [{ path: "/products/fan", visitors: 2, product_name: "Fan", product_code: "AIG-001" }],
      checked_at: "2026-11-26T10:00:00Z",
    });
    expect(live).toEqual({
      activeNow: 3,
      last30Minutes: 5,
      todayVisitors: 12,
      todayPageViews: 40,
      pages: [{ path: "/products/fan", visitors: 2, productName: "Fan", productCode: "AIG-001" }],
      checkedAt: "2026-11-26T10:00:00Z",
    });
    const empty = parseVisitorLive(null);
    expect(empty.activeNow).toBe(0);
    expect(empty.pages).toEqual([]);
  });
  it("parses stats and drops unknown devices", () => {
    const stats = parseVisitorStats({
      days: 7,
      start: "2026-11-20",
      end: "2026-11-26",
      totals: { visitors: 10, visits: 12, page_views: 30 },
      visits: { new_visitors: 4, avg_seconds: 75, avg_pages: "2.5" },
      daily: [{ day: "2026-11-26", visitors: 3, page_views: 9 }],
      top_products: [{ id: "x", name: "Fan", product_code: "AIG-001", slug: "fan", status: "available", views: 5, visitors: 4 }],
      devices: [{ device: "mobile", visits: 9 }, { device: "toaster", visits: 1 }],
      sources: [{ source: "direct", visits: 8 }],
    });
    expect(stats.totals).toEqual({ visitors: 10, visits: 12, pageViews: 30 });
    expect(stats.avgPages).toBe(2.5);
    expect(stats.daily).toEqual([{ day: "2026-11-26", visitors: 3, pageViews: 9 }]);
    expect(stats.devices).toEqual([{ device: "mobile", visits: 9 }]);
    expect(stats.topProducts[0].productCode).toBe("AIG-001");
  });
  it("recognises the 'SQL not run yet' error", () => {
    expect(isAnalyticsNotInstalled({ code: "PGRST202", message: "Could not find the function public.get_visitor_live" })).toBe(true);
    expect(isAnalyticsNotInstalled({ code: "42501", message: "Only administrators can view visitor statistics" })).toBe(false);
    expect(isAnalyticsNotInstalled(null)).toBe(false);
  });
});
