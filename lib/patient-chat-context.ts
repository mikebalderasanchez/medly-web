import type { PrescriptionAnalysis } from "@/lib/prescription-extraction"
import type { ClinicConsultationDoc } from "@/lib/clinic-types"
import type { PatientExpedienteRecord } from "@/lib/patient-expediente"

export function parseExpedienteRecord(raw: unknown): PatientExpedienteRecord | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const patientName = typeof o.patientName === "string" ? o.patientName.trim() : ""
  if (!patientName) return null

  const age = typeof o.age === "number" && Number.isFinite(o.age) ? o.age : null
  const bloodType = typeof o.bloodType === "string" ? o.bloodType.trim() || null : null
  const allergies = typeof o.allergies === "string" ? o.allergies.trim() || null : null
  const chronicConditions =
    typeof o.chronicConditions === "string" ? o.chronicConditions.trim() || null : null

  const medsRaw = o.activeMedications
  const activeMedications = Array.isArray(medsRaw)
    ? medsRaw
        .map((m) => {
          if (!m || typeof m !== "object") return null
          const x = m as { name?: unknown; instructions?: unknown }
          const name = typeof x.name === "string" ? x.name.trim() : ""
          if (!name) return null
          const instructions =
            typeof x.instructions === "string" && x.instructions.trim() ? x.instructions.trim() : null
          return { name, instructions }
        })
        .filter(Boolean) as { name: string; instructions: string | null }[]
    : []

  return {
    patientName,
    age,
    bloodType,
    allergies,
    chronicConditions,
    activeMedications,
  }
}

export function parsePrescriptionRecord(raw: unknown): PrescriptionAnalysis | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as PrescriptionAnalysis
  if (!Array.isArray(o.medications)) return null
  return {
    medications: o.medications,
    summary: typeof o.summary === "string" ? o.summary : null,
  }
}

export function hasPatientChatContext(
  prescription: PrescriptionAnalysis | null,
  expediente: PatientExpedienteRecord | null
): boolean {
  const meds = prescription?.medications ?? []
  const rx =
    prescription &&
    (Boolean(prescription.summary?.trim()) ||
      meds.some((m) => typeof m.name === "string" && m.name.trim().length > 0))

  const ex =
    expediente &&
    (Boolean(expediente.patientName?.trim()) ||
      Boolean(expediente.allergies?.trim()) ||
      Boolean(expediente.chronicConditions?.trim()) ||
      (expediente.activeMedications?.length ?? 0) > 0)

  return Boolean(rx || ex)
}

export function formatRecentConsultationsForPrompt(visits: ClinicConsultationDoc[], max = 5): string {
  const slice = visits.slice(0, max)
  if (!slice.length) return ""
  const lines: string[] = [
    "Consultas recientes registradas por el consultorio (solo referencia; no sustituyen indicación médica directa):",
  ]
  for (const v of slice) {
    const d = v.createdAt instanceof Date ? v.createdAt : new Date(String(v.createdAt))
    const when = Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "?"
    lines.push(`- ${when} · ${v.reason} · ${v.status}`)
    const sx = v.structured?.describedSymptoms?.filter(Boolean).slice(0, 4)
    if (sx?.length) lines.push(`  Síntomas: ${sx.join("; ")}`)
  }
  return lines.join("\n")
}

export function formatExpedienteForPrompt(expediente: PatientExpedienteRecord): string {
  const lines: string[] = []
  lines.push(`Paciente: ${expediente.patientName}`)
  if (expediente.age != null) lines.push(`Edad: ${expediente.age}`)
  if (expediente.bloodType?.trim()) lines.push(`Tipo de sangre: ${expediente.bloodType}`)
  if (expediente.allergies?.trim()) lines.push(`Alergias: ${expediente.allergies}`)
  if (expediente.chronicConditions?.trim()) lines.push(`Antecedentes / crónicos: ${expediente.chronicConditions}`)
  if (expediente.activeMedications.length) {
    lines.push(
      "Medicación activa en expediente:",
      ...expediente.activeMedications.map(
        (m) => `- ${m.name}${m.instructions ? ` (${m.instructions})` : ""}`
      )
    )
  }
  return lines.join("\n")
}
