type AuthStatus = "authenticated" | "loading" | "unauthenticated";

export function shouldPromptLoginForRequestAction({
  authStatus,
  hasUser,
}: {
  authStatus: AuthStatus;
  hasUser: boolean;
}) {
  return authStatus !== "authenticated" || !hasUser;
}
