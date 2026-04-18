"use client"

import { useCallback, useEffect, useState } from "react"
import { UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type DoctorRow = {
  id: string
  email: string
  displayName: string | null
  createdAt: string
}

export function HospitalTeamView() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setListLoading(true)
    try {
      const res = await fetch("/api/clinic/team/doctors")
      const data = (await res.json()) as { ok?: boolean; doctors?: DoctorRow[]; error?: string }
      if (!res.ok) {
        setListError(true)
        return
      }
      setListError(false)
      setDoctors(Array.isArray(data.doctors) ? data.doctors : [])
    } catch {
      setListError(true)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(false), 0)
    return () => window.clearTimeout(t)
  }, [refresh])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setSaved(null)
    try {
      const res = await fetch("/api/clinic/team/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "No se pudo crear el médico.")
        return
      }
      setSaved("Médico creado. Comparte el correo y la contraseña por un canal seguro del hospital.")
      setEmail("")
      setPassword("")
      setDisplayName("")
      await refresh(false)
    } catch {
      setFormError("Error de red.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Equipo médico</h1>
        <p className="text-muted-foreground">
          Los médicos inician sesión con el acceso que crees aquí y pueden registrar y atender pacientes. El registro
          público solo sirve para el primer administrador del hospital.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="size-5 text-primary" />
              Nuevo médico
            </CardTitle>
            <CardDescription>Correo institucional y contraseña inicial (mín. 8 caracteres).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="space-y-4">
              {formError ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}
              {saved ? (
                <p className="rounded-lg border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-800 dark:text-green-300">
                  {saved}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="doc-email">Correo</Label>
                <Input
                  id="doc-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-name">Nombre (opcional)</Label>
                <Input
                  id="doc-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Dra. Ana López"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-pass">Contraseña inicial</Label>
                <Input
                  id="doc-pass"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creando…" : "Crear acceso de médico"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Médicos con acceso</CardTitle>
            <CardDescription>Cuentas con rol médico en esta instancia de Medly.</CardDescription>
          </CardHeader>
          <CardContent>
            {listError ? (
              <p className="text-sm text-destructive">No se pudo cargar la lista.</p>
            ) : listLoading && doctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : doctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay médicos dados de alta.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Correo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Alta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.email}</TableCell>
                      <TableCell className="text-muted-foreground">{d.displayName ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString("es-MX")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
