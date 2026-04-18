"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function RegisterForm() {
  const router = useRouter()
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch("/api/auth/register-status")
        const data = (await res.json()) as { registrationOpen?: boolean }
        if (!cancelled) setRegistrationOpen(Boolean(data.registrationOpen))
      } catch {
        if (!cancelled) setRegistrationOpen(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo registrar.")
        return
      }
      router.push("/hospital")
      router.refresh()
    } catch {
      setError("Error de red.")
    } finally {
      setLoading(false)
    }
  }

  const closed = registrationOpen === false
  const checking = registrationOpen === null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Alta del hospital</CardTitle>
        <CardDescription>
          Solo el <strong>primer</strong> usuario se registra aquí como administrador del hospital. Los médicos los
          crea el admin desde <span className="font-medium text-foreground">Panel hospital → Equipo médico</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {checking ? (
          <p className="text-sm text-muted-foreground">Comprobando si el registro está disponible…</p>
        ) : null}
        {closed ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            El registro público ya no está disponible: el hospital tiene administrador. Pide a administración que te
            cree un acceso de médico, o inicia sesión si ya tienes cuenta.
          </p>
        ) : null}
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {!closed && !checking ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-email">Correo del administrador</Label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Contraseña</Label>
              <Input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creando administrador…" : "Crear administrador del hospital"}
            </Button>
          </form>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t border-border/80 pt-4">
        <p className="text-center text-xs text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
