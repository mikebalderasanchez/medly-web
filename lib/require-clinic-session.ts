import { NextResponse } from "next/server"

import { resolveClinicSession } from "@/lib/clinic-auth-request-session"
import type { ClinicRole } from "@/lib/clinic-auth-roles"
import { isHospitalAdminRole } from "@/lib/clinic-auth-roles"

export async function requireClinicSession(
  req: Request
): Promise<{ ok: true; userId: string; email: string; role: ClinicRole } | { ok: false; response: NextResponse }> {
  const session = await resolveClinicSession(req)
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 401 }),
    }
  }
  return { ok: true, ...session }
}

export async function requireHospitalAdminSession(
  req: Request
): Promise<{ ok: true; userId: string; email: string } | { ok: false; response: NextResponse }> {
  const session = await resolveClinicSession(req)
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 401 }),
    }
  }
  if (!isHospitalAdminRole(session.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Solo administración del hospital." }, { status: 403 }),
    }
  }
  return { ok: true, userId: session.userId, email: session.email }
}
