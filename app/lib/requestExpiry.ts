export const requestResponseWindowMs = 48 * 60 * 60 * 1000;

export function isExpiredSentRequest(row: {
  status: string;
  created_at: string;
}) {
  return (
    row.status === "sent" &&
    Date.now() - new Date(row.created_at).getTime() > requestResponseWindowMs
  );
}
