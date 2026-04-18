"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  initialError?: string
  nextPath: string
}

export function LoginForm({ initialError, nextPath }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [loading, setLoading] = useState(false)

  const serverBanner =
    initialError === "auth_secret"
      ? "Falta AUTH_SECRET en el servidor (mínimo 32 caracteres)."
      : initialError
        ? "No se pudo completar la solicitud. Vuelve a intentar."
        : null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Error al iniciar sesión.")
        return
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/")
      router.refresh()
    } catch {
      setError("Error de red.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Inicio de sesión</CardTitle>
        <CardDescription>
          Administración del hospital o médico: entra con el correo y contraseña que correspondan a tu rol.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(serverBanner || error) && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error ?? serverBanner}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t border-border/80 pt-4">
        <p className="text-center text-xs text-muted-foreground">
          ¿Sin cuenta?{" "}
          <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Registro (solo primer admin)
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
