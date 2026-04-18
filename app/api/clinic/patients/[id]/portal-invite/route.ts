import { NextResponse } from "next/server"

import { getClinicPatientById } from "@/lib/clinic-repository"
import {
  createPatientPortalInvite,
  ensurePatientPortalInviteIndexes,
} from "@/lib/patient-portal-invite"
import { appBaseUrl, sendPatientPortalInviteEmail } from "@/lib/send-portal-invite-email"
import { isAtlasConfigured } from "@/lib/mongodb"
import { requireClinicSession } from "@/lib/require-clinic-session"

export const runtime = "nodejs"

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireClinicSession(req)
    if (!auth.ok) return auth.response

    if (!isAtlasConfigured()) {
      return NextResponse.json({ error: "MongoDB no configurado." }, { status: 503 })
    }

    const { id: patientId } = await params
    const patient = await getClinicPatientById(patientId)
    if (!patient) {
      return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 })
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const toEmailRaw =
      typeof body.toEmail === "string" && body.toEmail.trim()
        ? body.toEmail.trim().toLowerCase()
        : patient.email.trim().toLowerCase()

    if (!toEmailRaw || !emailOk(toEmailRaw)) {
      return NextResponse.json(
        { error: "Indica un correo válido o completa el correo del expediente del paciente." },
        { status: 400 }
      )
    }

    const expedienteEmail = patient.email.trim().toLowerCase()
    if (expedienteEmail && expedienteEmail !== toEmailRaw) {
      return NextResponse.json(
        {
          error:
            "Por seguridad, si el expediente tiene correo, el acceso solo se envía a ese correo. Actualiza el expediente o usa el mismo correo.",
        },
        { status: 400 }
      )
    }

    await ensurePatientPortalInviteIndexes()
    const created = await createPatientPortalInvite({
      patientId: patient.id,
      recipientEmail: toEmailRaw,
      createdByUserId: auth.userId,
    })
    if (!created) {
      return NextResponse.json({ error: "No se pudo crear la invitación." }, { status: 503 })
    }

    const base = appBaseUrl()
    const claimUrl = `${base}/patient/vincular?pid=${encodeURIComponent(created.publicId)}&t=${encodeURIComponent(created.rawToken)}`
    const plainLine = `${created.publicId}:${created.rawToken}`

    const mail = await sendPatientPortalInviteEmail({
      to: toEmailRaw,
      patientName: patient.name,
      claimUrl,
      plainLine,
    })

    if (!mail.sent && process.env.NODE_ENV === "development") {
      console.info("[portal-invite] Correo no enviado. Enlace de prueba:", claimUrl)
      console.info("[portal-invite] Línea para app:", plainLine)
    }

    return NextResponse.json({
      ok: true,
      emailSent: mail.sent,
      claimUrl: mail.sent ? undefined : claimUrl,
      plainLine: mail.sent ? undefined : plainLine,
      message: mail.sent
        ? "Se envió el correo al paciente."
        : "No hay RESEND_API_KEY / EMAIL_FROM configurados: copia el enlace o la línea de acceso y compártelos por un canal seguro.",
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al invitar."
    console.error("[clinic/patients/portal-invite POST]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
