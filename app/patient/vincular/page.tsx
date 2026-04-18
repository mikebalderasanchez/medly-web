import { Suspense } from "react"

import { VincularPacienteForm } from "@/components/patient/vincular-paciente-form"

export default function PatientVincularPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Cargando formulario de acceso…</p>}
    >
      <VincularPacienteForm />
    </Suspense>
  )
}
