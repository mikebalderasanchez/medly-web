"use client"

import { useState } from "react"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  patientId: string
  patientEmail: string
}

export function PatientPortalInviteButton({ patientId, patientEmail }: Props) {
  const [toEmail, setToEmail] = useState(patientEmail.trim())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copyLine, setCopyLine] = useState<string | null>(null)
  const [copyUrl, setCopyUrl] = useState<string | null>(null)

  const send = async () => {
    setLoading(true)
    setMessage(null)
    setError(null)
    setCopyLine(null)
    setCopyUrl(null)
    try {
      const res = await fetch(`/api/clinic/patients/${encodeURIComponent(patientId)}/portal-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: toEmail.trim() || undefined }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        message?: string
        emailSent?: boolean
        claimUrl?: string
        plainLine?: string
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo enviar.")
        return
      }
      setMessage(typeof data.message === "string" ? data.message : "Listo.")
      if (!data.emailSent && data.plainLine) setCopyLine(data.plainLine)
      if (!data.emailSent && data.claimUrl) setCopyUrl(data.claimUrl)
    } catch {
      setError("Error de red.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Portal del paciente (app / web)</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Tras la consulta, envía un acceso seguro de un solo uso al correo del paciente. Podrá ver su expediente en
            Medly.
          </p>
        </div>
        <Button type="button" size="sm" onClick={send} disabled={loading} className="shrink-0 gap-2">
          <Mail className="size-4" />
          {loading ? "Enviando…" : "Enviar acceso por correo"}
        </Button>
      </div>
      {!patientEmail.trim() ? (
        <div className="mt-3 space-y-2">
          <Label htmlFor="invite-email" className="text-xs">
            Correo del paciente (no figura en el expediente)
          </Label>
          <Input
            id="invite-email"
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="paciente@correo.com"
          />
        </div>
      ) : null}
      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
      {message ? <p className="mt-3 text-xs text-green-700 dark:text-green-400">{message}</p> : null}
      {copyUrl || copyLine ? (
        <div className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="font-medium text-amber-950 dark:text-amber-100">Copia manual (correo no configurado en servidor)</p>
          {copyUrl ? <p className="break-all text-muted-foreground">{copyUrl}</p> : null}
          {copyLine ? <p className="break-all font-mono text-[11px] text-foreground">{copyLine}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
