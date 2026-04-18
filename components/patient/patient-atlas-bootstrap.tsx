"use client"

import { useLayoutEffect, useState, type ReactNode } from "react"
import { getOrCreatePatientDeviceId } from "@/lib/patient-device-id"
import { DEMO_PATIENT_EXPEDIENTE, writeStoredExpedienteContext } from "@/lib/patient-expediente"
import { writeStoredPrescriptionContext } from "@/lib/patient-prescription-context"
import { parseExpedienteRecord, parsePrescriptionRecord } from "@/lib/patient-chat-context"

async function hydratePatientSessionFromAtlas(): Promise<void> {
  const id = getOrCreatePatientDeviceId()
  if (!id) return

  const res = await fetch(`/api/patient/session/${encodeURIComponent(id)}`)
  const data = (await res.json()) as {
    database?: boolean
    expediente?: unknown
    prescriptionAnalysis?: unknown
  }

  if (!data.database) return

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
}

export function PatientAtlasBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    let alive = true
    void (async () => {
      try {
        await hydratePatientSessionFromAtlas()
      } catch (e) {
        console.warn("[PatientAtlasBootstrap]", e)
      } finally {
        if (alive) setReady(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Sincronizando con el servidor…
      </div>
    )
  }

  return <>{children}</>
}
