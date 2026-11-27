/**
 * Anonymous random ID for this browser, kept in its own localStorage.
 * Shared by visitor statistics and product likes. Browser-only.
 */

const VISITOR_KEY = "aig_visitor";
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let memoryId: string | null = null;

export function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / storage blocked — callers fall back to memory.
  }
}

/** Returns this browser's ID, creating it on first use. */
export function getVisitorId(): { id: string; isNew: boolean } {
  const stored = readStorage(VISITOR_KEY) ?? memoryId;
  if (stored && UUID_RE.test(stored)) {
    memoryId = stored;
    return { id: stored, isNew: false };
  }
  const id = randomId();
  memoryId = id;
  writeStorage(VISITOR_KEY, id);
  return { id, isNew: true };
}
