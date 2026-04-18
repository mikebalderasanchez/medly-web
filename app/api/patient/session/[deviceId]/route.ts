import { NextResponse } from "next/server"
import { parsePrescriptionAnalysis } from "@/lib/prescription-extraction"
import { parseExpedienteRecord } from "@/lib/patient-chat-context"
import { getPatientSessionByDeviceId, upsertPatientSession } from "@/lib/patient-atlas-session"
import { isAtlasConfigured } from "@/lib/mongodb"

export const runtime = "nodejs"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Device-Id",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(_req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  try {
    const { deviceId } = await params
    if (!isAtlasConfigured()) {
      return NextResponse.json(
        {
          database: false,
          deviceId,
          expediente: null,
          prescriptionAnalysis: null,
          clinicPatientId: null,
          clinicPrescriptionDraft: null,
        },
        { headers: corsHeaders }
      )
    }

    const doc = await getPatientSessionByDeviceId(deviceId)
    return NextResponse.json(
      {
        database: true,
        deviceId,
        expediente: doc?.expediente ?? null,
        prescriptionAnalysis: doc?.prescriptionAnalysis ?? null,
        clinicPatientId: doc?.clinicPatientId?.trim() || null,
        clinicPrescriptionDraft: doc?.clinicPrescriptionDraft ?? null,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al leer la sesión."
    console.error("[patient/session GET]", error)
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  try {
    if (!isAtlasConfigured()) {
      return NextResponse.json(
        { error: "MongoDB no configurado (MONGODB_URI)." },
        { status: 503, headers: corsHeaders }
      )
    }

    const { deviceId } = await params
    const body = (await req.json()) as {
      expediente?: unknown
      prescriptionAnalysis?: unknown
    }

    const patch: Parameters<typeof upsertPatientSession>[1] = {}

    if ("expediente" in body) {
      if (body.expediente === null) {
        patch.expediente = null
      } else {
        const ex = parseExpedienteRecord(body.expediente)
        if (!ex) {
          return NextResponse.json({ error: "expediente inválido" }, { status: 400, headers: corsHeaders })
        }
        patch.expediente = ex
      }
    }

    if ("prescriptionAnalysis" in body) {
      if (body.prescriptionAnalysis === null) {
        patch.prescriptionAnalysis = null
      } else if (typeof body.prescriptionAnalysis === "object" && body.prescriptionAnalysis !== null) {
        try {
          patch.prescriptionAnalysis = parsePrescriptionAnalysis(
            JSON.stringify(body.prescriptionAnalysis)
          )
        } catch {
          return NextResponse.json(
            { error: "prescriptionAnalysis inválido" },
            { status: 400, headers: corsHeaders }
          )
        }
      } else {
        return NextResponse.json(
          { error: "prescriptionAnalysis inválido" },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    if (!("expediente" in body) && !("prescriptionAnalysis" in body)) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400, headers: corsHeaders })
    }

    await upsertPatientSession(deviceId, patch)
    return NextResponse.json({ ok: true }, { headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar la sesión."
    console.error("[patient/session PATCH]", error)
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}
