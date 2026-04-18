import { cookies } from "next/headers"

import type { ClinicRole } from "@/lib/clinic-auth-roles"
import { CLINIC_SESSION_COOKIE } from "@/lib/clinic-auth-constants"
import { verifySessionToken } from "@/lib/clinic-auth-tokens"

const week = 60 * 60 * 24 * 7

export async function setClinicSessionCookie(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(CLINIC_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: week,
    path: "/",
  })
}

export async function clearClinicSessionCookie(): Promise<void> {
  const jar = await cookies()
  jar.set(CLINIC_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
}

export async function getClinicSessionFromCookies(): Promise<{
  userId: string
  email: string
  role: ClinicRole
} | null> {
  const jar = await cookies()
  const token = jar.get(CLINIC_SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
