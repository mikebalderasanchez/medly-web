import { verifySessionToken } from "@/lib/clinic-auth-tokens"
import type { ClinicRole } from "@/lib/clinic-auth-roles"
import { getClinicSessionFromCookies } from "@/lib/clinic-session-cookie"

export type ResolvedClinicSession = { userId: string; email: string; role: ClinicRole }

export async function resolveClinicSession(req: Request): Promise<ResolvedClinicSession | null> {
  const auth = req.headers.get("authorization")
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim()
    if (token) {
      const s = await verifySessionToken(token)
      if (s) return s
    }
  }
  return getClinicSessionFromCookies()
}
