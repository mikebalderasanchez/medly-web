"use client"

import { startTransition, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Activity, Camera, CheckCircle2, Clock, MessageCircle, Pill, Stethoscope } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { readStoredExpedienteContext } from "@/lib/patient-expediente"
import { readStoredClinicPatientId } from "@/lib/patient-clinic-link"
import { readStoredClinicPrescriptionContext } from "@/lib/patient-clinic-prescription-context"
import { getOrCreatePatientDeviceId } from "@/lib/patient-device-id"
import { PATIENT_STORAGE_SYNC_EVENT } from "@/lib/patient-session-hydrate"

type ConsultationRow = {
  id: string
  reason: string
  status: string
  createdAt: string
}

function formatVisitDate(iso: string): string {
  const d = new Date(iso)
  return Number.isFinite(d.getTime())
    ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d)
    : iso
}

function shouldFetchConsultations(): boolean {
  const deviceId = getOrCreatePatientDeviceId()
  return Boolean(deviceId?.trim() && readStoredClinicPatientId())
}

export function PatientHomeDashboard() {
  const [expediente, setExpediente] = useState(() => readStoredExpedienteContext())
  const [linkedClinic, setLinkedClinic] = useState(() => Boolean(readStoredClinicPatientId()))
  const [hasClinicRx, setHasClinicRx] = useState(() => Boolean(readStoredClinicPrescriptionContext()))
  const [consultations, setConsultations] = useState<ConsultationRow[]>([])
  const [consultationsLoaded, setConsultationsLoaded] = useState(() => !shouldFetchConsultations())

  const fetchConsultations = useCallback(async () => {
    if (!shouldFetchConsultations()) return
    const deviceId = getOrCreatePatientDeviceId()
    if (!deviceId) return
    try {
      const res = await fetch(`/api/patient/consultations?deviceId=${encodeURIComponent(deviceId)}`)
      const data = (await res.json()) as { consultations?: ConsultationRow[] }
      if (Array.isArray(data.consultations)) {
        setConsultations(data.consultations)
      }
    } catch {
      /* ignore */
    } finally {
      setConsultationsLoaded(true)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      void fetchConsultations()
    })
  }, [fetchConsultations])

  useEffect(() => {
    const onSync = () => {
      setExpediente(readStoredExpedienteContext())
      setLinkedClinic(Boolean(readStoredClinicPatientId()))
      setHasClinicRx(Boolean(readStoredClinicPrescriptionContext()))
      startTransition(() => {
        void fetchConsultations()
      })
    }
    window.addEventListener(PATIENT_STORAGE_SYNC_EVENT, onSync)
    return () => window.removeEventListener(PATIENT_STORAGE_SYNC_EVENT, onSync)
  }, [fetchConsultations])

  const displayName = expediente?.patientName?.trim() || "Paciente"
  const meds = expediente?.activeMedications ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Hola, {displayName}</h1>
        <p className="text-sm text-muted-foreground">
          {linkedClinic
            ? "Tu expediente está vinculado al consultorio. Aquí ves un resumen; el detalle completo lo maneja tu médico."
            : "Resumen de tu sesión en Medly. Si recibiste un código por correo tras una consulta, puedes vincular tu expediente."}
        </p>
        {!linkedClinic ? (
          <Button variant="outline" size="sm" className="mt-1">
            <Link href="/patient/vincular">Vincular con código del correo</Link>
          </Button>
        ) : null}
      </div>

      {linkedClinic ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-foreground">
          <Stethoscope className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            Expediente conectado al consultorio. Las consultas que registre tu médico aparecen abajo cuando estén
            guardadas.
          </span>
        </div>
      ) : null}

      {hasClinicRx ? (
        <Card className="border-emerald-200/80 bg-emerald-50/50 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Receta del consultorio disponible</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mismo borrador que recibiste por correo. Puedes descargar PDF desde Recetas.
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary">
              <Link href="/patient/prescriptions">Ver en Recetas</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-gradient-to-r from-primary to-[#0d4a8a] text-white border-0 shadow-lg shadow-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-3">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-lg">Tu medicación en esta app</p>
              <p className="text-primary-foreground/80 text-sm">
                {meds.length
                  ? `${meds.length} medicamento(s) en el resumen. Pregunta al asistente si tienes dudas de horario o uso.`
                  : "Sin medicación listada aún. Si tu médico guardó una receta en la última consulta, puede tardar un momento en reflejarse tras vincular."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/patient/prescriptions"
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Camera className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Subir Receta</h3>
            <p className="text-xs text-muted-foreground mt-1">Foto para entender posología e indicaciones</p>
          </div>
        </Link>
        <Link
          href="/patient/chat"
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <MessageCircle className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Asistente</h3>
            <p className="text-xs text-muted-foreground mt-1">Dudas sobre medicamentos y tu expediente</p>
          </div>
        </Link>
      </div>

      {expediente ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="font-semibold text-sm">Datos en tu expediente</h2>
          <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            {expediente.age != null ? (
              <div>
                <dt className="font-medium text-foreground">Edad</dt>
                <dd>{expediente.age} años</dd>
              </div>
            ) : null}
            {expediente.bloodType ? (
              <div>
                <dt className="font-medium text-foreground">Tipo de sangre</dt>
                <dd>{expediente.bloodType}</dd>
              </div>
            ) : null}
            {expediente.allergies ? (
              <div className="sm:col-span-2">
                <dt className="font-medium text-foreground">Alergias</dt>
                <dd>{expediente.allergies}</dd>
              </div>
            ) : null}
            {expediente.chronicConditions ? (
              <div className="sm:col-span-2">
                <dt className="font-medium text-foreground">Antecedentes</dt>
                <dd>{expediente.chronicConditions}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Medicación activa</h2>
        {meds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay medicamentos en el resumen. Tu médico puede añadirlos al expediente o en la receta de la consulta.
          </p>
        ) : (
          <div className="space-y-3">
            {meds.map((m, i) => (
              <Card key={`${m.name}-${i}`} className="shadow-none">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{m.name}</h4>
                    <p className="text-xs text-muted-foreground">{m.instructions || "Sigue la pauta de tu receta."}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {linkedClinic ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Consultas en el consultorio</h2>
          {!consultationsLoaded ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay consultas guardadas vinculadas a tu expediente. Cuando tu médico archive una visita,
              aparecerá aquí.
            </p>
          ) : (
            <div className="space-y-2">
              {consultations.map((c) => (
                <Card key={c.id} className="shadow-none border-border/80">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{c.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatVisitDate(c.createdAt)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Estado: {c.status}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
