import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { isAuthSecretConfigured } from "@/lib/auth-secret"
import {
  effectiveClinicRole,
  findClinicAuthUserByEmail,
  isAccountLoginEnabled,
} from "@/lib/clinic-auth-repository"
import { signSessionToken } from "@/lib/clinic-auth-tokens"
import { isAtlasConfigured } from "@/lib/mongodb"

export const runtime = "nodejs"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(req: Request) {
  try {
    if (!isAuthSecretConfigured()) {
      return NextResponse.json(
        { error: "AUTH_SECRET no configurado." },
        { status: 503, headers: corsHeaders }
      )
    }
    if (!isAtlasConfigured()) {
      return NextResponse.json({ error: "MongoDB no configurado." }, { status: 503, headers: corsHeaders })
    }

    const body = (await req.json()) as Record<string, unknown>
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    const user = await findClinicAuthUserByEmail(email)
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401, headers: corsHeaders })
    }

    if (!isAccountLoginEnabled(user)) {
      return NextResponse.json({ error: "Cuenta no disponible." }, { status: 403, headers: corsHeaders })
    }

    const role = effectiveClinicRole(user)
    const accessToken = await signSessionToken(user._id.toHexString(), user.email, role)

    return NextResponse.json(
      {
        accessToken,
        tokenType: "Bearer",
        expiresInSeconds: 60 * 60 * 24 * 7,
        role,
        email: user.email,
      },
      { headers: corsHeaders }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al iniciar sesión."
    console.error("[auth/mobile/login POST]", e)
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}
