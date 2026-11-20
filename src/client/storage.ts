// Local, per-browser storage helpers. Storage can be missing or throw (private mode, sandboxed
// frames), so every access is guarded and falls back to memory for the current visit.
const memory = new Map<string, string>();

export function getItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
}
export function setItem(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { memory.set(key, value); }
}
export function removeItem(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
  memory.delete(key);
}
export function getJSON<T>(key: string, fallback: T): T {
  try { const v = getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export const setJSON = (key: string, v: unknown) => setItem(key, JSON.stringify(v));
export function storageAvailable(): boolean {
  try { localStorage.setItem('alignly:probe', '1'); localStorage.removeItem('alignly:probe'); return true; } catch { return false; }
}
