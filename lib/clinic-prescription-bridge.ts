import type { ClinicConsultationPrescription } from "@/lib/clinic-types"
import type { PrescriptionAnalysis } from "@/lib/prescription-extraction"

export function clinicPrescriptionToAnalysis(
  rx: ClinicConsultationPrescription | null | undefined
): PrescriptionAnalysis | null {
  if (!rx) return null
  const lines = rx.lines ?? []
  const medications = lines
    .filter((l) => l.drug.trim())
    .map((l) => ({
      name: l.drug.trim(),
      instructions:
        [l.dose && `Dosis: ${l.dose}`, l.route && `Vía: ${l.route}`, l.frequency && `Frec.: ${l.frequency}`, l.duration && `Duración: ${l.duration}`]
          .filter(Boolean)
          .join(" · ") || null,
      warning: null as string | null,
    }))
  const dx = rx.diagnosis?.trim()
  const notes = rx.generalNotes?.trim()
  const summary =
    [dx && `Padecimiento / diagnóstico: ${dx}`, notes && `Indicaciones generales: ${notes}`].filter(Boolean).join("\n\n") ||
    (rx.previewText?.trim() ? rx.previewText.trim().slice(0, 1200) : null)

  const hasContent =
    medications.length > 0 || Boolean(summary?.trim()) || Boolean(rx.previewText?.trim())
  if (!hasContent) return null

  return {
    medications,
    summary: summary?.trim() || (rx.previewText?.trim() ? rx.previewText.trim().slice(0, 1200) : null),
  }
}

export function prescriptionAnalysisToPlainBody(a: PrescriptionAnalysis): string {
  const parts: string[] = []
  if (a.summary?.trim()) {
    parts.push(a.summary.trim())
    parts.push("")
  }
  if (a.medications.length) {
    parts.push("Medicamentos e indicaciones")
    parts.push("────────────────────────────")
    a.medications.forEach((m, i) => {
      parts.push(`${i + 1}. ${m.name}`)
      if (m.instructions) parts.push(`   ${m.instructions}`)
      parts.push("")
    })
  }
  const t = parts.join("\n").trim()
  return t || "Sin detalle de medicamentos en el borrador."
}

export function prescriptionAnalysisToEmailHtml(a: PrescriptionAnalysis, patientName: string): string {
  const medsRows = a.medications
    .map(
      (m) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #e8eef5;font-weight:600;color:#0f172a">${escapeHtml(m.name)}</td></tr>` +
        (m.instructions
          ? `<tr><td style="padding:0 12px 12px 12px;border-bottom:1px solid #e8eef5;font-size:14px;color:#475569">${escapeHtml(m.instructions)}</td></tr>`
          : `<tr><td style="padding:0 12px 12px 12px;border-bottom:1px solid #e8eef5"></td></tr>`)
    )
    .join("")

  const summaryBlock = a.summary?.trim()
    ? `<p style="margin:16px 0;font-size:15px;line-height:1.55;color:#334155">${escapeHtml(a.summary.trim()).replace(/\n/g, "<br/>")}</p>`
    : ""

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#0d4a8a 0%,#0a5cad 100%);color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
      <p style="margin:0;font-size:13px;opacity:.9">Medly · Consultorio</p>
      <h1 style="margin:8px 0 0;font-size:20px;font-weight:700">Receta e indicaciones</h1>
      <p style="margin:12px 0 0;font-size:14px;opacity:.95">Paciente: <strong>${escapeHtml(patientName)}</strong></p>
    </div>
    <div style="background:#f8fafc;padding:20px 24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
      ${summaryBlock}
      <table role="presentation" style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">${medsRows || `<tr><td style="padding:16px;color:#64748b">Sin líneas de medicamento en el borrador.</td></tr>`}</table>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#94a3b8">Documento informativo generado desde el borrador guardado en consulta. Sigue siempre las indicaciones de tu médico y el envase del medicamento.</p>
    </div>
  </div>`.trim()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
