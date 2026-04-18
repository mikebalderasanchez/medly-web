"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Loader2, Pill, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { downloadPrescriptionPdf } from "@/lib/download-prescription-pdf"
import type { ClinicConsultationPrescription } from "@/lib/clinic-types"
import {
  buildClinicPrescriptionPayload,
  buildPrescriptionPreviewText,
  emptyRxLine,
  hasRecetaDraftContent,
  prescriptionToDraftLines,
  type PrescriptionLineDraft,
} from "@/lib/consultation-prescription-draft"

type ConsultationLoad = {
  id: string
  patientId: string | null
  patientName: string | null
  prescription: ClinicConsultationPrescription | null
}

export default function EditConsultationPrescriptionPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id
  const consultationId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] ?? "" : ""
  const invalidId = !consultationId.trim()

  const [loadError, setLoadError] = useState<string | null>(() => (invalidId ? "ID de consulta no válido." : null))
  const [loading, setLoading] = useState(() => !invalidId)
  const [meta, setMeta] = useState<{ patientId: string | null; patientName: string | null } | null>(null)

  const [rxLines, setRxLines] = useState<PrescriptionLineDraft[]>(() => [emptyRxLine()])
  const [rxGeneralNotes, setRxGeneralNotes] = useState("")
  const [rxDiagnosis, setRxDiagnosis] = useState("")

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [rxPdfError, setRxPdfError] = useState<string | null>(null)

  useEffect(() => {
    if (invalidId) return
    let cancelled = false
    void (async () => {
      setLoadError(null)
      try {
        const res = await fetch(`/api/clinic/consultations/${encodeURIComponent(consultationId)}`)
        const data = (await res.json()) as {
          configured?: boolean
          consultation?: ConsultationLoad | null
          error?: string
        }
        if (cancelled) return
        if (!res.ok) {
          setLoadError(typeof data.error === "string" ? data.error : "No se pudo cargar la consulta.")
          setLoading(false)
          return
        }
        if (!data.configured) {
          setLoadError("MongoDB no está configurado.")
          setLoading(false)
          return
        }
        const c = data.consultation
        if (!c) {
          setLoadError("Consulta no encontrada.")
          setLoading(false)
          return
        }
        setMeta({ patientId: c.patientId, patientName: c.patientName })
        const rx = c.prescription
        setRxLines(prescriptionToDraftLines(rx))
        setRxDiagnosis(rx?.diagnosis?.trim() ?? "")
        setRxGeneralNotes(rx?.generalNotes?.trim() ?? "")
      } catch {
        if (!cancelled) setLoadError("Error de red al cargar.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [consultationId, invalidId])

  const hasDraft = hasRecetaDraftContent(rxLines, rxDiagnosis, rxGeneralNotes)

  const prescriptionPreview = useMemo(
    () => buildPrescriptionPreviewText(rxDiagnosis, rxLines, rxGeneralNotes),
    [rxDiagnosis, rxGeneralNotes, rxLines],
  )

  const updateRxLine = useCallback((id: string, patch: Partial<Omit<PrescriptionLineDraft, "id">>) => {
    setRxLines((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const addRxLine = () => setRxLines((rows) => [...rows, emptyRxLine()])
  const removeRxLine = (id: string) => {
    setRxLines((rows) => (rows.length <= 1 ? [emptyRxLine()] : rows.filter((r) => r.id !== id)))
  }

  const patientLabelForRx =
    meta?.patientName?.trim() || (meta?.patientId ? `Paciente #${meta.patientId}` : "Paciente")

  const handleDownloadPrescriptionPdf = () => {
    if (!hasDraft) return
    setRxPdfError(null)
    try {
      downloadPrescriptionPdf({
        body: prescriptionPreview,
        patientLabel: patientLabelForRx,
        fileSlug: meta?.patientName?.trim() || meta?.patientId || consultationId,
      })
      setSaveOk("PDF descargado.")
    } catch {
      setRxPdfError("No se pudo generar el PDF.")
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaveOk(null)
    const payload = buildClinicPrescriptionPayload(rxDiagnosis, rxLines, rxGeneralNotes)
    setSaving(true)
    try {
      const res = await fetch(`/api/clinic/consultations/${encodeURIComponent(consultationId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescription: payload }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "No se pudo guardar.")
        return
      }
      setSaveOk("Receta actualizada. El paciente verá el borrador al sincronizar la app o al volver a abrirla.")
    } catch {
      setSaveError("Error de red al guardar.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Cargando consulta…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10">
        <p className="text-destructive text-sm">{loadError}</p>
        <Button variant="outline" type="button" onClick={() => router.push("/consultations")}>
          Volver a consultas
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1">
          <Link href="/consultations">
            <ArrowLeft className="h-4 w-4" />
            Consultas
          </Link>
        </Button>
        {meta?.patientId ? (
          <Button variant="outline" size="sm">
            <Link href={`/patients/${encodeURIComponent(meta.patientId)}`}>Expediente</Link>
          </Button>
        ) : null}
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar receta</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Consulta <span className="font-mono text-xs">#{consultationId}</span>
          {meta?.patientName ? (
            <>
              {" "}
              · <span>{meta.patientName}</span>
            </>
          ) : null}
          . Los cambios se publican al portal del paciente como borrador de la última consulta guardada.
        </p>
      </div>

      {saveError ? (
        <p className="text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {saveError}
        </p>
      ) : null}
      {saveOk ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          {saveOk}
        </p>
      ) : null}
      {rxPdfError ? (
        <p className="text-destructive text-sm" role="alert">
          {rxPdfError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Datos de la receta
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rx-dx">Diagnóstico o padecimiento (opcional)</Label>
              <Input
                id="rx-dx"
                placeholder="Ej. Infección respiratoria alta"
                value={rxDiagnosis}
                onChange={(e) => setRxDiagnosis(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Medicamentos</p>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRxLine}>
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>

              {rxLines.map((line, index) => (
                <div key={line.id} className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs font-medium">Medicamento {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRxLine(line.id)}
                      aria-label={`Eliminar medicamento ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor={`rx-drug-${line.id}`}>Nombre genérico / comercial</Label>
                      <Input
                        id={`rx-drug-${line.id}`}
                        placeholder="Ej. Amoxicilina 500 mg"
                        value={line.drug}
                        onChange={(e) => updateRxLine(line.id, { drug: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`rx-dose-${line.id}`}>Dosis</Label>
                      <Input
                        id={`rx-dose-${line.id}`}
                        placeholder="Ej. 1 cápsula"
                        value={line.dose}
                        onChange={(e) => updateRxLine(line.id, { dose: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`rx-route-${line.id}`}>Vía</Label>
                      <Input
                        id={`rx-route-${line.id}`}
                        placeholder="Oral, tópica…"
                        value={line.route}
                        onChange={(e) => updateRxLine(line.id, { route: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`rx-freq-${line.id}`}>Frecuencia</Label>
                      <Input
                        id={`rx-freq-${line.id}`}
                        placeholder="Ej. Cada 8 h"
                        value={line.frequency}
                        onChange={(e) => updateRxLine(line.id, { frequency: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`rx-dur-${line.id}`}>Duración</Label>
                      <Input
                        id={`rx-dur-${line.id}`}
                        placeholder="Ej. 7 días"
                        value={line.duration}
                        onChange={(e) => updateRxLine(line.id, { duration: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rx-notes">Indicaciones generales al paciente</Label>
              <Textarea
                id="rx-notes"
                className="min-h-[100px] resize-y"
                placeholder="Ayuno, vigilancia de síntomas, próxima cita…"
                value={rxGeneralNotes}
                onChange={(e) => setRxGeneralNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>Texto que verá el paciente en el resumen y en el PDF.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <Textarea
              readOnly
              className="min-h-[240px] flex-1 resize-none bg-muted/50 font-mono text-sm leading-relaxed"
              value={prescriptionPreview}
              aria-label="Vista previa de la receta médica"
            />
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-6">
            <Button type="button" variant="secondary" className="gap-2" disabled={!hasDraft} onClick={handleDownloadPrescriptionPdf}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar receta"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
