import { NextResponse, type NextRequest } from "next/server"

import { isAuthSecretConfigured } from "@/lib/auth-secret"
import { CLINIC_SESSION_COOKIE } from "@/lib/clinic-auth-constants"
import { isHospitalAdminRole } from "@/lib/clinic-auth-roles"
import { verifySessionToken } from "@/lib/clinic-auth-tokens"

export const config = {
  matcher: [
    "/",
    "/hospital",
    "/hospital/:path*",
    "/signin",
    "/signup",
    "/patients/:path*",
    "/consultations/:path*",
    "/stats/:path*",
    "/settings/:path*",
    "/api/clinic/:path*",
  ],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthPage =
    pathname === "/signin" ||
    pathname === "/signup"

  if (!isAuthSecretConfigured()) {
    if (isAuthPage) return NextResponse.next()
    return NextResponse.redirect(new URL("/signin?error=auth_secret", request.url))
  }

  const token = request.cookies.get(CLINIC_SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (isAuthPage) {
    if (session) return NextResponse.redirect(new URL("/", request.url))
    return NextResponse.next()
  }

  if (!session) {
    const next = `${pathname}${request.nextUrl.search || ""}`
    const url = new URL("/signup", request.url)
    url.searchParams.set("next", next)
    return NextResponse.redirect(url)
  }

  if (pathname === "/hospital" || pathname.startsWith("/hospital/")) {
    if (!isHospitalAdminRole(session.role)) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return NextResponse.next()
}
