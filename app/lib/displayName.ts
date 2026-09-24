export type DisplayNameResult =
  | { value: string }
  | { error: "DISPLAY_NAME_INVALID" };

export function normalizeDisplayName(value: unknown): DisplayNameResult {
  const rawValue = String(value ?? "");
  if (/[\u0000-\u001F\u007F]/.test(rawValue)) {
    return { error: "DISPLAY_NAME_INVALID" };
  }

  const normalized = rawValue
    .trim()
    .replace(/\s+/g, " ");

  if (
    normalized.length < 2 ||
    normalized.length > 32
  ) {
    return { error: "DISPLAY_NAME_INVALID" };
  }

  return { value: normalized };
}

export function escapeDisplayNameLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
