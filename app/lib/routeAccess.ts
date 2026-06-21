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
