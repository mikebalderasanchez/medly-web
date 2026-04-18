import type { ClinicConsultationPrescription } from "@/lib/clinic-types"

export type PrescriptionLineDraft = {
  id: string
  drug: string
  dose: string
  route: string
  frequency: string
  duration: string
}

export function newRxLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyRxLine(): PrescriptionLineDraft {
  return { id: newRxLineId(), drug: "", dose: "", route: "", frequency: "", duration: "" }
}

export function prescriptionToDraftLines(rx: ClinicConsultationPrescription | null | undefined): PrescriptionLineDraft[] {
  const rows = rx?.lines ?? []
  const mapped = rows.map((l) => ({
    id: newRxLineId(),
    drug: l.drug ?? "",
    dose: l.dose ?? "",
    route: l.route ?? "",
    frequency: l.frequency ?? "",
    duration: l.duration ?? "",
  }))
  return mapped.length ? mapped : [emptyRxLine()]
}

export function filledLines(lines: PrescriptionLineDraft[]): PrescriptionLineDraft[] {
  return lines.filter(
    (l) => l.drug.trim() || l.dose.trim() || l.route.trim() || l.frequency.trim() || l.duration.trim(),
  )
}

export function hasRecetaDraftContent(
  lines: PrescriptionLineDraft[],
  diagnosis: string,
  generalNotes: string,
): boolean {
  return filledLines(lines).length > 0 || Boolean(diagnosis.trim()) || Boolean(generalNotes.trim())
}

export function buildPrescriptionPreviewText(
  diagnosis: string,
  lines: PrescriptionLineDraft[],
  generalNotes: string,
): string {
  const filled = filledLines(lines)
  const parts: string[] = []
  if (diagnosis.trim()) {
    parts.push(`Diagnóstico / padecimiento: ${diagnosis.trim()}`)
    parts.push("")
  }
  if (filled.length) {
    parts.push("Rp.")
    filled.forEach((l, i) => {
      const bits = [
        l.drug.trim(),
        l.dose.trim() ? `Dosis: ${l.dose.trim()}` : "",
        l.route.trim() ? `Vía: ${l.route.trim()}` : "",
        l.frequency.trim() ? `Frecuencia: ${l.frequency.trim()}` : "",
        l.duration.trim() ? `Duración: ${l.duration.trim()}` : "",
      ].filter(Boolean)
      parts.push(`${i + 1}. ${bits.join(" · ")}`)
    })
  } else {
    parts.push("(Sin medicamentos indicados aún)")
  }
  if (generalNotes.trim()) {
    parts.push("")
    parts.push("Indicaciones generales:")
    parts.push(generalNotes.trim())
  }
  return parts.join("\n")
}

export function buildClinicPrescriptionPayload(
  diagnosis: string,
  lines: PrescriptionLineDraft[],
  generalNotes: string,
): ClinicConsultationPrescription | null {
  if (!hasRecetaDraftContent(lines, diagnosis, generalNotes)) return null
  const filled = filledLines(lines)
  const previewText = buildPrescriptionPreviewText(diagnosis, lines, generalNotes)
  return {
    diagnosis: diagnosis.trim() || null,
    lines: filled.map(({ drug, dose, route, frequency, duration }) => ({
      drug: drug.trim(),
      dose: dose.trim(),
      route: route.trim(),
      frequency: frequency.trim(),
      duration: duration.trim(),
    })),
    generalNotes: generalNotes.trim() || null,
    previewText,
  }
}
