import type { PrescriptionAnalysis } from "@/lib/prescription-extraction"

export const PATIENT_CLINIC_PRESCRIPTION_STORAGE_KEY = "medly:patient-clinic-prescription-context"

export type StoredClinicPrescriptionContext = PrescriptionAnalysis & {
  savedAt: string
}

export function readStoredClinicPrescriptionContext(): StoredClinicPrescriptionContext | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(PATIENT_CLINIC_PRESCRIPTION_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredClinicPrescriptionContext
    if (!data || !Array.isArray(data.medications)) return null
    return data
  } catch {
    return null
  }
}

export function writeStoredClinicPrescriptionContext(analysis: PrescriptionAnalysis): void {
  if (typeof window === "undefined") return
  const payload: StoredClinicPrescriptionContext = {
    ...analysis,
    savedAt: new Date().toISOString(),
  }
  window.sessionStorage.setItem(PATIENT_CLINIC_PRESCRIPTION_STORAGE_KEY, JSON.stringify(payload))
}

export function clearStoredClinicPrescriptionContext(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(PATIENT_CLINIC_PRESCRIPTION_STORAGE_KEY)
}
