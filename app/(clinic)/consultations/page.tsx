import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus, FileAudio, FileText } from "lucide-react"
import Link from "next/link"
import { CLINIC_DEMO_CONSULTATIONS, listClinicConsultationsFromDb } from "@/lib/clinic-repository"
import {
  isAtlasConfigured,
  mongoConnectionUserHint,
  mongoUriLikelyHasUnencodedPassword,
} from "@/lib/mongodb"

function DataNotice(props: {
  variant: "demo" | "mongo" | "error"
  errorDetail?: string
  mongoUriEnv?: string
  connectionHint?: string | null
}) {
  if (props.variant === "mongo") return null
  const base = "rounded-md border px-3 py-2 text-sm"
  if (props.variant === "demo") {
    return (
      <p className={`${base} border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100`}>
        Datos de demostración. Conecta <code className="rounded bg-muted px-1">MONGODB_URI</code> para persistir consultas en la base de datos.
      </p>
    )
  }
  const showDevDetail = process.env.NODE_ENV === "development" && props.errorDetail
  const badPasswordChars =
    props.mongoUriEnv && mongoUriLikelyHasUnencodedPassword(props.mongoUriEnv)
  return (
    <div className={`${base} border-destructive/40 bg-destructive/10 text-destructive`}>
      <p className="font-medium">No se pudo conectar a MongoDB.</p>
      <p className="mt-1 text-destructive/90">
        Revisa URI, credenciales, Network Access en Atlas y la variable <code className="rounded bg-background/60 px-1">MONGODB_DB</code>.
      </p>
      {badPasswordChars ? (
        <p className="mt-2 text-destructive/90">
          La contraseña en la URI parece incluir signos de “menor que” o “mayor que” literales. Quítalos o codifícalos
          en la URL (<code className="rounded bg-background/60 px-1">%3C</code>,{" "}
          <code className="rounded bg-background/60 px-1">%3E</code>).
        </p>
      ) : null}
      {props.connectionHint ? (
        <p className="mt-3 whitespace-pre-line rounded-md border border-foreground/10 bg-background/90 p-3 text-xs leading-relaxed text-foreground">
          {props.connectionHint}
        </p>
      ) : null}
      {showDevDetail ? (
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-background/80 p-2 font-mono text-xs text-foreground">
          {props.errorDetail}
        </pre>
      ) : (
        <p className="mt-2 text-xs text-destructive/80">
          Mira la terminal de <code className="rounded px-1">next dev</code> para el stack trace. En desarrollo el mensaje técnico aparece arriba.
        </p>
      )}
    </div>
  )
}

export default async function ConsultationsPage() {
  const configured = isAtlasConfigured()
  const mongoUriEnv = process.env.MONGODB_URI
  let consultations = CLINIC_DEMO_CONSULTATIONS
  let mode: "demo" | "mongo" | "error" = configured ? "mongo" : "demo"
  let connectionError: string | undefined
  let connectionHint: string | null = null

  if (configured) {
    try {
      const rows = await listClinicConsultationsFromDb()
      if (rows !== null) {
        consultations = rows
        mode = "mongo"
      }
    } catch (e) {
      connectionError = e instanceof Error ? e.message : String(e)
      connectionHint = mongoConnectionUserHint(e)
      console.error("[consultations/page] MongoDB:", e)
      consultations = []
      mode = "error"
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consultas</h1>
          <p className="text-muted-foreground">Historial de consultas y transcripciones.</p>
        </div>
        <Link href="/consultations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Iniciar Consulta
          </Button>
        </Link>
      </div>

      <DataNotice
        variant={mode}
        errorDetail={connectionError}
        mongoUriEnv={mongoUriEnv}
        connectionHint={connectionHint}
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Buscar por paciente, motivo..." className="pl-8" />
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
            {consultations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No hay consultas guardadas. Registra audio en <span className="font-medium">Iniciar Consulta</span> y
                  pulsa <span className="font-medium">Guardar en Expediente</span>.
                </TableCell>
              </TableRow>
            ) : (
              consultations.map((consultation) => (
                <TableRow key={consultation.id}>
                  <TableCell
                    className="font-mono text-xs font-medium max-w-[120px] truncate"
                    title={consultation.id}
                  >
                    #{consultation.id}
                  </TableCell>
                  <TableCell>{consultation.patient}</TableCell>
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
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Transcripción (próximamente)" type="button" disabled>
                        <FileAudio className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Resumen (próximamente)" type="button" disabled>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
