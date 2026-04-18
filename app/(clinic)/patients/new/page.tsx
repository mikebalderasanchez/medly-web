"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, UserPlus } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type FormState = {
  name: string
  age: string
  gender: string
  bloodType: string
  allergies: string
  chronicConditions: string
  phone: string
  email: string
  notes: string
}

const initialForm: FormState = {
  name: "",
  age: "",
  gender: "",
  bloodType: "",
  allergies: "",
  chronicConditions: "",
  phone: "",
  email: "",
  notes: "",
}

export default function NewPatientPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}
    const name = form.name.trim()
    if (name.length < 2) next.name = "Indica al menos 2 caracteres."
    const ageNum = Number(form.age)
    if (form.age.trim() === "" || !Number.isFinite(ageNum) || ageNum < 0 || ageNum > 130) {
      next.age = "Indica una edad válida (0–130)."
    }
    if (!form.gender) next.gender = "Selecciona una opción."
    if (!form.bloodType) next.bloodType = "Selecciona el tipo de sangre."
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Correo no válido."
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/clinic/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          age: Number(form.age),
          gender: form.gender,
          bloodType: form.bloodType,
          allergies: form.allergies.trim(),
          chronicConditions: form.chronicConditions.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          notes: form.notes.trim(),
        }),
      })
      const data = (await res.json()) as { error?: string; patient?: { id: string } }
      if (!res.ok) {
        setSubmitError(typeof data.error === "string" ? data.error : "No se pudo guardar el paciente.")
        return
      }
      if (data.patient?.id) setCreatedId(data.patient.id)
      setSuccess(true)
    } catch {
      setSubmitError("Error de red al contactar el servidor.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Paciente registrado
            </CardTitle>
            <CardDescription>
              Los datos de <span className="font-medium text-foreground">{form.name.trim()}</span> quedaron guardados
              en MongoDB.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(initialForm)
                setErrors({})
                setSuccess(false)
                setCreatedId(null)
                setSubmitError(null)
              }}
            >
              Registrar otro
            </Button>
            <Button type="button" onClick={() => router.push("/patients")}>
              Ir al listado
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                router.push(
                  `/consultations/new?patientId=${encodeURIComponent(createdId ?? "")}`
                )
              }
              disabled={!createdId}
            >
              Iniciar consulta
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/patients"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
          aria-label="Volver al listado de pacientes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo paciente</h1>
          <p className="text-muted-foreground">Completa el expediente básico. Puedes ampliarlo después en la ficha.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Datos del expediente</CardTitle>
            <CardDescription>Información alineada con la ficha de paciente del dashboard.</CardDescription>
          </CardHeader>
          {submitError ? (
            <div className="text-destructive px-6 text-sm" role="alert">
              {submitError}
            </div>
          ) : null}
          <CardContent className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  aria-invalid={!!errors.name}
                />
                {errors.name ? <p className="text-destructive text-xs">{errors.name}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="age">Edad (años)</Label>
                <Input
                  id="age"
                  type="number"
                  min={0}
                  max={130}
                  inputMode="numeric"
                  value={form.age}
                  onChange={(e) => setField("age", e.target.value)}
                  aria-invalid={!!errors.age}
                />
                {errors.age ? <p className="text-destructive text-xs">{errors.age}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gender">Género</Label>
                <Select
                  value={form.gender === "" ? null : form.gender}
                  onValueChange={(v) => setField("gender", (v as string) ?? "")}
                >
                  <SelectTrigger id="gender" aria-invalid={!!errors.gender}>
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                    <SelectItem value="Prefiero no decir">Prefiero no decir</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender ? <p className="text-destructive text-xs">{errors.gender}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bloodType">Tipo de sangre</Label>
                <Select
                  value={form.bloodType === "" ? null : form.bloodType}
                  onValueChange={(v) => setField("bloodType", (v as string) ?? "")}
                >
                  <SelectTrigger id="bloodType" aria-invalid={!!errors.bloodType}>
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                    <SelectItem value="Desconocido">Desconocido</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bloodType ? <p className="text-destructive text-xs">{errors.bloodType}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="email">Correo (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  aria-invalid={!!errors.email}
                />
                {errors.email ? <p className="text-destructive text-xs">{errors.email}</p> : null}
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="allergies">Alergias</Label>
                <Textarea
                  id="allergies"
                  placeholder="Ej. Penicilina, mariscos…"
                  className="min-h-[80px] resize-y"
                  value={form.allergies}
                  onChange={(e) => setField("allergies", e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="chronic">Condiciones crónicas</Label>
                <Textarea
                  id="chronic"
                  placeholder="Ej. Hipertensión, diabetes tipo 2…"
                  className="min-h-[80px] resize-y"
                  value={form.chronicConditions}
                  onChange={(e) => setField("chronicConditions", e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="notes">Notas internas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Observaciones para el equipo clínico."
                  className="min-h-[72px] resize-y"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-2 border-t">
            <Link href="/patients" className={cn(buttonVariants({ variant: "outline" }))}>
              Cancelar
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Guardar paciente
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
