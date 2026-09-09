import AsyncStorage from "@react-native-async-storage/async-storage";

// Куда стучится приложение. Выбери свой вариант:
// - телефон по USB / свой Wi-Fi: http://192.168.101.12:8000
// - эмулятор Android: http://10.0.2.2:8000
export const API_URL = "http://10.0.2.2:8000";

export async function apiGet(path: string) {
  const r = await fetch(API_URL + path);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function apiPost(path: string, body?: unknown) {
  const token = await AsyncStorage.getItem("token");
  const r = await fetch(API_URL + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function staffGet(path: string) {
  const token = await AsyncStorage.getItem("token");
  const r = await fetch(API_URL + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
