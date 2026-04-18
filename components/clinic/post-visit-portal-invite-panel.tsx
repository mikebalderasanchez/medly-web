"use client"

import { useState } from "react"
import { Mail, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

type Props = {
  patientId: string
  title?: string
  description?: string
}

/**
 * Guarda el correo en el expediente y envía invitación al portal (token de un solo uso).
 */
export function PostVisitPortalInvitePanel({
  patientId,
  title = "Acceso al portal del paciente",
  description = "Tras la consulta, envía al correo un enlace para vincular el portal, el resumen de la receta guardada en la visita (si existe) y un PDF adjunto.",
}: Props) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copyLine, setCopyLine] = useState<string | null>(null)
  const [copyUrl, setCopyUrl] = useState<string | null>(null)

  const send = async () => {
    const em = email.trim().toLowerCase()
    setMessage(null)
    setError(null)
    setCopyLine(null)
    setCopyUrl(null)
    if (!emailOk(em)) {
      setError("Escribe un correo electrónico válido.")
      return
    }
    setLoading(true)
    try {
      const patchRes = await fetch(`/api/clinic/patients/${encodeURIComponent(patientId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em }),
      })
      const patchData = (await patchRes.json().catch(() => ({}))) as { error?: string }
      if (!patchRes.ok) {
        setError(typeof patchData.error === "string" ? patchData.error : "No se pudo actualizar el expediente.")
        return
      }

      const res = await fetch(`/api/clinic/patients/${encodeURIComponent(patientId)}/portal-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: em }),
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
        setError(typeof data.error === "string" ? data.error : "No se pudo enviar la invitación.")
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
    <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <Button type="button" size="sm" onClick={send} disabled={loading} className="shrink-0 gap-2">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          {loading ? "Enviando…" : "Enviar correo"}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        <Label htmlFor="post-visit-portal-email" className="text-xs">
          Correo del paciente
        </Label>
        <Input
          id="post-visit-portal-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="paciente@correo.com"
        />
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      {message ? <p className="mt-2 text-xs text-green-700 dark:text-green-400">{message}</p> : null}
      {copyUrl || copyLine ? (
        <div className="mt-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Copia manual (correo no configurado en el servidor)
          </p>
          {copyUrl ? <p className="break-all text-muted-foreground">{copyUrl}</p> : null}
          {copyLine ? <p className="break-all font-mono text-[11px] text-foreground">{copyLine}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
