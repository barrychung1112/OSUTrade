type SignupErrorPayload = {
  errorCode?: string;
  message?: string;
};

type SignupErrorTranslationKey =
  | "auth.disposableEmailNotAllowed"
  | "auth.signupError";

export function getSignupErrorMessage(
  payload: SignupErrorPayload,
  translate: (key: SignupErrorTranslationKey) => string
) {
  if (payload.errorCode === "DISPOSABLE_EMAIL_NOT_ALLOWED") {
    return translate("auth.disposableEmailNotAllowed");
  }

  return payload.message || translate("auth.signupError");
}
