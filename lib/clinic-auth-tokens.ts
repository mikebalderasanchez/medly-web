import * as jose from "jose"

import { getAuthSecretBytes } from "@/lib/auth-secret"
import type { ClinicRole } from "@/lib/clinic-auth-roles"
import { isClinicRole } from "@/lib/clinic-auth-roles"

export async function signSessionToken(
  userId: string,
  email: string,
  role: ClinicRole
): Promise<string> {
  return new jose.SignJWT({ typ: "session", email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecretBytes())
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string; email: string; role: ClinicRole } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getAuthSecretBytes(), { algorithms: ["HS256"] })
    if (
      payload.typ !== "session" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      !isClinicRole(payload.role)
    ) {
      return null
    }
    return { userId: payload.sub, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}
