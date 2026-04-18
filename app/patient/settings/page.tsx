"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  applyThemePreference,
  readClinicSettings,
  writeClinicSettings,
  type ThemePreference,
} from "@/lib/clinic-settings"
import { PATIENT_PRESCRIPTION_STORAGE_KEY } from "@/lib/patient-prescription-context"
import { PATIENT_EXPEDIENTE_STORAGE_KEY } from "@/lib/patient-expediente"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Eraser, Monitor, Moon, Sun } from "lucide-react"

export default function PatientSettingsPage() {
  const [theme, setTheme] = useState<ThemePreference>("system")

  useEffect(() => {
    setTheme(readClinicSettings().theme)
  }, [])

  const setThemeChoice = (t: ThemePreference) => {
    const next = writeClinicSettings({ ...readClinicSettings(), theme: t })
    setTheme(next.theme)
    applyThemePreference(next.theme)
  }

  const clearLocalPatientData = () => {
    if (!window.confirm("¿Borrar receta analizada y expediente guardados en este navegador?")) return
    try {
      window.sessionStorage.removeItem(PATIENT_PRESCRIPTION_STORAGE_KEY)
      window.sessionStorage.removeItem(PATIENT_EXPEDIENTE_STORAGE_KEY)
    } catch {
    }
    window.alert("Datos locales del paciente eliminados. Vuelve a Inicio o a Recetas si necesitas regenerar el contexto.")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" className="shrink-0 rounded-full" asChild>
          <Link href="/patient" aria-label="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-sm text-muted-foreground">Tema y datos guardados solo en este dispositivo.</p>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Tema</CardTitle>
          <CardDescription>Misma preferencia que en el panel clínico (se guarda en el navegador).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setThemeChoice("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Claro
          </Button>
          <Button type="button" variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setThemeChoice("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Oscuro
          </Button>
          <Button type="button" variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setThemeChoice("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            Sistema
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Privacidad en este dispositivo</CardTitle>
          <CardDescription>La app de paciente usa datos temporales en sessionStorage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Puedes borrar la receta analizada y el expediente demo cargados para el asistente, sin afectar la cuenta clínica.
          </p>
          <Separator />
          <Button type="button" variant="destructive" className="w-full sm:w-auto" onClick={clearLocalPatientData}>
            <Eraser className="mr-2 h-4 w-4" />
            Borrar datos del paciente en este navegador
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
