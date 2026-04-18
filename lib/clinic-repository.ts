import type { ConsultationExtraction } from "@/lib/consultation-extraction"
import type { MockPatientRecord } from "@/lib/mock-patients"
import { getMedlyDb, isAtlasConfigured } from "@/lib/mongodb"
import type {
  ClinicConsultationDoc,
  ClinicConsultationListRow,
  ClinicConsultationPrescription,
  ClinicPatientDoc,
  ClinicPatientListRow,
} from "@/lib/clinic-types"
import { clinicPrescriptionToAnalysis } from "@/lib/clinic-prescription-bridge"
import { setClinicPrescriptionDraftForAllSessionsOfPatient } from "@/lib/patient-atlas-session"
import { randomUUID } from "node:crypto"

export const CLINIC_DEMO_PATIENTS: ClinicPatientListRow[] = [
  { id: "1", name: "Juan Pérez", age: 45, lastVisit: "2026-04-10", status: "Estable" },
  { id: "2", name: "María Gómez", age: 32, lastVisit: "2026-03-25", status: "En Tratamiento" },
  { id: "3", name: "Carlos López", age: 58, lastVisit: "2026-04-15", status: "Observación" },
  { id: "4", name: "Ana Martínez", age: 27, lastVisit: "2026-02-14", status: "Alta" },
  { id: "5", name: "Luis Rodríguez", age: 64, lastVisit: "2026-04-12", status: "Crónico" },
]

export const CLINIC_DEMO_CONSULTATIONS: ClinicConsultationListRow[] = [
  { id: "1", patientId: "1", patient: "Juan Pérez", date: "17/04/26, 10:30 a.m.", reason: "Revisión de presión arterial", status: "Completada" },
  { id: "2", patientId: "2", patient: "María Gómez", date: "17/04/26, 11:00 a.m.", reason: "Dolor de cabeza crónico", status: "Pendiente de firma" },
  { id: "3", patientId: "3", patient: "Carlos López", date: "16/04/26, 4:15 p.m.", reason: "Seguimiento diabetes", status: "Completada" },
  { id: "4", patientId: "4", patient: "Ana Martínez", date: "16/04/26, 1:00 p.m.", reason: "Resultados de laboratorio", status: "Completada" },
  { id: "5", patientId: "5", patient: "Luis Rodríguez", date: "15/04/26, 9:45 a.m.", reason: "Consulta general", status: "Completada" },
]

export const CLINIC_PATIENTS_COLLECTION = "clinic_patients"
export const CLINIC_CONSULTATIONS_COLLECTION = "clinic_consultations"

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatListDate(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d)
}

function deriveReason(structured: ConsultationExtraction | null, prescriptionDiagnosis: string | null): string {
  const sx = structured?.describedSymptoms?.filter(Boolean)
  if (sx?.length) return sx[0]!.slice(0, 120)
  if (prescriptionDiagnosis?.trim()) return prescriptionDiagnosis.trim().slice(0, 120)
  return "Consulta médica"
}

export async function ensureClinicIndexes(): Promise<void> {
  const db = await getMedlyDb()
  if (!db) return
  await db.collection(CLINIC_PATIENTS_COLLECTION).createIndex({ id: 1 }, { unique: true })
  await db.collection(CLINIC_CONSULTATIONS_COLLECTION).createIndex({ id: 1 }, { unique: true })
  await db.collection(CLINIC_CONSULTATIONS_COLLECTION).createIndex({ patientId: 1, createdAt: -1 })
}

export async function listClinicPatientsFromDb(): Promise<ClinicPatientListRow[] | null> {
  if (!isAtlasConfigured()) return null
  const db = await getMedlyDb()
  if (!db) return null
  await ensureClinicIndexes()
  const col = db.collection<ClinicPatientDoc>(CLINIC_PATIENTS_COLLECTION)
  const docs = await col.find({}).sort({ updatedAt: -1 }).toArray()
  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    age: d.age,
    lastVisit: d.lastVisit,
    status: d.status,
  }))
}

export async function getClinicPatientById(id: string): Promise<ClinicPatientDoc | null> {
  if (!isAtlasConfigured()) return null
  const db = await getMedlyDb()
  if (!db) return null
  await ensureClinicIndexes()
  const doc = await db.collection<ClinicPatientDoc>(CLINIC_PATIENTS_COLLECTION).findOne({ id: id.trim() })
  return doc
}

/** Primer número en cadenas como "20" o "18 - 25"; 0 si no hay dígitos. */
function parseAgeFromExtractionString(age: string | null | undefined): number {
  if (!age?.trim()) return 0
  const m = age.match(/\d+/)
  if (!m) return 0
  return Math.min(120, Math.max(0, parseInt(m[0], 10)))
}

function genderLabelFromExtraction(gender: ConsultationExtraction["patient"]["gender"]): string {
  if (gender === "male") return "Masculino"
  if (gender === "female") return "Femenino"
  return ""
}

export async function findClinicPatientByNameCaseInsensitive(name: string): Promise<ClinicPatientDoc | null> {
  if (!isAtlasConfigured()) return null
  const db = await getMedlyDb()
  if (!db) return null
  await ensureClinicIndexes()
  const n = name.trim()
  if (!n) return null
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return db.collection<ClinicPatientDoc>(CLINIC_PATIENTS_COLLECTION).findOne({
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
  })
}

/**
 * Si no hay patientId explícito, reutiliza expediente con el mismo nombre (sin distinguir mayúsculas)
 * o crea uno con datos del JSON estructurado cuando existan.
 */
export async function ensureClinicPatientForConsultation(params: {
  structured: ConsultationExtraction | null
  resolvedName: string | null
}): Promise<string | null> {
  const name =
    params.resolvedName?.trim() ||
    params.structured?.patient?.name?.trim() ||
    null
  if (!name) return null

  const existing = await findClinicPatientByNameCaseInsensitive(name)
  if (existing) return existing.id

  const p = params.structured?.patient
  const parsedAge = p ? parseAgeFromExtractionString(p.age) : 0
  const age = parsedAge > 0 ? parsedAge : 1
  const gender = p ? genderLabelFromExtraction(p.gender) : ""
  const bloodType = p?.bloodType?.trim() ?? ""
  const allergies = p?.knownAllergies?.filter(Boolean).join(", ") ?? ""
  const chronic = params.structured?.knownIllnesses?.filter(Boolean).join(", ") ?? ""

  const created = await insertClinicPatient({
    name,
    age,
    gender,
    bloodType,
    allergies,
    chronicConditions: chronic,
    phone: "",
    email: "",
    notes: "",
  })
  return created.id
}

export type CreateClinicPatientInput = {
  name: string
  age: number
  gender: string
  bloodType: string
  allergies: string
  chronicConditions: string
  phone: string
  email: string
  notes: string
}

export async function insertClinicPatient(input: CreateClinicPatientInput): Promise<ClinicPatientDoc> {
  const db = await getMedlyDb()
  if (!db) throw new Error("MongoDB no disponible")

  await ensureClinicIndexes()
  const id = randomUUID()
  const now = new Date()
  const lastVisit = todayYmd()
  const doc: ClinicPatientDoc = {
    id,
    name: input.name.trim(),
    age: input.age,
    gender: input.gender.trim(),
    bloodType: input.bloodType.trim(),
    allergies: input.allergies.trim(),
    chronicConditions: input.chronicConditions.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    notes: input.notes.trim(),
    status: "Estable",
    lastVisit,
    createdAt: now,
    updatedAt: now,
  }
  await db.collection<ClinicPatientDoc>(CLINIC_PATIENTS_COLLECTION).insertOne(doc)
  return doc
}

export async function touchClinicPatientLastVisit(patientId: string): Promise<void> {
  const db = await getMedlyDb()
  if (!db) return
  const now = new Date()
  await db.collection<ClinicPatientDoc>(CLINIC_PATIENTS_COLLECTION).updateOne(
    { id: patientId },
    { $set: { lastVisit: todayYmd(), updatedAt: now } }
  )
}

export async function getClinicPatientForExtractionMerge(patientId: string): Promise<MockPatientRecord | null> {
  const p = await getClinicPatientById(patientId)
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
    bloodType: p.bloodType,
    allergies: p.allergies,
    chronicConditions: p.chronicConditions,
  }
}

export async function listClinicConsultationsFromDb(): Promise<ClinicConsultationListRow[] | null> {
  if (!isAtlasConfigured()) return null
  const db = await getMedlyDb()
  if (!db) return null
  await ensureClinicIndexes()
  const col = db.collection<ClinicConsultationDoc>(CLINIC_CONSULTATIONS_COLLECTION)
  const docs = await col.find({}).sort({ createdAt: -1 }).limit(200).toArray()
  return docs.map((d) => ({
    id: d.id,
    patientId: d.patientId,
    patient: d.patientName ?? "—",
    date: formatListDate(d.createdAt),
    reason: d.reason,
    status: d.status,
  }))
}

export type UpdateClinicPatientInput = Partial<CreateClinicPatientInput> & {
  status?: string
  lastVisit?: string
}

export async function updateClinicPatient(id: string, patch: UpdateClinicPatientInput): Promise<ClinicPatientDoc | null> {
  if (!isAtlasConfigured()) return null
  const db = await getMedlyDb()
  if (!db) return null
  await ensureClinicIndexes()
  const existing = await getClinicPatientById(id)
  if (!existing) return null
  const now = new Date()
  const next: ClinicPatientDoc = {
    ...existing,
    name: patch.name !== undefined ? patch.name.trim() : existing.name,
    age: patch.age !== undefined ? patch.age : existing.age,
    gender: patch.gender !== undefined ? patch.gender.trim() : existing.gender,
    bloodType: patch.bloodType !== undefined ? patch.bloodType.trim() : existing.bloodType,
    allergies: patch.allergies !== undefined ? patch.allergies.trim() : existing.allergies,
    chronicConditions: patch.chronicConditions !== undefined ? patch.chronicConditions.trim() : existing.chronicConditions,
    phone: patch.phone !== undefined ? patch.phone.trim() : existing.phone,
    email: patch.email !== undefined ? patch.email.trim() : existing.email,
    notes: patch.notes !== undefined ? patch.notes.trim() : existing.notes,
    status: patch.status !== undefined ? patch.status.trim() : existing.status,
    lastVisit: patch.lastVisit !== undefined ? patch.lastVisit.trim() : existing.lastVisit,
    updatedAt: now,
  }
  await db.collection<ClinicPatientDoc>(CLINIC_PATIENTS_COLLECTION).replaceOne({ id: id.trim() }, next)
  return next
}

export async function deleteClinicConsultationsByPatientId(patientId: string): Promise<void> {
  if (!isAtlasConfigured()) return
  const db = await getMedlyDb()
  if (!db) return
  await ensureClinicIndexes()
  await db.collection(CLINIC_CONSULTATIONS_COLLECTION).deleteMany({ patientId: patientId.trim() })
}

export async function deleteClinicPatient(id: string): Promise<boolean> {
  if (!isAtlasConfigured()) return false
  const db = await getMedlyDb()
  if (!db) return false
  await ensureClinicIndexes()
  const pid = id.trim()
  await deleteClinicConsultationsByPatientId(pid)
  const res = await db.collection<ClinicPatientDoc>(CLINIC_PATIENTS_COLLECTION).deleteOne({ id: pid })
  return res.deletedCount > 0
}

function normalizeConsultationDoc(raw: ClinicConsultationDoc | (Partial<ClinicConsultationDoc> & { id: string })): ClinicConsultationDoc {
  const r = raw as Record<string, unknown>
  const createdAt = r.createdAt instanceof Date ? r.createdAt : new Date(String(r.createdAt ?? Date.now()))
  const updatedAt = r.updatedAt instanceof Date ? r.updatedAt : new Date(String(r.updatedAt ?? createdAt))
  return {
    id: String(r.id),
    patientId: typeof r.patientId === "string" ? r.patientId : null,
    patientName: typeof r.patientName === "string" ? r.patientName : null,
    reason: typeof r.reason === "string" ? r.reason : "",
    status: typeof r.status === "string" ? r.status : "Completada",
    transcription: typeof r.transcription === "string" ? r.transcription : null,
    notes: typeof r.notes === "string" ? r.notes : null,
    structured: (r.structured as ClinicConsultationDoc["structured"]) ?? null,
    prescription: (r.prescription as ClinicConsultationDoc["prescription"]) ?? null,
    patientConsentAccepted: typeof r.patientConsentAccepted === "boolean" ? r.patientConsentAccepted : null,
    patientConsentManualReason: typeof r.patientConsentManualReason === "string" ? r.patientConsentManualReason : null,
    patientConsentManualDetail: typeof r.patientConsentManualDetail === "string" ? r.patientConsentManualDetail : null,
    createdAt,
    updatedAt,
  }
}

export async function getClinicConsultationById(id: string): Promise<ClinicConsultationDoc | null> {
  if (!isAtlasConfigured()) return null
  const db = await getMedlyDb()
  if (!db) return null
  await ensureClinicIndexes()
  const doc = await db.collection<ClinicConsultationDoc>(CLINIC_CONSULTATIONS_COLLECTION).findOne({ id: id.trim() })
  if (!doc) return null
  return normalizeConsultationDoc(doc)
}

export type UpdateClinicConsultationPatch = {
  reason?: string
  status?: string
  transcription?: string | null
  notes?: string | null
  patientConsentAccepted?: boolean | null
  patientConsentManualReason?: string | null
  patientConsentManualDetail?: string | null
}

export async function updateClinicConsultation(
  id: string,
  patch: UpdateClinicConsultationPatch
): Promise<ClinicConsultationDoc | null> {
  if (!isAtlasConfigured()) return null
  const db = await getMedlyDb()
  if (!db) return null
  await ensureClinicIndexes()
  const existing = await getClinicConsultationById(id)
  if (!existing) return null
  const now = new Date()
  const next: ClinicConsultationDoc = {
    ...existing,
    reason: patch.reason !== undefined ? patch.reason.trim().slice(0, 200) : existing.reason,
    status: patch.status !== undefined ? patch.status.trim() : existing.status,
    transcription:
      patch.transcription !== undefined
        ? patch.transcription === null
          ? null
          : patch.transcription.trim() || null
        : existing.transcription,
    notes:
      patch.notes !== undefined
        ? patch.notes === null
          ? null
          : patch.notes.trim() || null
        : existing.notes,
    patientConsentAccepted:
      patch.patientConsentAccepted !== undefined ? patch.patientConsentAccepted : existing.patientConsentAccepted,
    patientConsentManualReason:
      patch.patientConsentManualReason !== undefined
        ? patch.patientConsentManualReason === null
          ? null
          : patch.patientConsentManualReason.trim() || null
        : existing.patientConsentManualReason,
    patientConsentManualDetail:
      patch.patientConsentManualDetail !== undefined
        ? patch.patientConsentManualDetail === null
          ? null
          : patch.patientConsentManualDetail.trim() || null
        : existing.patientConsentManualDetail,
    updatedAt: now,
  }
  await db.collection<ClinicConsultationDoc>(CLINIC_CONSULTATIONS_COLLECTION).replaceOne({ id: id.trim() }, next)
  return next
}

export async function deleteClinicConsultation(id: string): Promise<boolean> {
  if (!isAtlasConfigured()) return false
  const db = await getMedlyDb()
  if (!db) return false
  await ensureClinicIndexes()
  const res = await db.collection<ClinicConsultationDoc>(CLINIC_CONSULTATIONS_COLLECTION).deleteOne({ id: id.trim() })
  return res.deletedCount > 0
}

export async function listConsultationsForPatient(patientId: string): Promise<ClinicConsultationDoc[]> {
  if (!isAtlasConfigured()) return []
  const db = await getMedlyDb()
  if (!db) return []
  await ensureClinicIndexes()
  const rows = await db
    .collection<ClinicConsultationDoc>(CLINIC_CONSULTATIONS_COLLECTION)
    .find({ patientId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()
  return rows.map((d) => normalizeConsultationDoc(d))
}

export type InsertClinicConsultationInput = {
  patientId: string | null
  patientName: string | null
  transcription: string
  structured: ConsultationExtraction | null
  prescription: ClinicConsultationPrescription | null
  status?: string
  /** Motivo mostrado en listados (p. ej. registro manual desde la app móvil). */
  reasonOverride?: string | null
  notes?: string | null
  patientConsentAccepted: boolean
  patientConsentManualReason?: string | null
  patientConsentManualDetail?: string | null
}

export async function insertClinicConsultation(input: InsertClinicConsultationInput): Promise<ClinicConsultationDoc> {
  const db = await getMedlyDb()
  if (!db) throw new Error("MongoDB no disponible")

  await ensureClinicIndexes()
  const id = randomUUID()
  const now = new Date()
  const diagnosis = input.prescription?.diagnosis?.trim() ?? null
  const reason = input.reasonOverride?.trim() || deriveReason(input.structured, diagnosis)
  const doc: ClinicConsultationDoc = {
    id,
    patientId: input.patientId?.trim() || null,
    patientName: input.patientName?.trim() || null,
    reason,
    status: input.status?.trim() || "Completada",
    transcription: input.transcription.trim() || null,
    notes: input.notes?.trim() ? input.notes.trim().slice(0, 12000) : null,
    structured: input.structured,
    prescription: input.prescription,
    patientConsentAccepted: input.patientConsentAccepted,
    patientConsentManualReason: input.patientConsentAccepted
      ? null
      : input.patientConsentManualReason?.trim()
        ? input.patientConsentManualReason.trim().slice(0, 4000)
        : null,
    patientConsentManualDetail: input.patientConsentAccepted
      ? null
      : input.patientConsentManualDetail?.trim()
        ? input.patientConsentManualDetail.trim().slice(0, 8000)
        : null,
    createdAt: now,
    updatedAt: now,
  }
  await db.collection<ClinicConsultationDoc>(CLINIC_CONSULTATIONS_COLLECTION).insertOne(doc)
  if (doc.patientId) {
    await touchClinicPatientLastVisit(doc.patientId)
    await setClinicPrescriptionDraftForAllSessionsOfPatient(
      doc.patientId,
      clinicPrescriptionToAnalysis(doc.prescription)
    )
  }
  return doc
}
