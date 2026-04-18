import { NextResponse } from "next/server"

import { clearClinicSessionCookie } from "@/lib/clinic-session-cookie"

export const runtime = "nodejs"

export async function POST() {
  await clearClinicSessionCookie()
  return NextResponse.json({ ok: true })
}
