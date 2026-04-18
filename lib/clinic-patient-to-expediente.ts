import type { ClinicPatientDoc } from "@/lib/clinic-types"
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
