export const requestResponseWindowMs = 48 * 60 * 60 * 1000;

export function isExpiredSentRequest(row: {
  status: string;
  created_at: string;
  now?: number;
}) {
  return (
    row.status === "sent" &&
    (row.now ?? Date.now()) - new Date(row.created_at).getTime() >
      requestResponseWindowMs
  );
}
