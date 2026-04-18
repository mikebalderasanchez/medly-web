import type { PrescriptionAnalysis } from "@/lib/prescription-extraction"
import type { PatientExpedienteRecord } from "@/lib/patient-expediente"
import { getMedlyDb, isAtlasConfigured } from "@/lib/mongodb"

export const PATIENT_SESSIONS_COLLECTION = "patient_device_sessions"

export type PatientDeviceSessionDoc = {
  deviceId: string
  expediente: PatientExpedienteRecord | null
  prescriptionAnalysis: PrescriptionAnalysis | null
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

  await col.updateOne(
    { deviceId },
    {
      $set,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  )
}
