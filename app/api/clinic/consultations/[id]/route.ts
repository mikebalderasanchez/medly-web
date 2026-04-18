import { NextResponse } from "next/server"
import {
  deleteClinicConsultation,
  getClinicConsultationById,
  updateClinicConsultation,
} from "@/lib/clinic-repository"
import { parseConsultationPrescriptionBody } from "@/lib/clinic-consultation-prescription"
import { isAtlasConfigured } from "@/lib/mongodb"
import { requireClinicSession } from "@/lib/require-clinic-session"

export const runtime = "nodejs"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    if (!isAtlasConfigured()) {
      return NextResponse.json({ configured: false, consultation: null }, { status: 200 })
    }
    const { id } = await params
    const consultation = await getClinicConsultationById(id)
    if (!consultation) {
      return NextResponse.json({ configured: true, consultation: null }, { status: 404 })
    }
    return NextResponse.json({ configured: true, consultation })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al leer consulta."
    console.error("[clinic/consultations/[id] GET]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    if (!isAtlasConfigured()) {
      return NextResponse.json({ error: "MongoDB no configurado (MONGODB_URI)." }, { status: 503 })
    }

    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const patch: Parameters<typeof updateClinicConsultation>[1] = {}
    if (typeof body.reason === "string") patch.reason = body.reason
    if (typeof body.status === "string") patch.status = body.status
    if (body.transcription === null) patch.transcription = null
    else if (typeof body.transcription === "string") patch.transcription = body.transcription
    if (body.notes === null) patch.notes = null
    else if (typeof body.notes === "string") patch.notes = body.notes

    if (body.patientConsentAccepted === null) patch.patientConsentAccepted = null
    else if (typeof body.patientConsentAccepted === "boolean") patch.patientConsentAccepted = body.patientConsentAccepted

    if (body.patientConsentManualReason === null) patch.patientConsentManualReason = null
    else if (typeof body.patientConsentManualReason === "string") patch.patientConsentManualReason = body.patientConsentManualReason

    if (body.patientConsentManualDetail === null) patch.patientConsentManualDetail = null
    else if (typeof body.patientConsentManualDetail === "string") patch.patientConsentManualDetail = body.patientConsentManualDetail

    if ("prescription" in body) {
      if (body.prescription === null) {
        patch.prescription = null
      } else {
        patch.prescription = parseConsultationPrescriptionBody(body.prescription)
      }
    }

    if (typeof body.patientConsentAccepted === "boolean" && body.patientConsentAccepted === false) {
      const r =
        typeof body.patientConsentManualReason === "string" ? body.patientConsentManualReason.trim() : ""
      if (!r) {
        return NextResponse.json(
          { error: "Si patientConsentAccepted es false, indique patientConsentManualReason." },
          { status: 400 }
        )
      }
    }

    const updated = await updateClinicConsultation(id, patch)
    if (!updated) {
      return NextResponse.json({ error: "Consulta no encontrada." }, { status: 404 })
    }
    return NextResponse.json({ ok: true, consultation: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar consulta."
    console.error("[clinic/consultations/[id] PATCH]", e)
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
    const ok = await deleteClinicConsultation(id)
    if (!ok) {
      return NextResponse.json({ error: "Consulta no encontrada." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar consulta."
    console.error("[clinic/consultations/[id] DELETE]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
