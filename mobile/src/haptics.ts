import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function safe(fn: () => Promise<void>): void {
  if (Platform.OS === "web") return;
  fn().catch(() => {});
}

// Лёгкий отклик на выбор/тап
export function tap(): void {
  safe(() => Haptics.selectionAsync());
}

// Успех: отправка, сохранение
export function success(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

// Мягкое предупреждение: лимит, ошибка
export function warn(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
