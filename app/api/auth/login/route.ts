import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { isAuthSecretConfigured } from "@/lib/auth-secret"
import {
  effectiveClinicRole,
  findClinicAuthUserByEmail,
  isAccountLoginEnabled,
} from "@/lib/clinic-auth-repository"
import { signSessionToken } from "@/lib/clinic-auth-tokens"
import { setClinicSessionCookie } from "@/lib/clinic-session-cookie"
import { isAtlasConfigured } from "@/lib/mongodb"

export const runtime = "nodejs"

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

    const user = await findClinicAuthUserByEmail(email)
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 })
    }

    if (!isAccountLoginEnabled(user)) {
      return NextResponse.json(
        {
          error:
            "Esta cuenta quedó a medias en un registro anterior. Crea una cuenta nueva con otro correo o contacta al administrador.",
        },
        { status: 403 }
      )
    }

    const role = effectiveClinicRole(user)
    const sessionToken = await signSessionToken(user._id.toHexString(), user.email, role)
    await setClinicSessionCookie(sessionToken)

    return NextResponse.json({ ok: true, role })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al iniciar sesión."
    console.error("[auth/login POST]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
