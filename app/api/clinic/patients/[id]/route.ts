import { NextResponse } from "next/server"
import {
  deleteClinicPatient,
  getClinicPatientById,
  updateClinicPatient,
  type UpdateClinicPatientInput,
} from "@/lib/clinic-repository"
import { isAtlasConfigured } from "@/lib/mongodb"
import { requireClinicSession } from "@/lib/require-clinic-session"

export const runtime = "nodejs"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    if (!isAtlasConfigured()) {
      return NextResponse.json({ configured: false, patient: null }, { status: 200 })
    }
    const { id } = await params
    const patient = await getClinicPatientById(id)
    if (!patient) {
      return NextResponse.json({ configured: true, patient: null }, { status: 404 })
    }
    return NextResponse.json({ configured: true, patient })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al leer paciente."
    console.error("[clinic/patients/[id] GET]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    if (!isAtlasConfigured()) {
      return NextResponse.json({ error: "MongoDB no configurado (MONGODB_URI)." }, { status: 503 })
    }

    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    const patch: UpdateClinicPatientInput = {}
    if (typeof body.name === "string") patch.name = body.name
    if (body.age !== undefined) {
      const ageNum = Number(body.age)
      if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 130) {
        return NextResponse.json({ error: "Edad inválida." }, { status: 400 })
      }
      patch.age = ageNum
    }
    if (typeof body.gender === "string") patch.gender = body.gender
    if (typeof body.bloodType === "string") patch.bloodType = body.bloodType
    if (typeof body.allergies === "string") patch.allergies = body.allergies
    if (typeof body.chronicConditions === "string") patch.chronicConditions = body.chronicConditions
    if (typeof body.phone === "string") patch.phone = body.phone
    if (typeof body.email === "string") {
      const em = body.email.trim()
      if (em && !emailOk(em)) {
        return NextResponse.json({ error: "Correo no válido." }, { status: 400 })
      }
      patch.email = body.email
    }
    if (typeof body.notes === "string") patch.notes = body.notes
    if (typeof body.status === "string") patch.status = body.status
    if (typeof body.lastVisit === "string") patch.lastVisit = body.lastVisit

    const updated = await updateClinicPatient(id, patch)
    if (!updated) {
      return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 })
    }
    return NextResponse.json({ ok: true, patient: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar paciente."
    console.error("[clinic/patients/[id] PATCH]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    if (!isAtlasConfigured()) {
      return NextResponse.json({ error: "MongoDB no configurado (MONGODB_URI)." }, { status: 503 })
    }

    const { id } = await params
    const ok = await deleteClinicPatient(id)
    if (!ok) {
      return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar paciente."
    console.error("[clinic/patients/[id] DELETE]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
