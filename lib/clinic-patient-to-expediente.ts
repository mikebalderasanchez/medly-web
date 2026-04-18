import type { ClinicConsultationDoc, ClinicPatientDoc } from "@/lib/clinic-types"
import type { PatientExpedienteRecord } from "@/lib/patient-expediente"

export function clinicPatientToExpediente(p: ClinicPatientDoc): PatientExpedienteRecord {
  const parts = p.name.trim().split(/\s+/).filter(Boolean)
  return {
    patientName: parts[0] ?? p.name.trim(),
    age: p.age,
    bloodType: p.bloodType?.trim() || null,
    allergies: p.allergies?.trim() || null,
    chronicConditions: p.chronicConditions?.trim() || null,
    activeMedications: [],
  }
}

/** Si la última consulta tiene líneas de receta, las usa como medicación activa sugerida para el portal. */
export function mergeLatestConsultationRxIntoExpediente(
  base: PatientExpedienteRecord,
  visit: ClinicConsultationDoc | null
): PatientExpedienteRecord {
  const lines = visit?.prescription?.lines
  if (!lines?.length) return base
  const meds = lines
    .filter((l) => l.drug.trim())
    .map((l) => ({
      name: l.drug.trim(),
      instructions:
        [l.dose, l.route, l.frequency, l.duration].filter((x) => typeof x === "string" && x.trim()).join(" · ") ||
        null,
    }))
  if (!meds.length) return base
  return { ...base, activeMedications: meds }
}
