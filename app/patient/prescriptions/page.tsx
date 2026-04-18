"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, Camera, ImagePlus, X, Loader2, CheckCircle2 } from "lucide-react"
import type { PrescriptionAnalysis } from "@/lib/prescription-extraction"
import { writeStoredPrescriptionContext } from "@/lib/patient-prescription-context"
import { getOrCreatePatientDeviceId } from "@/lib/patient-device-id"

export default function PrescriptionsPage() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demoNotice, setDemoNotice] = useState<string | null>(null)
  const [result, setResult] = useState<PrescriptionAnalysis | null>(null)

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }
  }, [])

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || file.size === 0) return
      revokePreviewUrl()
      setError(null)
      setDemoNotice(null)
      setResult(null)
      const url = URL.createObjectURL(file)
      previewUrlRef.current = url
      setPreviewUrl(url)
      setSelectedFile(file)
    },
    [revokePreviewUrl],
  )

  const handleClear = () => {
    revokePreviewUrl()
    setSelectedFile(null)
    setResult(null)
    setError(null)
    setDemoNotice(null)
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)
    setDemoNotice(null)
    setResult(null)

    const fd = new FormData()
    fd.append("image", selectedFile)
    const deviceId = getOrCreatePatientDeviceId()
    if (deviceId) fd.append("deviceId", deviceId)

    try {
      const res = await fetch("/api/patient/prescriptions/analyze", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo analizar la receta.")
        return
      }
      if (data.mock && typeof data.message === "string") {
        setDemoNotice(data.message)
      }
      if (data.analysis) {
        setResult(data.analysis as PrescriptionAnalysis)
        writeStoredPrescriptionContext(data.analysis as PrescriptionAnalysis)
      } else {
        setError("Respuesta inválida del servidor.")
      }
    } catch {
      setError("No se pudo contactar al servidor.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Subir Receta</h1>
        <p className="text-sm text-muted-foreground">
          Toma una foto con la cámara o elige una imagen de tu galería. Te mostramos un resumen claro de lo que parece
          indicar la receta.
        </p>
      </div>

      {demoNotice ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {demoNotice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!previewUrl ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />

          <Card className="border-dashed border-2 border-primary/30 bg-primary/5 shadow-none transition-colors hover:bg-primary/10">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="rounded-full bg-primary/10 p-4 text-primary">
                <Camera className="h-9 w-9" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Tomar foto</h3>
                <p className="mt-1 text-sm text-muted-foreground">Abre la cámara trasera del dispositivo</p>
              </div>
              <Button type="button" className="mt-1 w-full" onClick={() => cameraInputRef.current?.click()}>
                Usar cámara
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 border-border bg-muted/20 shadow-none transition-colors hover:bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="rounded-full bg-muted p-4 text-foreground">
                <ImagePlus className="h-9 w-9" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Subir imagen</h3>
                <p className="mt-1 text-sm text-muted-foreground">Elige un archivo JPG, PNG o WebP</p>
              </div>
              <Button type="button" variant="outline" className="mt-1 w-full" onClick={() => galleryInputRef.current?.click()}>
                Elegir de galería
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 shadow-md">
            <img src={previewUrl} alt="Vista previa de la receta" className="h-64 w-full object-cover object-center" />
            <div className="absolute right-2 top-2">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full shadow-lg"
                onClick={handleClear}
                disabled={isUploading}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-sm font-medium text-white">Imagen lista para analizar</p>
            </div>
          </div>

          {!result ? (
            <Button size="lg" className="h-14 w-full text-base" onClick={handleAnalyze} disabled={isUploading} type="button">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analizando receta con IA...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-5 w-5" />
                  Leer receta
                </>
              )}
            </Button>
          ) : (
            <Card className="animate-in fade-in slide-in-from-bottom-4 border-green-200 bg-green-50 shadow-sm duration-500 dark:border-green-900/50 dark:bg-green-900/10">
              <CardHeader className="border-b border-green-200 pb-3 dark:border-green-900/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <CardTitle className="text-lg text-green-900 dark:text-green-100">Receta analizada</CardTitle>
                </div>
                {result.summary ? (
                  <CardDescription className="text-green-800/90 dark:text-green-200/90">{result.summary}</CardDescription>
                ) : (
                  <CardDescription className="text-green-800/90 dark:text-green-200/90">
                    No se generó un resumen automático. Revisa los medicamentos detectados abajo.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {result.medications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No se detectaron medicamentos en la imagen. Intenta otra foto con mejor luz y encuadre.
                  </p>
                ) : (
                  result.medications.map((med, i) => (
                    <div
                      key={`${med.name}-${i}`}
                      className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-background"
                    >
                      <h4 className="text-base font-semibold text-foreground">{med.name}</h4>
                      {med.instructions ? (
                        <p className="mt-1 text-sm text-muted-foreground">{med.instructions}</p>
                      ) : null}
                      {med.warning ? (
                        <div className="mt-3 inline-block rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/40 dark:text-amber-200">
                          {med.warning}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600">
                  <Link href="/patient/chat">Preguntar al asistente sobre esta receta</Link>
                </Button>
                <Button variant="outline" className="w-full" type="button" onClick={handleClear}>
                  Analizar otra foto
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
