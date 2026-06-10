import { afterEach, expect, test } from "vitest";
import { getGoogleAuthConfig } from "./googleConfig";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test("enables Google auth only when OAuth and Supabase admin config are present", () => {
  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";

  expect(getGoogleAuthConfig()).toMatchObject({
    clientId: "google-client",
    clientSecret: "google-secret",
    configured: true,
  });
});

test("does not enable Google auth without Supabase service role access", () => {
  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  expect(getGoogleAuthConfig().configured).toBe(false);
});

test.each([
  ["Google client id", "GOOGLE_CLIENT_ID"],
  ["Google client secret", "GOOGLE_CLIENT_SECRET"],
  ["Supabase URL", "NEXT_PUBLIC_SUPABASE_URL"],
  ["Supabase service role key", "SUPABASE_SERVICE_ROLE_KEY"],
])("does not enable Google auth without %s", (_label, missingKey) => {
  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  delete process.env[missingKey];

  expect(getGoogleAuthConfig().configured).toBe(false);
});
