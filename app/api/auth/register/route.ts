import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { isAuthSecretConfigured } from "@/lib/auth-secret"
import {
  countClinicAuthUsers,
  ensureClinicAuthIndexes,
  findClinicAuthUserByEmail,
  insertClinicAuthUser,
} from "@/lib/clinic-auth-repository"
import { CLINIC_ROLES } from "@/lib/clinic-auth-roles"
import { signSessionToken } from "@/lib/clinic-auth-tokens"
import { setClinicSessionCookie } from "@/lib/clinic-session-cookie"
import { isAtlasConfigured } from "@/lib/mongodb"

export const runtime = "nodejs"

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export async function POST(req: Request) {
  try {
    if (!isAuthSecretConfigured()) {
      return NextResponse.json(
        { error: "Configura AUTH_SECRET (≥32 caracteres) en el servidor." },
        { status: 503 }
      )
    }
    if (!isAtlasConfigured()) {
      return NextResponse.json({ error: "MongoDB no configurado (MONGODB_URI)." }, { status: 503 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!emailOk(email)) {
      return NextResponse.json({ error: "Correo no válido." }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      )
    }

    await ensureClinicAuthIndexes()

    const total = await countClinicAuthUsers()
    if (total === null) {
      return NextResponse.json({ error: "No se pudo comprobar el estado del sistema." }, { status: 503 })
    }
    if (total > 0) {
      return NextResponse.json(
        {
          error:
            "El registro público está cerrado. El administrador del hospital debe crear tu acceso desde el panel de equipo médico.",
        },
        { status: 403 }
      )
    }

    const existing = await findClinicAuthUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: "Ese correo ya está registrado." }, { status: 409 })
    }

    const passwordHash = bcrypt.hashSync(password, 12)
    const inserted = await insertClinicAuthUser({
      email,
      passwordHash,
      role: CLINIC_ROLES.HOSPITAL_ADMIN,
    })
    if (!inserted.ok) {
      if (inserted.duplicate) {
        return NextResponse.json({ error: "Ese correo ya está registrado." }, { status: 409 })
      }
      return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 503 })
    }

    const sessionToken = await signSessionToken(inserted.id, email, CLINIC_ROLES.HOSPITAL_ADMIN)
    await setClinicSessionCookie(sessionToken)

    return NextResponse.json({ ok: true, role: CLINIC_ROLES.HOSPITAL_ADMIN })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al registrar."
    console.error("[auth/register POST]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
