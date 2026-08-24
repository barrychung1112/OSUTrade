import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkDisposableEmail,
  getEmailDomainCandidates,
} from "./disposableEmail";

function createAdminResult(result: {
  data: Array<{ domain: string }> | null;
  error: { message: string } | null;
}) {
  const inQuery = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ in: inQuery });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return {
    admin: { from },
    from,
    inQuery,
  };
}

describe("disposable email domain matching", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes domains and includes parent-domain candidates", () => {
    expect(getEmailDomainCandidates(" User@MAIL.HutDot.Com ")).toEqual([
      "mail.hutdot.com",
      "hutdot.com",
    ]);
  });

  it("reports an active exact or parent-domain match", async () => {
    const { admin, from, inQuery } = createAdminResult({
      data: [{ domain: "hutdot.com" }],
      error: null,
    });

    await expect(
      checkDisposableEmail("user@mail.hutdot.com", admin as never)
    ).resolves.toEqual({ blocked: true });
    expect(from).toHaveBeenCalledWith("disposable_email_domains");
    expect(inQuery).toHaveBeenCalledWith("domain", [
      "mail.hutdot.com",
      "hutdot.com",
    ]);
  });

  it("allows unrelated permanent email domains", async () => {
    const { admin } = createAdminResult({ data: [], error: null });

    await expect(
      checkDisposableEmail("student@oregonstate.edu", admin as never)
    ).resolves.toEqual({ blocked: false });
  });

  it("fails open and records a lookup error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { admin } = createAdminResult({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(
      checkDisposableEmail("user@hutdot.com", admin as never)
    ).resolves.toEqual({ blocked: false });
    expect(log).toHaveBeenCalledWith(
      "Disposable email domain lookup failed.",
      expect.objectContaining({ error: "database unavailable" })
    );
  });

  it("fails open when the lookup throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const inQuery = vi.fn().mockRejectedValue(new Error("network unavailable"));
    const admin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ in: inQuery }),
        }),
      }),
    };

    await expect(
      checkDisposableEmail("user@hutdot.com", admin as never)
    ).resolves.toEqual({ blocked: false });
    expect(log).toHaveBeenCalledWith(
      "Disposable email domain lookup failed.",
      expect.objectContaining({ error: "network unavailable" })
    );
  });
});
