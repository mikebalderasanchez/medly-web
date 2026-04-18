import type { ClinicConsultationPrescription } from "@/lib/clinic-types"

export function parseConsultationPrescriptionBody(raw: unknown): ClinicConsultationPrescription | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const diagnosis = o.diagnosis === null ? null : typeof o.diagnosis === "string" ? o.diagnosis : null
  const generalNotes =
    o.generalNotes === null ? null : typeof o.generalNotes === "string" ? o.generalNotes : null
  const previewText = typeof o.previewText === "string" ? o.previewText : ""
  const linesRaw = Array.isArray(o.lines) ? o.lines : []
  const lines = linesRaw.map((row) => {
    if (!row || typeof row !== "object") {
      return { drug: "", dose: "", route: "", frequency: "", duration: "" }
    }
    const r = row as Record<string, unknown>
    return {
      drug: typeof r.drug === "string" ? r.drug : "",
      dose: typeof r.dose === "string" ? r.dose : "",
      route: typeof r.route === "string" ? r.route : "",
      frequency: typeof r.frequency === "string" ? r.frequency : "",
      duration: typeof r.duration === "string" ? r.duration : "",
    }
  })
  return { diagnosis, lines, generalNotes, previewText }
}
