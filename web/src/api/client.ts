const BASE = "/api/v1";
const SESS_KEY = "otklik_sessions";
const ACTIVE_KEY = "otklik_active";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function readActiveIndex(): number {
  try {
    const i = Number(localStorage.getItem(ACTIVE_KEY));
    if (Number.isInteger(i) && i >= 0) return i;
  } catch {}
  return 0;
}

function activeToken(): string | null {
  try {
    const raw = localStorage.getItem(SESS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        const s = arr[Math.min(readActiveIndex(), arr.length - 1)];
        if (s?.token) return s.token;
      }
    }
  } catch {}
  return localStorage.getItem("token");
}

export function getToken(): string | null { return activeToken(); }
export function setToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (!(opts.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = activeToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent("otklik:unauthorized"));
    let msg = res.statusText;
    try { const body = await res.json(); msg = body.detail || msg; } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(p: string) => request<T>(p, { method: "GET" }),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
};
