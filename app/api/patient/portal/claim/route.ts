import { NextResponse } from "next/server"

import { clinicPatientToExpediente } from "@/lib/clinic-patient-to-expediente"
import { getClinicPatientById } from "@/lib/clinic-repository"
import { isAtlasConfigured } from "@/lib/mongodb"
import { consumePatientPortalInvite } from "@/lib/patient-portal-invite"
import { upsertPatientSession } from "@/lib/patient-atlas-session"

export const runtime = "nodejs"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

function parseDeviceId(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const id = raw.trim()
  if (!id || id.length > 128) return null
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return null
  return id
}

export async function POST(req: Request) {
  try {
    if (!isAtlasConfigured()) {
      return NextResponse.json(
        { error: "MongoDB no configurado (MONGODB_URI)." },
        { status: 503, headers: corsHeaders }
      )
    }

    const body = (await req.json()) as Record<string, unknown>
    const deviceId = parseDeviceId(body.deviceId)
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId inválido." }, { status: 400, headers: corsHeaders })
    }

    let publicId: string | null = null
    let rawToken: string | null = null

    const line = typeof body.inviteLine === "string" ? body.inviteLine.trim() : ""
    if (line.includes(":")) {
      const idx = line.indexOf(":")
      publicId = line.slice(0, idx).trim()
      rawToken = line.slice(idx + 1).trim()
    } else {
      publicId = typeof body.publicId === "string" ? body.publicId.trim() : null
      rawToken = typeof body.token === "string" ? body.token.trim() : null
    }

    if (!publicId || !rawToken) {
      return NextResponse.json(
        { error: "Faltan publicId y token, o la línea inviteLine (formato UUID:token)." },
        { status: 400, headers: corsHeaders }
      )
    }

    const consumed = await consumePatientPortalInvite(publicId, rawToken)
    if (!consumed.ok) {
      const map: Record<string, string> = {
        not_found: "Invitación no encontrada.",
        used: "Esta invitación ya fue usada.",
        expired: "La invitación expiró.",
        token: "Código incorrecto.",
        race: "No se pudo validar. Intenta de nuevo.",
        db: "Base de datos no disponible.",
      }
      return NextResponse.json(
        { error: map[consumed.reason] ?? "No se pudo canjear." },
        { status: 400, headers: corsHeaders }
      )
    }

    const patient = await getClinicPatientById(consumed.patientId)
    if (!patient) {
      return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404, headers: corsHeaders })
    }

    const expediente = clinicPatientToExpediente(patient)
    await upsertPatientSession(deviceId, { expediente })

    return NextResponse.json(
      {
        ok: true,
        patientName: patient.name,
        deviceId,
      },
      { headers: corsHeaders }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al vincular."
    console.error("[patient/portal/claim POST]", e)
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}
