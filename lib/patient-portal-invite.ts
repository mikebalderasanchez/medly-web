import { randomBytes, randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"

import { getMedlyDb, isAtlasConfigured } from "@/lib/mongodb"

export const PATIENT_PORTAL_INVITES_COLLECTION = "patient_portal_invites"

export type PatientPortalInviteDoc = {
  publicId: string
  tokenHash: string
  patientId: string
  recipientEmail: string
  createdByUserId: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000

export async function ensurePatientPortalInviteIndexes(): Promise<void> {
  const db = await getMedlyDb()
  if (!db) return
  await db.collection(PATIENT_PORTAL_INVITES_COLLECTION).createIndex({ publicId: 1 }, { unique: true })
}

export async function createPatientPortalInvite(input: {
  patientId: string
  recipientEmail: string
  createdByUserId: string
}): Promise<{ publicId: string; rawToken: string } | null> {
  if (!isAtlasConfigured()) return null
  const db = await getMedlyDb()
  if (!db) return null

  const publicId = randomUUID()
  const rawToken = randomBytes(32).toString("base64url")
  const tokenHash = bcrypt.hashSync(rawToken, 12)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS)

  await db.collection<PatientPortalInviteDoc>(PATIENT_PORTAL_INVITES_COLLECTION).insertOne({
    publicId,
    tokenHash,
    patientId: input.patientId.trim(),
    recipientEmail: input.recipientEmail.trim().toLowerCase(),
    createdByUserId: input.createdByUserId,
    expiresAt,
    usedAt: null,
    createdAt: now,
  })

  return { publicId, rawToken }
}

export async function consumePatientPortalInvite(
  publicId: string,
  rawToken: string
): Promise<{ ok: true; patientId: string } | { ok: false; reason: string }> {
  if (!isAtlasConfigured()) return { ok: false, reason: "db" }
  const db = await getMedlyDb()
  if (!db) return { ok: false, reason: "db" }

  const col = db.collection<PatientPortalInviteDoc>(PATIENT_PORTAL_INVITES_COLLECTION)
  const doc = await col.findOne({ publicId: publicId.trim() })
  if (!doc) return { ok: false, reason: "not_found" }
  if (doc.usedAt) return { ok: false, reason: "used" }
  if (doc.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" }
  if (!bcrypt.compareSync(rawToken, doc.tokenHash)) return { ok: false, reason: "token" }

  const r = await col.updateOne(
    { publicId: doc.publicId, usedAt: null },
    { $set: { usedAt: new Date() } }
  )
  if (r.modifiedCount === 0) return { ok: false, reason: "race" }

  return { ok: true, patientId: doc.patientId }
}
