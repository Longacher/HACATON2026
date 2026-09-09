const BASE = "http://localhost:8000/api/v1";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export type UploadFile = { uri: string; name: string; type: string };

export async function apiUpload<T>(path: string, files: UploadFile[]): Promise<T> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f as unknown as Blob);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Category { id: string; name: string; is_free_fallback: boolean }
export interface AppealRes {
  id: string;
  track_number: string;
  status: string;
  priority: string;
  is_crisis: boolean;
  created_at: string;
}