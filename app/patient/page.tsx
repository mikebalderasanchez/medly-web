import { Card, CardContent } from "@/components/ui/card"
import { BellRing, Camera, MessageCircle, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function PatientDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Hola, Juan</h1>
        <p className="text-sm text-muted-foreground">Aquí está el resumen de tu tratamiento activo.</p>
      </div>

      <Card className="bg-gradient-to-r from-primary to-[#0d4a8a] text-white border-0 shadow-lg shadow-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-3">
              <BellRing className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-lg">Próxima toma</p>
              <p className="text-primary-foreground/80 text-sm">Ibuprofeno 400mg - En 2 horas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/patient/prescriptions" className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Camera className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Subir Receta</h3>
            <p className="text-xs text-muted-foreground mt-1">Sube una foto para entender tu receta</p>
          </div>
        </Link>
        <Link href="/patient/chat" className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <MessageCircle className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Hablar con IA</h3>
            <p className="text-xs text-muted-foreground mt-1">Resuelve dudas sobre tus medicamentos</p>
          </div>
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Tus Medicamentos</h2>
        <div className="space-y-3">
          <Card className="shadow-none">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Ibuprofeno 400mg</h4>
                <p className="text-xs text-muted-foreground">1 tableta cada 8 horas</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-primary">Próxima: 14:00</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Omeprazol 20mg</h4>
                <p className="text-xs text-muted-foreground">En ayunas</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Tomada hoy</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
