import { describe, expect, test } from "vitest";
import { shouldPromptLoginForRequestAction } from "./requestActionAccess";

describe("shouldPromptLoginForRequestAction", () => {
  test("prompts visitors to log in before sending a trade request", () => {
    expect(
      shouldPromptLoginForRequestAction({
        authStatus: "unauthenticated",
        hasUser: false,
      })
    ).toBe(true);
  });

  test("allows authenticated users to send trade requests", () => {
    expect(
      shouldPromptLoginForRequestAction({
        authStatus: "authenticated",
        hasUser: true,
      })
    ).toBe(false);
  });
});
