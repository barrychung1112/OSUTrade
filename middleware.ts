import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requiresLogin } from "@/app/lib/routeAccess";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname, search } = req.nextUrl;

  const isProtected = requiresLogin(pathname);
  const isAuthPage = pathname === "/";

  if (isProtected && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("from", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/overview";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/sell/:path*",
    "/seller/:path*",
    "/requests/:path*",
    "/",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
