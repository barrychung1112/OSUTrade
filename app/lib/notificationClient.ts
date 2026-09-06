export function getUnreadIncrease(
  previousUnreadCount: number | null,
  nextUnreadCount: number
) {
  if (previousUnreadCount === null) return 0;
  return Math.max(0, nextUnreadCount - previousUnreadCount);
}

type ClientNotification = {
  id: string;
  type: string;
  requestId: string | null;
  readAt: string | null;
};

export function getNewActionableRequestEvent(
  previousIds: Set<string> | null,
  notifications: ClientNotification[]
) {
  if (previousIds === null) return null;

  for (const notification of notifications) {
    if (previousIds.has(notification.id)) continue;
    const event = getActionableRequestEvent(notification);
    if (event) return event;
  }

  return null;
}
import { getActionableRequestEvent } from "./requestCenterEvents";
