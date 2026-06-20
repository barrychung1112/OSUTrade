type AuthStatus = "authenticated" | "loading" | "unauthenticated";

export function getHomeCtaAction({
  path,
  authStatus,
  hasUser,
}: {
  path: string;
  authStatus: AuthStatus;
  hasUser: boolean;
}) {
  if (path === "/overview") {
    return { type: "navigate" as const, path };
  }

  if (authStatus === "authenticated" && hasUser) {
    return { type: "navigate" as const, path };
  }

  return { type: "login" as const, path };
}
