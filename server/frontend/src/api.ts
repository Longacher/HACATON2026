export const api = {
  async get(path: string) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(path: string, body?: unknown, token?: string) {
    const r = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  authHeaders(): Record<string, string> {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  },
  async staffGet(path: string) {
    const r = await fetch(path, { headers: this.authHeaders() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async staffPost(path: string, body?: unknown) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};
