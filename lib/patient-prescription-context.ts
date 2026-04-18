import type { PrescriptionAnalysis } from "@/lib/prescription-extraction"

export const PATIENT_PRESCRIPTION_STORAGE_KEY = "medly:patient-prescription-context"

export type StoredPrescriptionContext = PrescriptionAnalysis & {
  savedAt: string
}

export function readStoredPrescriptionContext(): StoredPrescriptionContext | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(PATIENT_PRESCRIPTION_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredPrescriptionContext
    if (!data || !Array.isArray(data.medications)) return null
    return data
  } catch {
    return null
  }
}

export function writeStoredPrescriptionContext(analysis: PrescriptionAnalysis): void {
  if (typeof window === "undefined") return
  const payload: StoredPrescriptionContext = {
    ...analysis,
    savedAt: new Date().toISOString(),
  }
  window.sessionStorage.setItem(PATIENT_PRESCRIPTION_STORAGE_KEY, JSON.stringify(payload))
}

export function clearStoredPrescriptionContext(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(PATIENT_PRESCRIPTION_STORAGE_KEY)
}
