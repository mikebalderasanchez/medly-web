"use client"

import { useLayoutEffect, useState, type ReactNode } from "react"
import { hydratePatientSessionFromAtlas } from "@/lib/patient-session-hydrate"

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
