import { ObjectId, type Collection } from "mongodb"

import { CLINIC_AUTH_USERS_COLLECTION } from "@/lib/clinic-auth-constants"
import { CLINIC_ROLES, type ClinicRole, isClinicRole } from "@/lib/clinic-auth-roles"
import { getMedlyDb } from "@/lib/mongodb"

export type ClinicAuthUserDoc = {
  _id: ObjectId
  email: string
  passwordHash: string
  createdAt: Date
  role?: ClinicRole
  displayName?: string
  specialty?: string
  createdBy?: ObjectId
  totpSecret?: string
  totpVerified?: boolean
}

export type ClinicAuthUserPublic = {
  id: string
  email: string
  role: ClinicRole
  displayName: string | null
  createdAt: string
}

async function coll(): Promise<Collection<ClinicAuthUserDoc> | null> {
  const db = await getMedlyDb()
  if (!db) return null
  return db.collection<ClinicAuthUserDoc>(CLINIC_AUTH_USERS_COLLECTION)
}

export function effectiveClinicRole(user: ClinicAuthUserDoc): ClinicRole {
  if (user.role && isClinicRole(user.role)) return user.role
  return CLINIC_ROLES.HOSPITAL_ADMIN
}

export async function ensureClinicAuthIndexes(): Promise<void> {
  const c = await coll()
  if (!c) return
  await c.createIndex({ email: 1 }, { unique: true })
}

export async function countClinicAuthUsers(): Promise<number | null> {
  const c = await coll()
  if (!c) return null
  return c.countDocuments()
}

export async function findClinicAuthUserByEmail(email: string): Promise<ClinicAuthUserDoc | null> {
  const c = await coll()
  if (!c) return null
  return c.findOne({ email: email.toLowerCase().trim() })
}

export async function findClinicAuthUserById(id: string): Promise<ClinicAuthUserDoc | null> {
  const c = await coll()
  if (!c) return null
  if (!ObjectId.isValid(id)) return null
  return c.findOne({ _id: new ObjectId(id) })
}

export async function updateClinicAuthUserProfile(
  userId: string,
  patch: { displayName?: string | null; specialty?: string | null }
): Promise<boolean> {
  const c = await coll()
  if (!c || !ObjectId.isValid(userId)) return false
  const $set: Record<string, string> = {}
  if (patch.displayName !== undefined) {
    const v = patch.displayName?.trim() ?? ""
    $set.displayName = v
  }
  if (patch.specialty !== undefined) {
    const v = patch.specialty?.trim() ?? ""
    $set.specialty = v
  }
  if (Object.keys($set).length === 0) return true
  const r = await c.updateOne({ _id: new ObjectId(userId) }, { $set })
  return r.matchedCount > 0
}

export async function insertClinicAuthUser(input: {
  email: string
  passwordHash: string
  role: ClinicRole
  displayName?: string | null
  createdBy?: ObjectId | null
}): Promise<{ ok: true; id: string } | { ok: false; duplicate: boolean }> {
  const c = await coll()
  if (!c) return { ok: false, duplicate: false }
  try {
    const now = new Date()
    const doc: ClinicAuthUserDoc = {
      _id: new ObjectId(),
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
      role: input.role,
      createdAt: now,
    }
    if (input.displayName?.trim()) doc.displayName = input.displayName.trim()
    if (input.createdBy) doc.createdBy = input.createdBy

    const r = await c.insertOne(doc)
    return { ok: true, id: r.insertedId.toHexString() }
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: number }).code : undefined
    if (code === 11000) return { ok: false, duplicate: true }
    throw e
  }
}

export async function listDoctorUsers(): Promise<ClinicAuthUserPublic[]> {
  const c = await coll()
  if (!c) return []
  const cursor = c
    .find({ role: CLINIC_ROLES.DOCTOR }, { projection: { email: 1, role: 1, displayName: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })

  const out: ClinicAuthUserPublic[] = []
  for await (const doc of cursor) {
    out.push({
      id: doc._id.toHexString(),
      email: doc.email,
      role: CLINIC_ROLES.DOCTOR,
      displayName: doc.displayName ?? null,
      createdAt: doc.createdAt.toISOString(),
    })
  }
  return out
}

export function isAccountLoginEnabled(user: ClinicAuthUserDoc): boolean {
  if (user.totpVerified === false && Boolean(user.totpSecret)) return false
  return true
}
