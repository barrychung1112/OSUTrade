import { createAdminClient } from "@/utils/supabase/admin";

type BlocklistRow = { domain: string };

type BlocklistClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: boolean): {
        in(
          column: string,
          values: string[]
        ): Promise<{
          data: BlocklistRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export function getEmailDomainCandidates(email: string) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const separator = normalizedEmail.lastIndexOf("@");
  const domain = normalizedEmail.slice(separator + 1).replace(/\.$/, "");
  const labels = domain.split(".").filter(Boolean);

  if (separator < 1 || labels.length < 2) {
    return [];
  }

  return labels.slice(0, -1).map((_, index) => labels.slice(index).join("."));
}

export async function checkDisposableEmail(
  email: string,
  admin: BlocklistClient = createAdminClient() as unknown as BlocklistClient
) {
  const candidates = getEmailDomainCandidates(email);

  if (candidates.length === 0) {
    return { blocked: false };
  }

  const { data, error } = await admin
    .from("disposable_email_domains")
    .select("domain")
    .eq("active", true)
    .in("domain", candidates);

  if (error) {
    console.error("Disposable email domain lookup failed.", {
      error: error.message,
    });
    return { blocked: false };
  }

  return { blocked: Boolean(data?.length) };
}
