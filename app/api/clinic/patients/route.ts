import { NextResponse } from "next/server"
import { insertClinicPatient, listClinicPatientsFromDb } from "@/lib/clinic-repository"
import { isAtlasConfigured } from "@/lib/mongodb"
import { requireClinicSession } from "@/lib/require-clinic-session"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    if (!isAtlasConfigured()) {
      return NextResponse.json(
        { ok: false, configured: false, patients: [] as const },
        { status: 200 }
      )
    }
    const patients = await listClinicPatientsFromDb()
    if (!patients) {
      return NextResponse.json(
        { ok: false, configured: true, error: "No se pudo leer la base de datos." },
        { status: 503 }
      )
    }
    return NextResponse.json({ ok: true, configured: true, patients })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al listar pacientes."
    console.error("[clinic/patients GET]", e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    if (!isAtlasConfigured()) {
      return NextResponse.json(
        { error: "MongoDB no configurado (MONGODB_URI)." },
        { status: 503 }
      )
    }

    const body = (await req.json()) as Record<string, unknown>
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const ageNum = Number(body.age)
    const gender = typeof body.gender === "string" ? body.gender : ""
    const bloodType = typeof body.bloodType === "string" ? body.bloodType : ""

    if (name.length < 2) {
      return NextResponse.json({ error: "Nombre inválido." }, { status: 400 })
    }
    if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 130) {
      return NextResponse.json({ error: "Edad inválida." }, { status: 400 })
    }
    if (!gender.trim()) {
      return NextResponse.json({ error: "Género requerido." }, { status: 400 })
    }
    if (!bloodType.trim()) {
      return NextResponse.json({ error: "Tipo de sangre requerido." }, { status: 400 })
    }

    const allergies = typeof body.allergies === "string" ? body.allergies : ""
    const chronicConditions = typeof body.chronicConditions === "string" ? body.chronicConditions : ""
    const phone = typeof body.phone === "string" ? body.phone : ""
    const email = typeof body.email === "string" ? body.email : ""
    const notes = typeof body.notes === "string" ? body.notes : ""

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Correo no válido." }, { status: 400 })
    }

    const doc = await insertClinicPatient({
      name,
      age: ageNum,
      gender,
      bloodType,
      allergies,
      chronicConditions,
      phone,
      email,
      notes,
    })

    return NextResponse.json({ ok: true, patient: doc })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear paciente."
    console.error("[clinic/patients POST]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
