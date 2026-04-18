/** UUID del expediente en clínica (`clinic_patients.id`), tras vincular invitación. */

export const PATIENT_CLINIC_PATIENT_ID_KEY = "medly:patient-clinic-patient-id"

export function readStoredClinicPatientId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(PATIENT_CLINIC_PATIENT_ID_KEY)?.trim()
    return raw || null
  } catch {
    return null
  }
}

export function writeStoredClinicPatientId(id: string | null): void {
  if (typeof window === "undefined") return
  try {
    if (id?.trim()) {
      window.sessionStorage.setItem(PATIENT_CLINIC_PATIENT_ID_KEY, id.trim())
    } else {
      window.sessionStorage.removeItem(PATIENT_CLINIC_PATIENT_ID_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function clearStoredClinicPatientId(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(PATIENT_CLINIC_PATIENT_ID_KEY)
  } catch {
    /* ignore */
  }
}
