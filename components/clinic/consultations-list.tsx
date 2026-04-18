"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { FileAudio, FileText, Loader2, Mail, Search, User } from "lucide-react"

import type { ClinicConsultationListRow } from "@/lib/clinic-types"
import type { ConsultationExtraction } from "@/lib/consultation-extraction"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PostVisitPortalInvitePanel } from "@/components/clinic/post-visit-portal-invite-panel"

type ConsultationDetail = {
  id: string
  patientId: string | null
  patientName: string | null
  reason: string
  status: string
  transcription: string | null
  notes: string | null
  structured: ConsultationExtraction | null
  prescription: {
    diagnosis: string | null
    previewText: string
    generalNotes: string | null
    lines: Array<{ drug: string; dose: string; route: string; frequency: string; duration: string }>
  } | null
  createdAt: string
  updatedAt: string
}

function formatSummaryText(c: ConsultationDetail): string {
  const lines: string[] = []
  lines.push(`Motivo: ${c.reason}`)
  lines.push(`Estado: ${c.status}`)
  if (c.patientName) lines.push(`Nombre en consulta: ${c.patientName}`)
  const p = c.structured?.patient
  if (p) {
    lines.push("")
    lines.push("— Paciente (extracción) —")
    if (p.name) lines.push(`Nombre: ${p.name}`)
    if (p.age) lines.push(`Edad: ${p.age}`)
    if (p.height_cm != null) lines.push(`Altura: ${p.height_cm} cm`)
    if (p.weight_kg != null) lines.push(`Peso: ${p.weight_kg} kg`)
    if (p.gender) lines.push(`Género: ${p.gender}`)
    if (p.bloodType) lines.push(`Tipo de sangre: ${p.bloodType}`)
    if (p.knownAllergies?.length) lines.push(`Alergias: ${p.knownAllergies.join(", ")}`)
  }
  if (c.structured?.describedSymptoms?.length) {
    lines.push("")
    lines.push("— Síntomas —")
    c.structured.describedSymptoms.forEach((s) => lines.push(`• ${s}`))
  }
  if (c.structured?.knownIllnesses?.length) {
    lines.push("")
    lines.push("— Enfermedades conocidas —")
    c.structured.knownIllnesses.forEach((s) => lines.push(`• ${s}`))
  }
  if (c.structured?.additionalMedications?.length) {
    lines.push("")
    lines.push("— Medicación adicional —")
    c.structured.additionalMedications.forEach((s) => lines.push(`• ${s}`))
  }
  if (c.structured?.currentEmergency) {
    lines.push("")
    lines.push(`— Emergencia —\n${c.structured.currentEmergency}`)
  }
  if (c.prescription?.previewText?.trim()) {
    lines.push("")
    lines.push("— Receta / indicaciones (borrador) —")
    lines.push(c.prescription.previewText.trim())
  } else if (c.prescription?.lines?.some((l) => l.drug.trim())) {
    lines.push("")
    lines.push("— Receta —")
    c.prescription.lines.forEach((l, i) => {
      if (!l.drug.trim()) return
      lines.push(`${i + 1}. ${[l.drug, l.dose, l.route, l.frequency, l.duration].filter(Boolean).join(" · ")}`)
    })
    if (c.prescription.diagnosis) lines.push(`Diagnóstico: ${c.prescription.diagnosis}`)
    if (c.prescription.generalNotes) lines.push(`Notas: ${c.prescription.generalNotes}`)
  }
  if (c.notes?.trim()) {
    lines.push("")
    lines.push("— Notas clínicas —")
    lines.push(c.notes.trim())
  }
  lines.push("")
  lines.push(`Registrada: ${new Date(c.createdAt).toLocaleString("es-MX")}`)
  return lines.join("\n")
}

type Props = {
  initialRows: ClinicConsultationListRow[]
  mongo: boolean
}

type DialogKind = "transcription" | "summary" | "portal" | null

export function ConsultationsList({ initialRows, mongo }: Props) {
  const [query, setQuery] = useState("")
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConsultationDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return initialRows
    return initialRows.filter((r) => {
      const blob = [r.id, r.patient, r.reason, r.date, r.status, r.patientId ?? ""].join(" ").toLowerCase()
      return blob.includes(q)
    })
  }, [initialRows, query])

  const openDialog = useCallback(
    async (kind: Exclude<DialogKind, null>, consultationId: string) => {
      if (!mongo) return
      setActiveId(consultationId)
      setDialog(kind)
      setLoadError(null)
      if (kind === "portal") {
        setDetail(null)
        return
      }
      setLoading(true)
      setDetail(null)
      try {
        const res = await fetch(`/api/clinic/consultations/${encodeURIComponent(consultationId)}`)
        const data = (await res.json()) as { consultation?: ConsultationDetail | null; error?: string }
        if (!res.ok || !data.consultation) {
          setLoadError(typeof data.error === "string" ? data.error : "No se pudo cargar la consulta.")
          return
        }
        setDetail(data.consultation)
      } catch {
        setLoadError("Error de red.")
      } finally {
        setLoading(false)
      }
    },
    [mongo]
  )

  const closeDialog = () => {
    setDialog(null)
    setActiveId(null)
    setDetail(null)
    setLoadError(null)
    setLoading(false)
  }

  const portalPatientId =
    dialog === "portal" && activeId
      ? initialRows.find((r) => r.id === activeId)?.patientId ?? null
      : null

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por paciente, motivo, ID…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filtrar consultas"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Fecha y Hora</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  {initialRows.length === 0
                    ? "No hay consultas guardadas. Registra audio en Iniciar Consulta y pulsa Guardar en Expediente."
                    : "Ninguna consulta coincide con la búsqueda."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((consultation) => (
                <TableRow key={consultation.id}>
                  <TableCell
                    className="font-mono text-xs font-medium max-w-[120px] truncate"
                    title={consultation.id}
                  >
                    #{consultation.id}
                  </TableCell>
                  <TableCell>
                    {consultation.patientId ? (
                      <Link
                        href={`/patients/${encodeURIComponent(consultation.patientId)}`}
                        className="text-primary hover:underline"
                      >
                        {consultation.patient}
                      </Link>
                    ) : (
                      consultation.patient
                    )}
                  </TableCell>
                  <TableCell>{consultation.date}</TableCell>
                  <TableCell>{consultation.reason}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        consultation.status === "Completada"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {consultation.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {consultation.patientId ? (
                        <Button variant="ghost" size="icon" title="Expediente del paciente">
                          <Link href={`/patients/${encodeURIComponent(consultation.patientId)}`}>
                            <User className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={mongo ? "Ver transcripción" : "Conecta MongoDB para ver detalle"}
                        type="button"
                        disabled={!mongo}
                        onClick={() => void openDialog("transcription", consultation.id)}
                      >
                        <FileAudio className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={mongo ? "Ver resumen clínico" : "Conecta MongoDB para ver detalle"}
                        type="button"
                        disabled={!mongo}
                        onClick={() => void openDialog("summary", consultation.id)}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={
                          consultation.patientId
                            ? "Enviar acceso al portal por correo"
                            : "Vincula un paciente al expediente para invitar"
                        }
                        type="button"
                        disabled={!mongo || !consultation.patientId}
                        onClick={() => void openDialog("portal", consultation.id)}
                        className={
                          mongo && consultation.patientId
                            ? "text-primary hover:bg-primary/10 hover:text-primary"
                            : undefined
                        }
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialog === "transcription"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transcripción</DialogTitle>
            <DialogDescription>Texto en bruto guardado con la consulta.</DialogDescription>
          </DialogHeader>
          {loadError ? <p className="text-destructive text-sm">{loadError}</p> : null}
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm font-sans leading-relaxed max-h-[60vh] overflow-y-auto">
              {detail?.transcription?.trim()
                ? detail.transcription
                : "No hay transcripción guardada para esta consulta."}
            </pre>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "summary"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumen clínico</DialogTitle>
            <DialogDescription>
              Datos estructurados, receta en borrador y notas tal como se guardaron.
            </DialogDescription>
          </DialogHeader>
          {loadError ? <p className="text-destructive text-sm">{loadError}</p> : null}
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm font-sans leading-relaxed max-h-[60vh] overflow-y-auto">
              {detail ? formatSummaryText(detail) : ""}
            </pre>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "portal"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitación al portal</DialogTitle>
            <DialogDescription>
              El paciente recibirá un correo con un enlace de un solo uso para vincular su expediente en Medly.
            </DialogDescription>
          </DialogHeader>
          {portalPatientId ? (
            <PostVisitPortalInvitePanel
              patientId={portalPatientId}
              title="Correo al paciente"
              description="Se actualizará el correo en el expediente y se enviará el acceso."
            />
          ) : (
            <p className="text-sm text-muted-foreground">No hay paciente vinculado a esta consulta.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
