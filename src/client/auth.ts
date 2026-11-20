// Local accounts. There is no account server: accounts live in this browser only, and passwords are
// stored as salted PBKDF2-SHA-256 hashes, never in plain text. The UI says so on the sign-in pages.
import { getItem, getJSON, removeItem, setItem, setJSON } from './storage.ts';

export interface Account { id: string; name: string; email: string; college?: string; salt: string; hash: string; createdAt: number }
export interface Session { userId: string; name: string; email?: string; guest?: boolean }

const ACCOUNTS = 'alignly:accounts';
const SESSION = 'alignly:session';

const enc = new TextEncoder();
const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const randomHex = (n: number) => toHex(crypto.getRandomValues(new Uint8Array(n)).buffer);

async function hashPassword(password: string, salt: string): Promise<string> {
  if (!crypto?.subtle) throw new Error('Secure sign-in needs a secure (https) connection in a modern browser.');
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 120_000 }, key, 256);
  return toHex(bits);
}

const accounts = () => getJSON<Account[]>(ACCOUNTS, []);
const norm = (e: string) => e.trim().toLowerCase();

export function validateEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim()); }

export async function register(input: { name: string; email: string; password: string; college?: string }): Promise<Session> {
  const name = input.name.trim();
  const email = norm(input.email);
  if (name.length < 2) throw new Error('Enter your name.');
  if (!validateEmail(email)) throw new Error('Enter a valid email address.');
  if (input.password.length < 8) throw new Error('Use at least 8 characters for your password.');
  const list = accounts();
  if (list.some((a) => a.email === email)) throw new Error('An account with this email already exists in this browser. Sign in instead.');
  const salt = randomHex(16);
  const acct: Account = { id: randomHex(8), name, email, college: input.college?.trim() || undefined, salt, hash: await hashPassword(input.password, salt), createdAt: Date.now() };
  setJSON(ACCOUNTS, [...list, acct]);
  return startSession({ userId: acct.id, name: acct.name, email: acct.email }, true);
}

export async function signIn(email: string, password: string, remember: boolean): Promise<Session> {
  const acct = accounts().find((a) => a.email === norm(email));
  // Same message either way, so the form doesn't reveal which emails have accounts.
  const fail = new Error('That email and password don’t match an account in this browser.');
  if (!acct) throw fail;
  if ((await hashPassword(password, acct.salt)) !== acct.hash) throw fail;
  return startSession({ userId: acct.id, name: acct.name, email: acct.email }, remember);
}

export function continueAsGuest(): Session {
  return startSession({ userId: 'guest', name: 'Guest', guest: true }, false);
}

function startSession(s: Session, remember: boolean): Session {
  if (remember) setJSON(SESSION, s);
  else {
    try { sessionStorage.setItem(SESSION, JSON.stringify(s)); removeItem(SESSION); } catch { setJSON(SESSION, s); }
  }
  return s;
}

export function currentSession(): Session | null {
  try {
    const t = sessionStorage.getItem(SESSION);
    if (t) return JSON.parse(t);
  } catch { /* ignore */ }
  return getJSON<Session | null>(SESSION, null);
}

export function signOut() {
  try { sessionStorage.removeItem(SESSION); } catch { /* ignore */ }
  removeItem(SESSION);
}

export function getAccount(id: string): Account | undefined { return accounts().find((a) => a.id === id); }

export function updateProfile(id: string, patch: { name?: string; college?: string }): Session | null {
  const list = accounts();
  const a = list.find((x) => x.id === id);
  if (!a) return null;
  if (patch.name !== undefined) a.name = patch.name.trim() || a.name;
  if (patch.college !== undefined) a.college = patch.college.trim() || undefined;
  setJSON(ACCOUNTS, list);
  const s = { userId: a.id, name: a.name, email: a.email };
  if (getItem(SESSION)) setJSON(SESSION, s); else startSession(s, false);
  return s;
}

export function deleteAccount(id: string) {
  setJSON(ACCOUNTS, accounts().filter((a) => a.id !== id));
  signOut();
}
