import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function ensureNotifyPermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

// Тихое напоминание через сутки: «загляни, вдруг уже ответили»
export async function scheduleCheckReminder(trackNumber: string): Promise<void> {
  try {
    if (!(await ensureNotifyPermission())) return;
    await Notifications.cancelScheduledNotificationAsync(`check-${trackNumber}`).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: `check-${trackNumber}`,
      content: { title: "Отклик 💚", body: "Загляни — возможно, специалист уже ответил" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 24 * 3600, repeats: false },
    });
  } catch {}
}

// Момент готовности ответа (ловим в Track при смене статуса)
export async function notifyAnswerReady(): Promise<void> {
  try {
    if (!(await ensureNotifyPermission())) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: "Отклик 💚", body: "Готов тёплый ответ — открой приложение" },
      trigger: null,
    });
  } catch {}
}

export function isNotifySupported(): boolean {
  return Platform.OS !== "web";
}
