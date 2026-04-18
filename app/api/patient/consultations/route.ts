import { NextResponse } from "next/server"

import { listConsultationsForPatient } from "@/lib/clinic-repository"
import { getPatientSessionByDeviceId } from "@/lib/patient-atlas-session"
import { isAtlasConfigured } from "@/lib/mongodb"

export const runtime = "nodejs"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Device-Id",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

function parseDeviceId(raw: string | null): string | null {
  if (!raw) return null
  const id = raw.trim()
  if (!id || id.length > 128) return null
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return null
  return id
}

export async function GET(req: Request) {
  try {
    if (!isAtlasConfigured()) {
      return NextResponse.json({ database: false, consultations: [] as const }, { headers: corsHeaders })
    }

    const deviceId = parseDeviceId(new URL(req.url).searchParams.get("deviceId"))
    if (!deviceId) {
      return NextResponse.json({ error: "Parámetro deviceId inválido o ausente." }, { status: 400, headers: corsHeaders })
    }

    const session = await getPatientSessionByDeviceId(deviceId)
    const pid = session?.clinicPatientId?.trim()
    if (!pid) {
      return NextResponse.json({ database: true, consultations: [] as const }, { headers: corsHeaders })
    }

    const rows = await listConsultationsForPatient(pid)
    return NextResponse.json(
      {
        database: true,
        consultations: rows.map((r) => ({
          id: r.id,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al listar consultas."
    console.error("[patient/consultations GET]", error)
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}
