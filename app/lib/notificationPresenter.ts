export type NotificationRow = {
  notification_id: string;
  type: string;
  title: string;
  body: string;
  request_id?: string | null;
  product_id?: string | null;
  payload?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
};

export function toNotification(row: NotificationRow) {
  const payload = row.payload ?? {};
  const actionHref =
    typeof payload.actionHref === "string" ? payload.actionHref : null;

  return {
    id: row.notification_id,
    type: row.type,
    title: row.title,
    body: row.body,
    requestId: row.request_id ?? null,
    productId: row.product_id ?? null,
    actionHref,
    payload,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

export function getUnreadCount(rows: Array<{ read_at?: string | null }>) {
  return rows.filter((row) => !row.read_at).length;
}
