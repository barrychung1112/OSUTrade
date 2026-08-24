import { describe, expect, it, vi } from "vitest";

import { getSignupErrorMessage } from "./signupError";

describe("signup error presentation", () => {
  it("uses localized permanent-email guidance for disposable domains", () => {
    const translate = vi.fn().mockReturnValue("請使用可長期接收郵件的信箱。");

    expect(
      getSignupErrorMessage(
        {
          errorCode: "DISPOSABLE_EMAIL_NOT_ALLOWED",
          message: "English API message",
        },
        translate
      )
    ).toBe("請使用可長期接收郵件的信箱。");
    expect(translate).toHaveBeenCalledWith("auth.disposableEmailNotAllowed");
  });

  it("preserves API messages for other signup failures", () => {
    expect(
      getSignupErrorMessage(
        { errorCode: "EMAIL_ALREADY_REGISTERED", message: "Already used" },
        vi.fn()
      )
    ).toBe("Already used");
  });

  it("falls back to the generic localized signup error", () => {
    const translate = vi.fn().mockReturnValue("Sign up failed");

    expect(getSignupErrorMessage({}, translate)).toBe("Sign up failed");
    expect(translate).toHaveBeenCalledWith("auth.signupError");
  });
});
