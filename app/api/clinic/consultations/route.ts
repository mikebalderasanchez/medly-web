import { NextResponse } from "next/server"
import {
  ensureClinicPatientForConsultation,
  insertClinicConsultation,
  listClinicConsultationsFromDb,
} from "@/lib/clinic-repository"
import type { ConsultationExtraction } from "@/lib/consultation-extraction"
import { parseConsultationPrescriptionBody } from "@/lib/clinic-consultation-prescription"
import { isAtlasConfigured } from "@/lib/mongodb"
import { requireClinicSession } from "@/lib/require-clinic-session"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    if (!isAtlasConfigured()) {
      return NextResponse.json({ ok: false, configured: false, consultations: [] as const })
    }
    const consultations = await listClinicConsultationsFromDb()
    if (!consultations) {
      return NextResponse.json(
        { ok: false, configured: true, error: "No se pudo leer la base de datos." },
        { status: 503 }
      )
    }
    return NextResponse.json({ ok: true, configured: true, consultations })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al listar consultas."
    console.error("[clinic/consultations GET]", e)
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
    const patientId = typeof body.patientId === "string" && body.patientId.trim() ? body.patientId.trim() : null
    const patientName =
      typeof body.patientName === "string" && body.patientName.trim() ? body.patientName.trim() : null
    const transcription = typeof body.transcription === "string" ? body.transcription : ""

    let structured: ConsultationExtraction | null = null
    if (body.structured !== undefined && body.structured !== null) {
      if (typeof body.structured !== "object") {
        return NextResponse.json({ error: "structured inválido." }, { status: 400 })
      }
      structured = body.structured as ConsultationExtraction
    }

    const prescription = parseConsultationPrescriptionBody(body.prescription)
    const reasonOverride =
      typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 200) : null

    const notesTrim =
      typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 12000) : ""

    const consent = body.patientConsentAccepted
    if (typeof consent !== "boolean") {
      return NextResponse.json(
        { error: "Indique si el paciente está de acuerdo (patientConsentAccepted: true o false)." },
        { status: 400 }
      )
    }

    let patientConsentManualReason: string | null = null
    let patientConsentManualDetail: string | null = null
    if (!consent) {
      const mr =
        typeof body.patientConsentManualReason === "string" ? body.patientConsentManualReason.trim().slice(0, 4000) : ""
      const md =
        typeof body.patientConsentManualDetail === "string"
          ? body.patientConsentManualDetail.trim().slice(0, 8000)
          : ""
      if (!mr) {
        return NextResponse.json(
          {
            error:
              "Si el paciente no está de acuerdo, describa el motivo (patientConsentManualReason) y opcionalmente más detalle (patientConsentManualDetail).",
          },
          { status: 400 }
        )
      }
      patientConsentManualReason = mr
      patientConsentManualDetail = md || null
    }

    if (!structured && !prescription?.previewText?.trim() && !transcription.trim() && !reasonOverride && !notesTrim) {
      return NextResponse.json(
        { error: "Nada que guardar: añade transcripción, datos estructurados, notas, borrador de receta o motivo manual." },
        { status: 400 }
      )
    }

    const resolvedName =
      patientName ??
      (structured?.patient?.name?.trim() ? structured.patient.name.trim() : null)

    let effectivePatientId = patientId
    if (!effectivePatientId) {
      const ensured = await ensureClinicPatientForConsultation({
        structured,
        resolvedName,
      })
      if (ensured) effectivePatientId = ensured
    }

    const doc = await insertClinicConsultation({
      patientId: effectivePatientId,
      patientName: resolvedName,
      transcription,
      structured,
      prescription,
      status: typeof body.status === "string" ? body.status : "Completada",
      reasonOverride,
      notes: notesTrim || null,
      patientConsentAccepted: consent,
      patientConsentManualReason,
      patientConsentManualDetail,
    })

    return NextResponse.json({ ok: true, consultation: doc })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar consulta."
    console.error("[clinic/consultations POST]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
