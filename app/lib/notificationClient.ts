export function getUnreadIncrease(
  previousUnreadCount: number | null,
  nextUnreadCount: number
) {
  if (previousUnreadCount === null) return 0;
  return Math.max(0, nextUnreadCount - previousUnreadCount);
}
