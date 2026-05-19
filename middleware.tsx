// middleware.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * 使用 NextAuth 的 middleware 包裝器，讓我們能夠取得 req.auth（session）
 * 並在這裡做自訂的存取控制與導轉。
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname, search } = req.nextUrl;

  // 你要保護的路徑清單（依需要擴充）
  const protectedPrefixes = ["/overview"];

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAuthPage = pathname === "/";

  // 未登入 → 擋受保護頁，導到 /login?from=<原路徑>
  if (isProtected && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("from", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  // 已登入 → 避免再進登入頁，直接導回 overview（可依需求改成首頁）
  if (isAuthPage && isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/overview";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 其餘請求放行
  return NextResponse.next();
});

/**
 * 只在需要的路徑觸發 middleware，避免影響靜態資源與 API。
 * - 受保護頁：/overview
 * - 登入頁：/login
 * - 排除：/api, _next 靜態資源, 圖片與 favicon
 */
export const config = {
  matcher: [
    "/overview/:path*",
    "/",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
