import Link from "next/link"
import { Input } from "@/components/ui/input"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus } from "lucide-react"
import { CLINIC_DEMO_PATIENTS, listClinicPatientsFromDb } from "@/lib/clinic-repository"
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
        Mostrando datos de demostración. Define <code className="rounded bg-muted px-1">MONGODB_URI</code> en{" "}
        <code className="rounded bg-muted px-1">.env</code> para guardar pacientes reales en Atlas.
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
        Revisa la URI, usuario y contraseña, que la IP esté permitida en Atlas (Network Access) y el nombre de la base
        en <code className="rounded bg-background/60 px-1">MONGODB_DB</code> si la usas.
      </p>
      {badPasswordChars ? (
        <p className="mt-2 text-destructive/90">
          La URI parece incluir signos de “menor que” o “mayor que” en la contraseña (a veces se copian por error). En
          Atlas la contraseña debe ir tal cual, codificada en URL: por ejemplo ese signo como{" "}
          <code className="rounded bg-background/60 px-1">%3C</code> o{" "}
          <code className="rounded bg-background/60 px-1">%3E</code>, o sin esos caracteres.
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
          El detalle del error se registra en la terminal donde corre <code className="rounded px-1">next dev</code>{" "}
          (no en la consola del navegador). En desarrollo también aparece arriba el mensaje técnico.
        </p>
      )}
    </div>
  )
}

export default async function PatientsPage() {
  const configured = isAtlasConfigured()
  const mongoUriEnv = process.env.MONGODB_URI
  let patients = CLINIC_DEMO_PATIENTS
  let mode: "demo" | "mongo" | "error" = configured ? "mongo" : "demo"
  let connectionError: string | undefined
  let connectionHint: string | null = null

  if (configured) {
    try {
      const rows = await listClinicPatientsFromDb()
      if (rows !== null) {
        patients = rows
        mode = "mongo"
      }
    } catch (e) {
      connectionError = e instanceof Error ? e.message : String(e)
      connectionHint = mongoConnectionUserHint(e)
      console.error("[patients/page] MongoDB:", e)
      patients = []
      mode = "error"
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">Gestiona tus expedientes médicos.</p>
        </div>
        <Link
          href="/patients/new"
          className={cn(buttonVariants(), "inline-flex items-center justify-center")}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Paciente
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
          <Input type="search" placeholder="Buscar por nombre, ID..." className="pl-8" />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Última Visita</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No hay pacientes registrados. Crea uno con <span className="font-medium">Nuevo Paciente</span>.
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell
                    className="font-mono text-xs font-medium max-w-[160px] truncate"
                    title={patient.id}
                  >
                    #{patient.id}
                  </TableCell>
                  <TableCell>{patient.name}</TableCell>
                  <TableCell>{patient.age}</TableCell>
                  <TableCell>{patient.lastVisit}</TableCell>
                  <TableCell>{patient.status}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/patients/${patient.id}`} className="text-primary hover:underline">
                      Ver Expediente
                    </Link>
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
