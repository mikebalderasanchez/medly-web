"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Mic,
  Square,
  UploadCloud,
  FileAudio,
  CheckCircle2,
  Loader2,
  Play,
  FileText,
  Pill,
  Plus,
  Trash2,
  Download,
} from "lucide-react"
import type { ConsultationExtraction, ConsultationPatientGender } from "@/lib/consultation-extraction"
import { downloadPrescriptionPdf } from "@/lib/download-prescription-pdf"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type PrescriptionLine = {
  id: string
  drug: string
  dose: string
  route: string
  frequency: string
  duration: string
}

function newRxLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptyRxLine(): PrescriptionLine {
  return { id: newRxLineId(), drug: "", dose: "", route: "", frequency: "", duration: "" }
}

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function pickRecorderMime(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c
  }
  return undefined
}

type SaveConsentPayload = {
  patientConsentAccepted: boolean
  patientConsentManualReason: string
  patientConsentManualDetail: string
}

function SaveConsultationConsentDialog({
  open,
  onOpenChange,
  isSaving,
  saveError,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isSaving: boolean
  saveError: string | null
  onSave: (p: SaveConsentPayload) => Promise<void>
}) {
  const [agreed, setAgreed] = useState<boolean | null>(null)
  const [manualReason, setManualReason] = useState("")
  const [manualDetail, setManualDetail] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAgreed(null)
    setManualReason("")
    setManualDetail("")
    setFormError(null)
  }, [open])

  const handleSave = async () => {
    setFormError(null)
    if (agreed === null) {
      setFormError("Seleccione si el paciente está de acuerdo con registrar esta consulta.")
      return
    }
    if (!agreed && !manualReason.trim()) {
      setFormError("Describa el motivo o la limitación manifestada por el paciente.")
      return
    }
    await onSave({
      patientConsentAccepted: agreed,
      patientConsentManualReason: manualReason.trim(),
      patientConsentManualDetail: manualDetail.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isSaving}>
        <DialogHeader>
          <DialogTitle>Conformidad del paciente</DialogTitle>
          <DialogDescription>
            Confirme con el paciente antes de guardar en el expediente. Si no está de acuerdo, deje constancia escrita.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-sm font-medium">¿El paciente está de acuerdo con registrar esta información?</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={agreed === true ? "default" : "outline"}
              size="sm"
              onClick={() => setAgreed(true)}
              disabled={isSaving}
            >
              Sí, conforme
            </Button>
            <Button
              type="button"
              variant={agreed === false ? "default" : "outline"}
              size="sm"
              onClick={() => setAgreed(false)}
              disabled={isSaving}
            >
              No conforme
            </Button>
          </div>
          {agreed === false ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="consent-reason">Motivo o limitación manifestada</Label>
                <Textarea
                  id="consent-reason"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  disabled={isSaving}
                  className="min-h-[72px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="consent-detail">Registro manual adicional (opcional)</Label>
                <Textarea
                  id="consent-detail"
                  value={manualDetail}
                  onChange={(e) => setManualDetail(e.target.value)}
                  disabled={isSaving}
                  className="min-h-[72px]"
                />
              </div>
            </>
          ) : null}
          {formError ? <p className="text-destructive text-sm">{formError}</p> : null}
          {saveError ? <p className="text-destructive text-sm">{saveError}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar en expediente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NewConsultationPageInner() {
  const searchParams = useSearchParams()
  const patientId = searchParams.get("patientId")

  const [isRecording, setIsRecording] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [structured, setStructured] = useState<ConsultationExtraction | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [demoNotice, setDemoNotice] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [clinicalNotes, setClinicalNotes] = useState("")
  const [saveConsentOpen, setSaveConsentOpen] = useState(false)
  const [rxPdfError, setRxPdfError] = useState<string | null>(null)

  const [rxLines, setRxLines] = useState<PrescriptionLine[]>(() => [emptyRxLine()])
  const [rxGeneralNotes, setRxGeneralNotes] = useState("")
  const [rxDiagnosis, setRxDiagnosis] = useState("")

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState("consulta.webm")
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  useEffect(() => {
    const source = uploadedFile ?? recordedBlob
    if (!source) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(source)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [uploadedFile, recordedBlob])

  useEffect(() => {
    return () => {
      stopTick()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (!isRecording) {
      stopTick()
      return
    }
    setRecordingSeconds(0)
    tickRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1)
    }, 1000)
    return stopTick
  }, [isRecording])

  const resetAudio = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    chunksRef.current = []
    setRecordedBlob(null)
    setUploadedFile(null)
    setHasAudio(false)
    setIsRecording(false)
    setRecordingSeconds(0)
    setDisplayName("consulta.webm")
  }

  const resetAll = () => {
    resetAudio()
    setTranscription("")
    setStructured(null)
    setProcessingError(null)
    setDemoNotice(null)
    setSavedFlash(null)
    setSaveError(null)
    setRxLines([emptyRxLine()])
    setRxGeneralNotes("")
    setRxDiagnosis("")
    setRxPdfError(null)
    setClinicalNotes("")
  }

  const startRecording = async () => {
    setProcessingError(null)
    setDemoNotice(null)
    setSavedFlash(null)
    setTranscription("")
    setStructured(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setProcessingError("Tu navegador no permite grabar audio desde el micrófono.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mime = pickRecorderMime()
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setRecordedBlob(blob)
        setUploadedFile(null)
        setDisplayName(blob.type.includes("webm") ? "consulta.webm" : "consulta.m4a")
        setHasAudio(true)
        setIsRecording(false)
      }

      mr.start()
      setIsRecording(true)
      setHasAudio(false)
    } catch {
      setProcessingError("No se pudo acceder al micrófono. Revisa permisos del navegador.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
  }

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setProcessingError(null)
    setDemoNotice(null)
    setSavedFlash(null)
    setTranscription("")
    setStructured(null)
    setRecordedBlob(null)
    setUploadedFile(file)
    setDisplayName(file.name)
    setRecordingSeconds(0)
    setHasAudio(true)
    setIsRecording(false)
  }

  const handleProcessAudio = async () => {
    const blob = uploadedFile ?? recordedBlob
    if (!blob) return

    setIsProcessing(true)
    setProcessingError(null)
    setDemoNotice(null)
    setSavedFlash(null)
    setStructured(null)
    setTranscription("")

    const file =
      blob instanceof File
        ? blob
        : new File([blob], displayName, { type: blob.type || "audio/webm" })

    const fd = new FormData()
    fd.append("audio", file)
    if (patientId) fd.append("patientId", patientId)

    try {
      const res = await fetch("/api/consultations/process", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setProcessingError(typeof data.error === "string" ? data.error : "Error al procesar la consulta.")
        return
      }
      setTranscription(data.transcription ?? "")
      if (data.structured) {
        setStructured(data.structured as ConsultationExtraction)
      }
      if (data.mock && typeof data.message === "string") {
        setDemoNotice(data.message)
      }
    } catch {
      setProcessingError("No se pudo contactar al servidor.")
    } finally {
      setIsProcessing(false)
    }
  }

  const updatePatient = useCallback((patch: Partial<ConsultationExtraction["patient"]>) => {
    setStructured((prev) => {
      if (!prev) return prev
      return { ...prev, patient: { ...prev.patient, ...patch } }
    })
  }, [])

  const updateField = useCallback(<K extends keyof ConsultationExtraction>(key: K, value: ConsultationExtraction[K]) => {
    setStructured((prev) => (prev ? { ...prev, [key]: value } : prev))
  }, [])

  const parseLines = (text: string): string[] | null => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    return lines.length ? lines : null
  }

  const audioSize = uploadedFile?.size ?? recordedBlob?.size ?? 0

  const filledRxLines = rxLines.filter(
    (l) => l.drug.trim() || l.dose.trim() || l.route.trim() || l.frequency.trim() || l.duration.trim()
  )

  const hasRecetaDraft =
    filledRxLines.length > 0 || Boolean(rxDiagnosis.trim()) || Boolean(rxGeneralNotes.trim())

  const canDiscardDraft =
    Boolean(transcription) ||
    Boolean(structured) ||
    hasAudio ||
    isRecording ||
    hasRecetaDraft

  const prescriptionPreview = (() => {
    const parts: string[] = []
    if (rxDiagnosis.trim()) {
      parts.push(`Diagnóstico / padecimiento: ${rxDiagnosis.trim()}`)
      parts.push("")
    }
    if (filledRxLines.length) {
      parts.push("Rp.")
      filledRxLines.forEach((l, i) => {
        const bits = [
          l.drug.trim(),
          l.dose.trim() ? `Dosis: ${l.dose.trim()}` : "",
          l.route.trim() ? `Vía: ${l.route.trim()}` : "",
          l.frequency.trim() ? `Frecuencia: ${l.frequency.trim()}` : "",
          l.duration.trim() ? `Duración: ${l.duration.trim()}` : "",
        ].filter(Boolean)
        parts.push(`${i + 1}. ${bits.join(" · ")}`)
      })
    } else {
      parts.push("(Sin medicamentos indicados aún)")
    }
    if (rxGeneralNotes.trim()) {
      parts.push("")
      parts.push("Indicaciones generales:")
      parts.push(rxGeneralNotes.trim())
    }
    return parts.join("\n")
  })()

  const updateRxLine = (id: string, patch: Partial<Omit<PrescriptionLine, "id">>) => {
    setRxLines((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const addRxLine = () => setRxLines((rows) => [...rows, emptyRxLine()])
  const removeRxLine = (id: string) => {
    setRxLines((rows) => (rows.length <= 1 ? [emptyRxLine()] : rows.filter((r) => r.id !== id)))
  }

  const patientLabelForRx =
    structured?.patient?.name?.trim() ||
    (patientId ? `Paciente #${patientId}` : "No especificado")

  const handleDownloadPrescriptionPdf = () => {
    if (!hasRecetaDraft) return
    setRxPdfError(null)
    try {
      downloadPrescriptionPdf({
        body: prescriptionPreview,
        patientLabel: patientLabelForRx,
        fileSlug: structured?.patient?.name?.trim() || patientId,
      })
      setSavedFlash("PDF de receta descargado.")
    } catch {
      setRxPdfError("No se pudo generar el PDF. Revisa que el navegador permita descargas e inténtalo de nuevo.")
    }
  }

  const saveWithConsent = useCallback(
    async (consent: SaveConsentPayload) => {
      const prescription = {
        diagnosis: rxDiagnosis.trim() || null,
        lines: filledRxLines.map(({ drug, dose, route, frequency, duration }) => ({
          drug: drug.trim(),
          dose: dose.trim(),
          route: route.trim(),
          frequency: frequency.trim(),
          duration: duration.trim(),
        })),
        generalNotes: rxGeneralNotes.trim() || null,
        previewText: prescriptionPreview,
      }
      setSaveError(null)
      setSavedFlash(null)
      setIsSaving(true)
      try {
        const res = await fetch("/api/clinic/consultations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: patientId || null,
            patientName:
              structured?.patient?.name?.trim() || (patientId ? `Paciente #${patientId}` : null),
            transcription,
            structured: structured ?? null,
            prescription,
            notes: clinicalNotes.trim() || null,
            patientConsentAccepted: consent.patientConsentAccepted,
            patientConsentManualReason: consent.patientConsentAccepted ? null : consent.patientConsentManualReason,
            patientConsentManualDetail: consent.patientConsentAccepted
              ? null
              : consent.patientConsentManualDetail || null,
          }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setSaveError(typeof data.error === "string" ? data.error : "No se pudo guardar.")
          return
        }
        setSaveConsentOpen(false)
        setSavedFlash("Consulta guardada en MongoDB.")
      } catch {
        setSaveError("Error de red al guardar.")
      } finally {
        setIsSaving(false)
      }
    },
    [
      patientId,
      structured,
      transcription,
      clinicalNotes,
      filledRxLines,
      prescriptionPreview,
      rxDiagnosis,
      rxGeneralNotes,
    ]
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva Consulta</h1>
        <p className="text-muted-foreground">
          Graba o sube el audio de la consulta para generar el expediente.
          {patientId ? (
            <span className="ml-2 rounded-md border bg-muted px-2 py-0.5 text-xs font-medium">
              Paciente #{patientId}
            </span>
          ) : null}
        </p>
      </div>

      {processingError ? (
        <p className="text-sm text-destructive" role="alert">
          {processingError}
        </p>
      ) : null}
      {demoNotice ? <p className="text-sm text-amber-700 dark:text-amber-400">{demoNotice}</p> : null}
      {savedFlash ? <p className="text-sm text-green-700 dark:text-green-400">{savedFlash}</p> : null}
      {saveError ? (
        <p className="text-destructive text-sm" role="alert">
          {saveError}
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.webm,.mp3,.wav,.m4a,.ogg"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Entrada de Audio</CardTitle>
              <CardDescription>Graba la consulta en tiempo real o sube un archivo.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-8">
              {!hasAudio && !isRecording ? (
                <div className="flex flex-wrap justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={startRecording}
                    className="gap-2 bg-red-600 text-white hover:bg-red-700"
                  >
                    <Mic className="h-5 w-5" /> Grabar
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" type="button" onClick={onPickFile}>
                    <UploadCloud className="h-5 w-5" /> Subir Archivo
                  </Button>
                </div>
              ) : isRecording ? (
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <div className="rounded-full bg-red-100 p-4 dark:bg-red-950/40">
                    <Mic className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-red-600">
                    Grabando... {formatDuration(recordingSeconds)}
                  </p>
                  <Button size="lg" variant="outline" onClick={stopRecording} className="gap-2" type="button">
                    <Square className="h-4 w-4 fill-current" /> Detener
                  </Button>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center gap-4">
                  <div className="flex w-full items-center justify-between rounded-md border bg-muted/50 p-4">
                    <div className="flex items-center gap-3">
                      <FileAudio className="h-6 w-6 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {uploadedFile ? "—" : formatDuration(recordingSeconds)} • {formatBytes(audioSize)}
                        </p>
                      </div>
                    </div>
                    {previewUrl ? (
                      <Button size="icon" variant="ghost" type="button">
                        <a href={previewUrl} download={displayName} title="Descargar audio">
                          <Play className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  {previewUrl ? (
                    <audio controls className="h-9 w-full max-w-md" src={previewUrl}>
                      Tu navegador no reproduce audio embebido.
                    </audio>
                  ) : null}
                  <div className="flex w-full gap-2">
                    <Button variant="outline" className="flex-1" type="button" onClick={resetAll}>
                      Reintentar
                    </Button>
                    <Button className="flex-1 gap-2" onClick={handleProcessAudio} disabled={isProcessing} type="button">
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Procesar IA
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-1 flex-col">
            <CardHeader>
              <CardTitle>Transcripción en Bruto</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <Textarea
                placeholder="La transcripción aparecerá aquí..."
                className="min-h-[200px] h-full resize-none bg-muted/50"
                value={transcription}
                readOnly
              />
            </CardContent>
          </Card>
        </div>

        <Card className="flex h-full flex-1 flex-col">
          <CardHeader>
            <CardTitle>Resumen Clínico (IA)</CardTitle>
            <CardDescription>Extraído automáticamente de la conversación (JSON estructurado).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {isProcessing ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Transcribiendo y analizando la consulta...</p>
              </div>
            ) : structured ? (
              <div className="max-h-[min(70vh,720px)] space-y-4 overflow-y-auto pr-1">
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-semibold">Paciente</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="p-name">Nombre</Label>
                      <Input
                        id="p-name"
                        value={structured.patient.name ?? ""}
                        onChange={(e) => updatePatient({ name: e.target.value || null })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="p-age">Edad</Label>
                      <Input
                        id="p-age"
                        value={structured.patient.age ?? ""}
                        onChange={(e) => updatePatient({ age: e.target.value || null })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="p-h">Altura (cm)</Label>
                      <Input
                        id="p-h"
                        type="number"
                        value={structured.patient.height_cm ?? ""}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            updatePatient({ height_cm: null })
                            return
                          }
                          const n = Number(e.target.value)
                          updatePatient({ height_cm: Number.isFinite(n) ? n : null })
                        }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="p-w">Peso (kg)</Label>
                      <Input
                        id="p-w"
                        type="number"
                        value={structured.patient.weight_kg ?? ""}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            updatePatient({ weight_kg: null })
                            return
                          }
                          const n = Number(e.target.value)
                          updatePatient({ weight_kg: Number.isFinite(n) ? n : null })
                        }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="p-g">Género</Label>
                      <select
                        id="p-g"
                        className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        value={structured.patient.gender ?? ""}
                        onChange={(e) => {
                          const v = e.target.value
                          updatePatient({
                            gender: (v === "male" || v === "female" ? v : null) as ConsultationPatientGender,
                          })
                        }}
                      >
                        <option value="">—</option>
                        <option value="male">male</option>
                        <option value="female">female</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="p-bt">Tipo de sangre</Label>
                      <Input
                        id="p-bt"
                        value={structured.patient.bloodType ?? ""}
                        onChange={(e) => updatePatient({ bloodType: e.target.value || null })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="p-al">Alergias conocidas (una por línea)</Label>
                    <Textarea
                      id="p-al"
                      className="min-h-[72px] font-mono text-sm"
                      value={(structured.patient.knownAllergies ?? []).join("\n")}
                      onChange={(e) => updatePatient({ knownAllergies: parseLines(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="rx">Medicación adicional (una por línea)</Label>
                  <Textarea
                    id="rx"
                    className="min-h-[72px] font-mono text-sm"
                    value={(structured.additionalMedications ?? []).join("\n")}
                    onChange={(e) => updateField("additionalMedications", parseLines(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sx">Síntomas descritos (una por línea)</Label>
                  <Textarea
                    id="sx"
                    className="min-h-[72px] font-mono text-sm"
                    value={(structured.describedSymptoms ?? []).join("\n")}
                    onChange={(e) => updateField("describedSymptoms", parseLines(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ill">Enfermedades conocidas (una por línea)</Label>
                  <Textarea
                    id="ill"
                    className="min-h-[72px] font-mono text-sm"
                    value={(structured.knownIllnesses ?? []).join("\n")}
                    onChange={(e) => updateField("knownIllnesses", parseLines(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="em">Emergencia actual</Label>
                  <Textarea
                    id="em"
                    className="min-h-[72px]"
                    placeholder="null si no es urgencia"
                    value={structured.currentEmergency ?? ""}
                    onChange={(e) => updateField("currentEmergency", e.target.value.trim() ? e.target.value : null)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 p-6 text-center text-muted-foreground">
                <FileText className="mb-4 h-10 w-10 opacity-20" />
                <p>Procesa el audio para generar automáticamente las notas médicas y el resumen estructurado.</p>
              </div>
            )}
          </CardContent>
          <div className="border-t px-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="clinical-notes">Notas de la consulta</Label>
              <Textarea
                id="clinical-notes"
                className="min-h-[88px] resize-y"
                placeholder="Observaciones adicionales (distintas de la transcripción en bruto)…"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
              />
            </div>
          </div>
          <CardFooter className="justify-end gap-2 border-t pt-6">
            <Button variant="outline" disabled={!canDiscardDraft} type="button" onClick={resetAll}>
              Descartar
            </Button>
            <Button
              disabled={(!structured && !hasRecetaDraft) || isSaving}
              type="button"
              onClick={() => {
                setSaveError(null)
                setSavedFlash(null)
                setSaveConsentOpen(true)
              }}
            >
              Guardar en Expediente
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-5 border-t pt-7">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Receta médica</h2>
          {rxPdfError ? (
            <p className="text-destructive mt-2 text-sm" role="alert">
              {rxPdfError}
            </p>
          ) : null}
        </div>

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
                  <div
                    key={line.id}
                    className="space-y-3 rounded-lg border bg-muted/20 p-4"
                  >
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
              <CardTitle>Vista previa de receta</CardTitle>
              <CardDescription>
                Texto listo para copiar o imprimir. Puedes descargarlo como PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <Textarea
                readOnly
                className="min-h-[240px] flex-1 resize-none bg-muted/50 font-mono text-sm leading-relaxed"
                value={prescriptionPreview}
                aria-label="Vista previa de la receta médica"
              />
            </CardContent>
            <CardFooter className="justify-end border-t pt-6">
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                disabled={!hasRecetaDraft}
                onClick={handleDownloadPrescriptionPdf}
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <SaveConsultationConsentDialog
        open={saveConsentOpen}
        onOpenChange={(v) => {
          if (!v && isSaving) return
          setSaveConsentOpen(v)
        }}
        isSaving={isSaving}
        saveError={saveError}
        onSave={saveWithConsent}
      />
    </div>
  )
}

export default function NewConsultationPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex flex-col gap-4 p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Cargando…</p>
        </div>
      }
    >
      <NewConsultationPageInner />
    </Suspense>
  )
}
