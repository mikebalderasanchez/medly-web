export const PATIENT_DEVICE_ID_KEY = "medly:patient-device-id"

export function getOrCreatePatientDeviceId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = window.localStorage.getItem(PATIENT_DEVICE_ID_KEY)?.trim()
    if (!id) {
      id = crypto.randomUUID()
      window.localStorage.setItem(PATIENT_DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return ""
  }
}
