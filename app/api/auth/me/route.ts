import { NextResponse } from "next/server"

import { effectiveClinicRole, findClinicAuthUserById } from "@/lib/clinic-auth-repository"
import { requireClinicSession } from "@/lib/require-clinic-session"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    const user = await findClinicAuthUserById(auth.userId)
    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 })
    }

    const role = effectiveClinicRole(user)
    return NextResponse.json({
      user: {
        id: user._id.toHexString(),
        email: user.email,
        role,
        displayName: user.displayName?.trim() || null,
        specialty: user.specialty?.trim() || null,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al leer el perfil."
    console.error("[auth/me GET]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
