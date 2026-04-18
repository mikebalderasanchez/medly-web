import type { PrescriptionAnalysis } from "@/lib/prescription-extraction"
import type { PatientExpedienteRecord } from "@/lib/patient-expediente"
import { getMedlyDb, isAtlasConfigured } from "@/lib/mongodb"

export const PATIENT_SESSIONS_COLLECTION = "patient_device_sessions"

export type PatientDeviceSessionDoc = {
  deviceId: string
  expediente: PatientExpedienteRecord | null
  prescriptionAnalysis: PrescriptionAnalysis | null
  /** Borrador de receta de la última consulta guardada por el médico. */
  clinicPrescriptionDraft?: PrescriptionAnalysis | null
  /** Presente cuando el paciente vinculó invitación desde el consultorio. */
  clinicPatientId?: string | null
  createdAt: Date
  updatedAt: Date
}

function sanitizeDeviceId(raw: string): string | null {
  const id = raw.trim()
  if (!id || id.length > 128) return null
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return null
  return id
}

export async function getPatientSessionByDeviceId(deviceIdRaw: string): Promise<PatientDeviceSessionDoc | null> {
  if (!isAtlasConfigured()) return null
  const deviceId = sanitizeDeviceId(deviceIdRaw)
  if (!deviceId) return null

  const db = await getMedlyDb()
  if (!db) return null

  const doc = await db.collection<PatientDeviceSessionDoc>(PATIENT_SESSIONS_COLLECTION).findOne({ deviceId })
  return doc
}

export type PatientSessionPatch = {
  expediente?: PatientExpedienteRecord | null
  prescriptionAnalysis?: PrescriptionAnalysis | null
  clinicPatientId?: string | null
  clinicPrescriptionDraft?: PrescriptionAnalysis | null
}

export async function upsertPatientSession(deviceIdRaw: string, patch: PatientSessionPatch): Promise<void> {
  if (!isAtlasConfigured()) return
  const deviceId = sanitizeDeviceId(deviceIdRaw)
  if (!deviceId) throw new Error("deviceId inválido")

  const db = await getMedlyDb()
  if (!db) throw new Error("MongoDB no disponible")

  const col = db.collection<PatientDeviceSessionDoc>(PATIENT_SESSIONS_COLLECTION)
  await col.createIndex({ deviceId: 1 }, { unique: true })

  const now = new Date()
  const $set: Record<string, unknown> = { deviceId, updatedAt: now }
  if ("expediente" in patch) $set.expediente = patch.expediente ?? null
  if ("prescriptionAnalysis" in patch) $set.prescriptionAnalysis = patch.prescriptionAnalysis ?? null
  if ("clinicPatientId" in patch) $set.clinicPatientId = patch.clinicPatientId?.trim() || null
  if ("clinicPrescriptionDraft" in patch) $set.clinicPrescriptionDraft = patch.clinicPrescriptionDraft ?? null

  await col.updateOne(
    { deviceId },
    {
      $set,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  )
}

/** Actualiza el borrador de receta del consultorio en todas las sesiones de dispositivo ya vinculadas a ese expediente. */
export async function setClinicPrescriptionDraftForAllSessionsOfPatient(
  clinicPatientId: string,
  draft: PrescriptionAnalysis | null
): Promise<void> {
  if (!isAtlasConfigured()) return
  const db = await getMedlyDb()
  if (!db) return
  const now = new Date()
  await db.collection<PatientDeviceSessionDoc>(PATIENT_SESSIONS_COLLECTION).updateMany(
    { clinicPatientId: clinicPatientId.trim() },
    { $set: { clinicPrescriptionDraft: draft, updatedAt: now } }
  )
}
