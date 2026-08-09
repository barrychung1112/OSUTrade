const SUPABASE_STORAGE_PATH = "/storage/v1/object/";

export function shouldBypassProductImageOptimization(src: string) {
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.startsWith(SUPABASE_STORAGE_PATH)
    );
  } catch {
    return false;
  }
}
