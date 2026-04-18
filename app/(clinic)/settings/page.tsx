"use client"

import { useEffect, useState } from "react"
import {
  applyThemePreference,
  DEFAULT_CLINIC_SETTINGS,
  type ClinicSettings,
  readClinicSettings,
  resetClinicSettings,
  writeClinicSettings,
} from "@/lib/clinic-settings"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { LucideIcon } from "lucide-react"
import { Bell, Building2, Moon, Palette, RotateCcw, Save, Sun, Monitor, User, Mail, Languages, Plug } from "lucide-react"

function ThemeOption({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      className="h-auto flex-1 flex-col gap-2 py-4 sm:flex-initial sm:min-w-[7.5rem]"
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </Button>
  )
}

type AuthMeUser = {
  email: string
  displayName: string | null
  specialty: string | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_CLINIC_SETTINGS)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    const local = readClinicSettings()
    setSettings(local)
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = (await res.json()) as { user?: AuthMeUser | null }
        if (cancelled || !data.user) return
        setAccountEmail(data.user.email)
        setSettings((s) => ({
          ...s,
          displayName: data.user?.displayName?.trim() || s.displayName,
          specialty: data.user?.specialty?.trim() || s.specialty,
        }))
      } catch {
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const patch = (partial: Partial<ClinicSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }

  const persist = (partial: Partial<ClinicSettings>) => {
    const next = writeClinicSettings({ ...settings, ...partial })
    setSettings(next)
    if (partial.theme !== undefined) {
      applyThemePreference(next.theme)
    }
    setSavedFlash("Cambios guardados")
    window.setTimeout(() => setSavedFlash(null), 2200)
  }

  const syncAuthProfileToServer = async (next: ClinicSettings) => {
    setProfileError(null)
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: next.displayName,
        specialty: next.specialty,
      }),
    })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    if (!res.ok) {
      setProfileError(typeof data.error === "string" ? data.error : "No se pudo guardar el perfil en la cuenta.")
      return false
    }
    window.dispatchEvent(new CustomEvent("medly:auth-profile-updated"))
    return true
  }

  const saveAll = async () => {
    const ok = await syncAuthProfileToServer(settings)
    if (!ok) return
    const next = writeClinicSettings(settings)
    setSettings(next)
    applyThemePreference(next.theme)
    setSavedFlash("Cambios guardados")
    window.setTimeout(() => setSavedFlash(null), 2200)
  }

  const resetDefaults = () => {
    if (!window.confirm("¿Restaurar todos los valores por defecto de esta pantalla?")) return
    const next = resetClinicSettings()
    setSettings(next)
    applyThemePreference(next.theme)
    setSavedFlash("Preferencias restauradas")
    window.setTimeout(() => setSavedFlash(null), 2200)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Tema e idioma se guardan en este navegador. Nombre y especialidad del perfil también se guardan en tu
            cuenta (servidor) para el encabezado y otras sesiones.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profileError ? (
            <span className="text-sm font-medium text-destructive" role="alert">
              {profileError}
            </span>
          ) : null}
          {savedFlash ? (
            <span className="text-sm font-medium text-green-600 dark:text-green-400" role="status">
              {savedFlash}
            </span>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={resetDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurar
          </Button>
          <Button type="button" size="sm" onClick={saveAll}>
            <Save className="mr-2 h-4 w-4" />
            Guardar todo
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Apariencia</CardTitle>
            </div>
            <CardDescription>Tema de la interfaz. Se guarda en este navegador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tema</Label>
              <div className="flex flex-wrap gap-2">
                <ThemeOption
                  active={settings.theme === "light"}
                  icon={Sun}
                  label="Claro"
                  onClick={() => persist({ theme: "light" })}
                />
                <ThemeOption
                  active={settings.theme === "dark"}
                  icon={Moon}
                  label="Oscuro"
                  onClick={() => persist({ theme: "dark" })}
                />
                <ThemeOption
                  active={settings.theme === "system"}
                  icon={Monitor}
                  label="Sistema"
                  onClick={() => persist({ theme: "system" })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <CardTitle>Idioma</CardTitle>
            </div>
            <CardDescription>Interfaz (contenido médico sigue dependiendo de tus fuentes).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={settings.language === "es" ? "default" : "outline"}
              onClick={() => persist({ language: "es" })}
            >
              Español
            </Button>
            <Button
              type="button"
              variant={settings.language === "en" ? "default" : "outline"}
              onClick={() => persist({ language: "en" })}
            >
              English
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Perfil en pantalla</CardTitle>
            </div>
            <CardDescription>
              Nombre y especialidad se sincronizan con tu usuario de acceso (MongoDB). El correo de la cuenta es el
              mismo con el que inicias sesión.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {accountEmail ? (
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  Correo de la cuenta (sesión)
                </Label>
                <Input value={accountEmail} readOnly className="bg-muted/50" />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre para mostrar</Label>
              <Input
                id="displayName"
                value={settings.displayName}
                onChange={(e) => patch({ displayName: e.target.value })}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidad</Label>
              <Input
                id="specialty"
                value={settings.specialty}
                onChange={(e) => patch({ specialty: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="clinicName" className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                Nombre del consultorio
              </Label>
              <Input
                id="clinicName"
                value={settings.clinicName}
                onChange={(e) => patch({ clinicName: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Correo de contacto
              </Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => patch({ email: e.target.value })}
                autoComplete="email"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t pt-6">
            <Button type="button" onClick={saveAll}>
              Guardar perfil
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notificaciones</CardTitle>
            </div>
            <CardDescription>Preferencias para avisos en la app (cuando exista canal de envío).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-input accent-primary"
                checked={settings.notifyConsultations}
                onChange={(e) => patch({ notifyConsultations: e.target.checked })}
              />
              <span>
                <span className="font-medium text-foreground">Consultas y transcripciones</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Avisar cuando una consulta termine de procesarse o falle el audio.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-input accent-primary"
                checked={settings.notifyFollowups}
                onChange={(e) => patch({ notifyFollowups: e.target.checked })}
              />
              <span>
                <span className="font-medium text-foreground">Seguimiento de pacientes</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Recordatorios de revisiones o resultados pendientes.
                </span>
              </span>
            </label>
          </CardContent>
          <CardFooter className="justify-end border-t pt-6">
            <Button type="button" variant="secondary" onClick={saveAll}>
              Guardar notificaciones
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" />
              <CardTitle>Integraciones (servidor)</CardTitle>
            </div>
            <CardDescription>Variables de entorno del despliegue Next.js; no se editan desde el navegador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Para transcripción y extracción de consultas: <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">ELEVENLABS_API_KEY</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">GEMINI_API_KEY</code>.
            </p>
            <p>
              Para el asistente y lectura de recetas del paciente: <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">GEMINI_API_KEY</code>.
            </p>
            <Separator className="my-2" />
            <p className="text-xs">Sin claves configuradas, la app usa respuestas de demostración donde corresponda.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
