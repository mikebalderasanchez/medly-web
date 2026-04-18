import { NextResponse } from "next/server"

import { updateClinicAuthUserProfile } from "@/lib/clinic-auth-repository"
import { requireClinicSession } from "@/lib/require-clinic-session"

export const runtime = "nodejs"

const MAX = 160

export async function PATCH(req: Request) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    const body = (await req.json()) as Record<string, unknown>
    const displayName =
      typeof body.displayName === "string" ? body.displayName.slice(0, MAX) : undefined
    const specialty = typeof body.specialty === "string" ? body.specialty.slice(0, MAX) : undefined

    if (displayName === undefined && specialty === undefined) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 })
    }

    const ok = await updateClinicAuthUserProfile(auth.userId, {
      displayName: displayName !== undefined ? displayName : undefined,
      specialty: specialty !== undefined ? specialty : undefined,
    })
    if (!ok) {
      return NextResponse.json({ error: "No se pudo guardar el perfil." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar."
    console.error("[auth/profile PATCH]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
