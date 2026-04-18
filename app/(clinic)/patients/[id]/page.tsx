import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Activity, Clock } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getClinicPatientById, listConsultationsForPatient } from "@/lib/clinic-repository"
import { PatientPortalInviteButton } from "@/components/clinic/patient-portal-invite-button"
import { isAtlasConfigured } from "@/lib/mongodb"

function formatVisitDate(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(d)
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const configured = isAtlasConfigured()

  if (configured) {
    const patient = await getClinicPatientById(id)
    if (!patient) notFound()

    const visits = await listConsultationsForPatient(id)

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
            <p className="text-muted-foreground">ID: {patient.id} • Expediente Médico</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href={`/consultations/new?patientId=${encodeURIComponent(patient.id)}`}>
              <Button>
                <Activity className="mr-2 h-4 w-4" /> Iniciar Consulta
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Información General</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="font-semibold">Edad:</div>
                <div>{patient.age} años</div>
                <div className="font-semibold">Género:</div>
                <div>{patient.gender}</div>
                <div className="font-semibold">Tipo de Sangre:</div>
                <div>{patient.bloodType}</div>
                {patient.phone ? (
                  <>
                    <div className="font-semibold">Teléfono:</div>
                    <div>{patient.phone}</div>
                  </>
                ) : null}
                {patient.email ? (
                  <>
                    <div className="font-semibold">Correo:</div>
                    <div className="break-all">{patient.email}</div>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Alergias y Condiciones</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <div className="font-semibold">Alergias:</div>
                <div>{patient.allergies || "—"}</div>
                <div className="font-semibold">Crónicas:</div>
                <div>{patient.chronicConditions || "—"}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Notas internas</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {patient.notes?.trim() ? patient.notes : "Sin notas registradas."}
            </CardContent>
          </Card>
        </div>

        <PatientPortalInviteButton patientId={patient.id} patientEmail={patient.email ?? ""} />

        <Card>
          <CardHeader>
            <CardTitle>Historial de Consultas</CardTitle>
            <CardDescription>Registro guardado en MongoDB para este paciente.</CardDescription>
          </CardHeader>
          <CardContent>
            {visits.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aún no hay consultas guardadas para este expediente.</p>
            ) : (
              <div className="space-y-4">
                {visits.map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{visit.reason}</p>
                        <p className="text-xs text-muted-foreground">{formatVisitDate(visit.createdAt)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" type="button" disabled>
                      <FileText className="mr-2 h-4 w-4" />
                      Ver Nota
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const patient = {
    id,
    name: "Juan Pérez",
    age: 45,
    gender: "Masculino",
    bloodType: "O+",
    allergies: "Penicilina",
    chronicConditions: "Hipertensión",
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        Vista de demostración sin MongoDB. Conecta <code className="rounded bg-muted px-1">MONGODB_URI</code> para ver
        expedientes reales.
      </p>
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
          <p className="text-muted-foreground">ID: #{patient.id} • Expediente Médico</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/consultations/new?patientId=${patient.id}`}>
            <Button>
              <Activity className="mr-2 h-4 w-4" /> Iniciar Consulta
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Información General</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="font-semibold">Edad:</div>
              <div>{patient.age} años</div>
              <div className="font-semibold">Género:</div>
              <div>{patient.gender}</div>
              <div className="font-semibold">Tipo de Sangre:</div>
              <div>{patient.bloodType}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alergias y Condiciones</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <div className="font-semibold">Alergias:</div>
              <div>{patient.allergies}</div>
              <div className="font-semibold">Crónicas:</div>
              <div>{patient.chronicConditions}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resumen RAG (IA)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Paciente con historial de hipertensión controlada. Última consulta hace 1 semana por dolor de cabeza leve,
            se ajustó medicación. Sin incidentes graves recientes.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Consultas</CardTitle>
          <CardDescription>Registro cronológico de atenciones previas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: "10 Abril 2026", reason: "Revisión de presión arterial", doc: "Dra. Ramírez" },
              { date: "15 Febrero 2026", reason: "Infección estomacal", doc: "Dr. Usuario" },
              { date: "02 Diciembre 2025", reason: "Chequeo general", doc: "Dr. Usuario" },
            ].map((visit, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{visit.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {visit.date} • Atendido por {visit.doc}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Nota
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
