import { NextResponse } from "next/server"

import { resolveClinicSession } from "@/lib/clinic-auth-request-session"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await resolveClinicSession(req)
  if (!session) {
    return NextResponse.json({ user: null })
  }
  return NextResponse.json({
    user: {
      userId: session.userId,
      email: session.email,
      role: session.role,
    },
  })
}
