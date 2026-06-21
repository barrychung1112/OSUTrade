import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMiddlewareRedirect } from "@/app/lib/routeAccess";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname, search } = req.nextUrl;

  const redirect = getMiddlewareRedirect({
    pathname,
    search,
    isLoggedIn,
  });

  if (redirect) {
    const url = req.nextUrl.clone();
    url.pathname = redirect.pathname;
    url.searchParams.set("from", redirect.from);
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
