import { NextResponse } from "next/server"

import { isAuthSecretConfigured } from "@/lib/auth-secret"
import { countClinicAuthUsers, ensureClinicAuthIndexes } from "@/lib/clinic-auth-repository"
import { isAtlasConfigured } from "@/lib/mongodb"

export const runtime = "nodejs"

export async function GET() {
  try {
    if (!isAuthSecretConfigured() || !isAtlasConfigured()) {
      return NextResponse.json({ registrationOpen: false, reason: "not_configured" as const })
    }
    await ensureClinicAuthIndexes()
    const total = await countClinicAuthUsers()
    if (total === null) {
      return NextResponse.json({ registrationOpen: false, reason: "db" as const })
    }
    return NextResponse.json({
      registrationOpen: total === 0,
      reason: total === 0 ? ("first_admin" as const) : ("closed" as const),
    })
  } catch {
    return NextResponse.json({ registrationOpen: false, reason: "error" as const })
  }
}
