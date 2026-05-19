export type NotificationKind =
  | "event"
  | "ai"
  | "voice"
  | "document"
  | "billing"
  | "deadline"
  | "system";

export interface NotificationRecord {
  id: number;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export function detectNotificationKind(title: string, body: string): NotificationKind {
  const text = `${title} ${body}`.toLowerCase();

  if (/voice|audio|mic|record/.test(text)) return "voice";
  if (/document|pdf|file|scan|analy/.test(text)) return "document";
  if (/trial|subscription|billing|plan|renew|payment|invoice/.test(text)) return "billing";
  if (/deadline|due|expire|urgent|tomorrow|reminder/.test(text)) return "deadline";
  if (/ai|smart|suggest|recommend|assistant|insight/.test(text)) return "ai";
  if (/event|meeting|calendar|appointment|schedule/.test(text)) return "event";

  return "system";
}

export function formatRelativeTime(createdAt: string, locale: string = "en"): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return locale === "ar" ? "الآن" : locale === "fr" ? "À l’instant" : "Just now";
  if (diffMinutes < 60) {
    const value = diffMinutes;
    return locale === "ar" ? `منذ ${value} د` : `${value}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return locale === "ar" ? `منذ ${diffHours} س` : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return locale === "ar" ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
}

export function sortNotificationsNewestFirst<T extends { created_at: string; id: number }>(
  notifications: T[],
): T[] {
  return [...notifications].sort((a, b) => {
    const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (timeDiff !== 0) return timeDiff;
    return b.id - a.id;
  });
}

export function dedupeNotifications<T extends { id: number }>(notifications: T[]): T[] {
  const map = new Map<number, T>();

  for (const notification of notifications) {
    map.set(notification.id, notification);
  }

  return Array.from(map.values());
}

export function mergeNotificationLists<T extends { id: number; created_at: string }>(
  current: T[],
  next: T[],
): T[] {
  return sortNotificationsNewestFirst(dedupeNotifications([...next, ...current]));
}
