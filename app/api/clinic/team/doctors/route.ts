import bcrypt from "bcryptjs"
import { ObjectId } from "mongodb"
import { NextResponse } from "next/server"

import {
  ensureClinicAuthIndexes,
  findClinicAuthUserByEmail,
  insertClinicAuthUser,
  listDoctorUsers,
} from "@/lib/clinic-auth-repository"
import { CLINIC_ROLES } from "@/lib/clinic-auth-roles"
import { isAtlasConfigured } from "@/lib/mongodb"
import { requireHospitalAdminSession } from "@/lib/require-clinic-session"

export const runtime = "nodejs"

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export async function GET(req: Request) {
  try {
    const gate = await requireHospitalAdminSession(req)
    if (!gate.ok) return gate.response

    if (!isAtlasConfigured()) {
      return NextResponse.json({ error: "MongoDB no configurado." }, { status: 503 })
    }

    await ensureClinicAuthIndexes()
    const doctors = await listDoctorUsers()
    return NextResponse.json({ ok: true, doctors })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al listar."
    console.error("[clinic/team/doctors GET]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireHospitalAdminSession(req)
    if (!gate.ok) return gate.response

    if (!isAtlasConfigured()) {
      return NextResponse.json({ error: "MongoDB no configurado." }, { status: 503 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""

    if (!emailOk(email)) {
      return NextResponse.json({ error: "Correo no válido." }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña del médico debe tener al menos 8 caracteres." },
        { status: 400 }
      )
    }

    await ensureClinicAuthIndexes()

    const existing = await findClinicAuthUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: "Ese correo ya está en uso." }, { status: 409 })
    }

    const passwordHash = bcrypt.hashSync(password, 12)
    const inserted = await insertClinicAuthUser({
      email,
      passwordHash,
      role: CLINIC_ROLES.DOCTOR,
      displayName: displayName || null,
      createdBy: new ObjectId(gate.userId),
    })

    if (!inserted.ok) {
      if (inserted.duplicate) {
        return NextResponse.json({ error: "Ese correo ya está en uso." }, { status: 409 })
      }
      return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 503 })
    }

    return NextResponse.json({
      ok: true,
      doctor: { id: inserted.id, email, displayName: displayName || null },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear médico."
    console.error("[clinic/team/doctors POST]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
