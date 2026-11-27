"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ANALYTICS_IGNORE_KEY, detectDevice, isLikelyBot, normalizeReferrer } from "@/lib/analytics";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { getVisitorId, randomId, readStorage as read, UUID_RE, writeStorage as write } from "@/lib/visitor-id";

/*
 * Anonymous visitor counting for Admin → Visitors.
 *
 * • Each browser gets a random ID kept in its own localStorage. No cookies,
 *   names, phone numbers or IP addresses are stored.
 * • A "visit" ends after 30 minutes without activity.
 * • While the page is visible and in use, a small "still here" ping is sent
 *   every 30 seconds — that powers "Active right now".
 * • Bots, automated browsers and the admin's own devices are not counted.
 * • Tracking failures are silent and never affect the website.
 */

const SESSION_KEY = "aig_session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;
const IDLE_AFTER_MS = 5 * 60 * 1000;

const OFF_KEY = "aig_tracking_off"; // sessionStorage: tracking SQL not installed yet

let disabled = false; // set when the tracking functions are not installed in Supabase
let lastTracked: { path: string; at: number } | null = null;
const memory: { session?: { id: string; last: number } } = {};

function parseSession(raw: string | null): { id: string; last: number } | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as { id?: unknown; last?: unknown };
    return typeof s.id === "string" && UUID_RE.test(s.id) && typeof s.last === "number" ? { id: s.id, last: s.last } : null;
  } catch {
    return null;
  }
}

/** Current visitor + visit IDs; starts a new visit after 30 idle minutes. */
function currentIds() {
  const now = Date.now();
  const { id: visitorId, isNew: newVisitor } = getVisitorId();

  let session = parseSession(read(SESSION_KEY)) ?? memory.session ?? null;
  let newSession = false;
  if (!session || now - session.last > SESSION_TIMEOUT_MS) {
    session = { id: randomId(), last: now };
    newSession = true;
  }
  session.last = now;
  memory.session = session;
  write(SESSION_KEY, JSON.stringify(session));

  return { visitorId, sessionId: session.id, newVisitor, newSession };
}

function shouldTrack(): boolean {
  if (disabled || !isSupabaseConfigured || process.env.NODE_ENV !== "production") return false;
  try {
    if (window.sessionStorage.getItem(OFF_KEY) === "1") return false;
  } catch {
    // storage blocked — keep going
  }
  if (isLikelyBot(navigator.userAgent, navigator.webdriver === true)) return false;
  return read(ANALYTICS_IGNORE_KEY) !== "1";
}

async function rpc(fn: "track_page_view" | "track_heartbeat", body: Record<string, unknown>) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: supabasePublishableKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
    });
    // 404 = the visitor-statistics SQL has not been run yet; stop trying for
    // this browser session (a new session tries again).
    if (res.status === 404) {
      disabled = true;
      try {
        window.sessionStorage.setItem(OFF_KEY, "1");
      } catch {
        // ignore
      }
    }
  } catch {
    // Offline or blocked — ignore.
  }
}

function trackPageView(path: string) {
  const now = Date.now();
  if (lastTracked && lastTracked.path === path && now - lastTracked.at < 1500) return;
  lastTracked = { path, at: now };

  const ids = currentIds();
  void rpc("track_page_view", {
    p_session_id: ids.sessionId,
    p_visitor_id: ids.visitorId,
    p_path: path,
    p_referrer: ids.newSession ? normalizeReferrer(document.referrer, window.location.hostname) : null,
    p_device: detectDevice(navigator.userAgent, navigator.maxTouchPoints ?? 0),
    p_new_visitor: ids.newVisitor,
  });
}

function sendHeartbeat() {
  if (!shouldTrack()) return;
  const ids = currentIds();
  if (ids.newSession) {
    // Came back after 30+ minutes: this is a new visit.
    lastTracked = null;
    trackPageView(window.location.pathname);
    return;
  }
  void rpc("track_heartbeat", { p_session_id: ids.sessionId, p_visitor_id: ids.visitorId });
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && shouldTrack()) trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!shouldTrack()) return;

    let lastInteraction = Date.now();
    const onInteraction = () => {
      lastInteraction = Date.now();
    };
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastInteraction > IDLE_AFTER_MS) return; // tab left open, nobody using it
      sendHeartbeat();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastInteraction = Date.now();
        beat();
      }
    };

    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onInteraction, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(beat, HEARTBEAT_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onInteraction));
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}

/** Placed in the admin area: stops counting visits from this browser. */
export function IgnoreThisDeviceForStats() {
  useEffect(() => {
    write(ANALYTICS_IGNORE_KEY, "1");
  }, []);
  return null;
}
