"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getOrCreatePatientDeviceId } from "@/lib/patient-device-id"
import { hydratePatientSessionFromAtlas } from "@/lib/patient-session-hydrate"

export function VincularPacienteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pid = searchParams.get("pid") ?? ""
  const t = searchParams.get("t") ?? ""

  const [inviteLine, setInviteLine] = useState(pid && t ? `${pid}:${t}` : "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDone(null)
    try {
      const deviceId = getOrCreatePatientDeviceId()
      if (!deviceId) {
        setError("No se pudo obtener el identificador del dispositivo.")
        return
      }
      const res = await fetch("/api/patient/portal/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteLine: inviteLine.trim(), deviceId }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string; patientName?: string }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo vincular.")
        return
      }
      setDone(typeof data.patientName === "string" ? `Listo: expediente de ${data.patientName}.` : "Acceso vinculado.")
      await hydratePatientSessionFromAtlas()
      router.replace("/patient")
      router.refresh()
    } catch {
      setError("Error de red.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vincular acceso del consultorio</CardTitle>
        <CardDescription>
          Pega la línea que recibiste por correo (formato <code className="rounded bg-muted px-1">UUID:token</code>) o
          abre el enlace del correo en este mismo navegador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {done ? <p className="text-sm text-green-700 dark:text-green-400">{done}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="invite">Código de acceso (una línea)</Label>
            <Input
              id="invite"
              value={inviteLine}
              onChange={(e) => setInviteLine(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:…"
              autoComplete="off"
              className="font-mono text-xs"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Vinculando…" : "Vincular y cargar expediente"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
