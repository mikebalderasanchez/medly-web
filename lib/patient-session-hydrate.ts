import { getOrCreatePatientDeviceId } from "@/lib/patient-device-id"
import { DEMO_PATIENT_EXPEDIENTE, writeStoredExpedienteContext } from "@/lib/patient-expediente"
import { writeStoredPrescriptionContext } from "@/lib/patient-prescription-context"
import { parseExpedienteRecord, parsePrescriptionRecord } from "@/lib/patient-chat-context"
import { writeStoredClinicPatientId } from "@/lib/patient-clinic-link"
import {
  clearStoredClinicPrescriptionContext,
  writeStoredClinicPrescriptionContext,
} from "@/lib/patient-clinic-prescription-context"

/** Disparado en `window` tras escribir expediente/receta en sessionStorage desde Atlas. */
export const PATIENT_STORAGE_SYNC_EVENT = "medly:patient-storage-sync"

/**
 * Lee la sesión del dispositivo en Atlas y copia expediente, receta e id de clínica a sessionStorage.
 * Útil al cargar el layout y justo después de vincular el token del correo.
 */
export async function hydratePatientSessionFromAtlas(): Promise<boolean> {
  const id = getOrCreatePatientDeviceId()
  if (!id) return false

  const res = await fetch(`/api/patient/session/${encodeURIComponent(id)}`)
  const data = (await res.json()) as {
    database?: boolean
    expediente?: unknown
    prescriptionAnalysis?: unknown
    clinicPatientId?: string | null
    clinicPrescriptionDraft?: unknown
  }

  if (!data.database) return false

  const ex = parseExpedienteRecord(data.expediente)
  if (ex) {
    writeStoredExpedienteContext(ex)
  } else {
    writeStoredExpedienteContext(DEMO_PATIENT_EXPEDIENTE)
    await fetch(`/api/patient/session/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expediente: DEMO_PATIENT_EXPEDIENTE }),
    })
  }

  const rx = parsePrescriptionRecord(data.prescriptionAnalysis)
  if (rx) {
    writeStoredPrescriptionContext(rx)
  }

  const clinicRx = parsePrescriptionRecord(data.clinicPrescriptionDraft)
  if (clinicRx) {
    writeStoredClinicPrescriptionContext(clinicRx)
  } else {
    clearStoredClinicPrescriptionContext()
  }

  writeStoredClinicPatientId(
    typeof data.clinicPatientId === "string" && data.clinicPatientId.trim()
      ? data.clinicPatientId.trim()
      : null
  )

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PATIENT_STORAGE_SYNC_EVENT))
  }

  return true
}
