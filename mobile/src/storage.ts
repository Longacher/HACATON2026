import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "otklik_last_track";
const WEB_KEY = "otklik_last_track";

export async function saveLastTrack(track: string): Promise<void> {
  const v = track.trim().toUpperCase();
  if (!v) return;
  try {
    if (Platform.OS === "web") localStorage.setItem(WEB_KEY, v);
    else await SecureStore.setItemAsync(KEY, v);
  } catch {}
}

export async function getLastTrack(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return localStorage.getItem(WEB_KEY);
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function clearLastTrack(): Promise<void> {
  try {
    if (Platform.OS === "web") localStorage.removeItem(WEB_KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {}
}

export interface Draft {
  freeText: string;
  answers: Record<string, string>;
  categoryId: string | null;
  mode: "pick" | "free";
  applicantType: string;
  savedAt: number;
}

const DRAFT_KEY = "otklik_draft";

export async function saveDraft(d: Draft): Promise<void> {
  try {
    const raw = JSON.stringify(d);
    if (Platform.OS === "web") localStorage.setItem(DRAFT_KEY, raw);
    else await SecureStore.setItemAsync(DRAFT_KEY, raw);
  } catch {}
}

export async function loadDraft(): Promise<Draft | null> {
  try {
    const raw = Platform.OS === "web" ? localStorage.getItem(DRAFT_KEY) : await SecureStore.getItemAsync(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d || typeof d !== "object") return null;
    return d;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    if (Platform.OS === "web") localStorage.removeItem(DRAFT_KEY);
    else await SecureStore.deleteItemAsync(DRAFT_KEY);
  } catch {}
}
