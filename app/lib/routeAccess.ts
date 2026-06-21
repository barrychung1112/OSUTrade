const protectedPrefixes = ["/sell", "/seller", "/requests"];

function normalizePath(path: string) {
  const [pathname] = path.split("?");
  return pathname || "/";
}

export function requiresLogin(path: string) {
  const pathname = normalizePath(path);
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function getMiddlewareRedirect({
  pathname,
  search,
  isLoggedIn,
}: {
  pathname: string;
  search: string;
  isLoggedIn: boolean;
}) {
  if (requiresLogin(pathname) && !isLoggedIn) {
    return { pathname: "/", from: pathname + (search || "") };
  }

  return null;
}
