export const PATIENT_EXPEDIENTE_STORAGE_KEY = "medly:patient-expediente-context"

export type PatientExpedienteRecord = {
  patientName: string
  age: number | null
  bloodType: string | null
  allergies: string | null
  chronicConditions: string | null
  activeMedications: { name: string; instructions: string | null }[]
}

export type StoredExpedienteContext = PatientExpedienteRecord & {
  savedAt: string
}

export const DEMO_PATIENT_EXPEDIENTE: PatientExpedienteRecord = {
  patientName: "Juan Pérez",
  age: 45,
  bloodType: "O+",
  allergies: "Penicilina",
  chronicConditions: "Hipertensión",
  activeMedications: [
    { name: "Ibuprofeno 400 mg", instructions: "1 tableta cada 8 horas con alimentos" },
    { name: "Omeprazol 20 mg", instructions: "1 cápsula en ayunas" },
  ],
}

export function readStoredExpedienteContext(): StoredExpedienteContext | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(PATIENT_EXPEDIENTE_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredExpedienteContext
    if (!data || typeof data.patientName !== "string") return null
    if (!Array.isArray(data.activeMedications)) return null
    return data
  } catch {
    return null
  }
}

export function writeStoredExpedienteContext(record: PatientExpedienteRecord): void {
  if (typeof window === "undefined") return
  const payload: StoredExpedienteContext = {
    ...record,
    savedAt: new Date().toISOString(),
  }
  window.sessionStorage.setItem(PATIENT_EXPEDIENTE_STORAGE_KEY, JSON.stringify(payload))
}

export function clearStoredExpedienteContext(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(PATIENT_EXPEDIENTE_STORAGE_KEY)
}
