import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDevDebugRoutesEnabled } from "@/lib/receipt-engine-debug/devGuard";

const DEV_PAGE_PREFIXES = ["/ocr/debug", "/receipt-engine/debug"];

const DEV_API_PREFIXES = [
  "/api/ocr/debug",
  "/api/receipt-engine/debug",
  "/api/receipt-engine/debug-package",
];

export function middleware(request: NextRequest) {
  if (isDevDebugRoutesEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (DEV_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  if (DEV_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ocr/debug/:path*",
    "/receipt-engine/debug/:path*",
    "/api/ocr/debug",
    "/api/receipt-engine/debug",
    "/api/receipt-engine/debug-package",
  ],
};
