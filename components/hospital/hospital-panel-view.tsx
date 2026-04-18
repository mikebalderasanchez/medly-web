"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Activity,
  ArrowRight,
  Building2,
  FileText,
  Mic,
  Server,
  Shield,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { readClinicSettings, type ClinicSettings } from "@/lib/clinic-settings"
import { cn } from "@/lib/utils"

type LoadState = "idle" | "loading" | "done" | "error"

export function HospitalPanelView() {
  const [settings, setSettings] = useState<ClinicSettings | null>(null)
  const [load, setLoad] = useState<LoadState>("idle")
  const [patientCount, setPatientCount] = useState<number | null>(null)
  const [consultCount, setConsultCount] = useState<number | null>(null)
  const [mongoPatients, setMongoPatients] = useState<boolean | null>(null)
  const [mongoConsults, setMongoConsults] = useState<boolean | null>(null)

  useEffect(() => {
    const sync = () => setSettings(readClinicSettings())
    sync()
    window.addEventListener("medly:clinic-settings-updated", sync)
    return () => window.removeEventListener("medly:clinic-settings-updated", sync)
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoad("loading")
      try {
        const [pr, cr] = await Promise.all([
          fetch("/api/clinic/patients"),
          fetch("/api/clinic/consultations"),
        ])
        const pj = (await pr.json()) as {
          ok?: boolean
          configured?: boolean
          patients?: unknown[]
        }
        const cj = (await cr.json()) as {
          ok?: boolean
          configured?: boolean
          consultations?: unknown[]
        }
        if (cancelled) return
        setMongoPatients(Boolean(pj.configured))
        setMongoConsults(Boolean(cj.configured))
        setPatientCount(Array.isArray(pj.patients) ? pj.patients.length : 0)
        setConsultCount(Array.isArray(cj.consultations) ? cj.consultations.length : 0)
        setLoad("done")
      } catch {
        if (!cancelled) setLoad("error")
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const hospitalName = settings?.clinicName?.trim() || "Tu hospital"
  const dataReady = load === "done"
  const dataLive = Boolean(mongoPatients && mongoConsults)

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background to-background px-6 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Building2 className="size-3.5" aria-hidden />
              Panel institucional
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{hospitalName}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Como administrador defines el acceso de los médicos; ellos atienden pacientes y consultas. Aquí ves
              actividad agregada, datos bajo tu control y enlaces al trabajo clínico diario.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/hospital/equipo"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "shadow-sm"
              )}
            >
              <UserCog className="mr-1 size-3.5" />
              Equipo médico
            </Link>
            <Link
              href="/settings"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-primary/25 bg-background/80 backdrop-blur-sm"
              )}
            >
              Datos del centro
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes registrados</CardTitle>
            <Users className="size-4 text-primary/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {load === "loading" ? "…" : load === "error" ? "—" : patientCount ?? "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {dataReady ? (mongoPatients ? "En tu base de datos" : "Modo demostración") : "Cargando…"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas guardadas</CardTitle>
            <FileText className="size-4 text-primary/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {load === "loading" ? "…" : load === "error" ? "—" : consultCount ?? "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {dataReady ? (mongoConsults ? "En tu base de datos" : "Modo demostración") : "Cargando…"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Origen de datos</CardTitle>
            <Server className="size-4 text-primary/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataLive ? "Local" : dataReady ? "Demo / mixto" : "…"}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Medly pensado para instalarse en infraestructura del hospital.
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidencialidad</CardTitle>
            <Shield className="size-4 text-primary/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Activa</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sesión protegida; revisa permisos de red y copias de seguridad en tu política interna.
            </p>
          </CardContent>
        </Card>
      </div>

      {load === "error" ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          No se pudieron cargar las métricas. Comprueba la sesión y que la API del clínico responda.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="size-5 text-primary" />
              Áreas de trabajo
            </CardTitle>
            <CardDescription>
              Accesos directos al día a día clínico y al seguimiento documental.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/patients"
              className="group flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              <Users className="size-8 text-primary" />
              <span className="font-semibold">Pacientes</span>
              <span className="text-xs text-muted-foreground">Expedientes y altas en el sistema.</span>
              <span className="text-xs font-medium text-primary group-hover:underline">Abrir</span>
            </Link>
            <Link
              href="/consultations"
              className="group flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              <Stethoscope className="size-8 text-primary" />
              <span className="font-semibold">Consultas</span>
              <span className="text-xs text-muted-foreground">Historial y estados de transcripción.</span>
              <span className="text-xs font-medium text-primary group-hover:underline">Abrir</span>
            </Link>
            <Link
              href="/consultations/new"
              className="group flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              <Mic className="size-8 text-primary" />
              <span className="font-semibold">Nueva consulta (audio)</span>
              <span className="text-xs text-muted-foreground">Iniciar captura y procesamiento asistido.</span>
              <span className="text-xs font-medium text-primary group-hover:underline">Abrir</span>
            </Link>
            <Link
              href="/stats"
              className="group flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              <Activity className="size-8 text-primary" />
              <span className="font-semibold">Indicadores</span>
              <span className="text-xs text-muted-foreground">Vista agregada para dirección y calidad.</span>
              <span className="text-xs font-medium text-primary group-hover:underline">Abrir</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-dashed border-primary/20 bg-primary/[0.02]">
          <CardHeader>
            <CardTitle className="text-lg">Prioridades hospitalarias</CardTitle>
            <CardDescription>Marco operativo sugerido para Medly en tu centro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-2">
              <li>Mantener expedientes completos antes de derivar a seguimiento al paciente.</li>
              <li>Usar transcripción y resumen como apoyo, no sustituto del criterio clínico.</li>
              <li>Definir quién administra accesos y rotación de contraseñas del panel.</li>
            </ul>
            <Link href="/" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
              Ir al resumen diario (inicio)
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
