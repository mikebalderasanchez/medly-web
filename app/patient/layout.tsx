import Link from "next/link"
import { Home, MessageCircle, FileText, Settings } from "lucide-react"

import { MedlyLogoMark } from "@/components/brand/MedlyLogoMark"
import { PatientExpedienteSeed } from "@/components/patient/patient-expediente-seed"
import { PatientAtlasBootstrap } from "@/components/patient/patient-atlas-bootstrap"

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <MedlyLogoMark decorative className="size-full" />
          </div>
          <span className="text-lg font-bold">Medly</span>
        </div>
        <Link
          href="/patient/settings"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="Ajustes"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </header>

      <PatientExpedienteSeed>
        <PatientAtlasBootstrap>
          <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 md:pb-4">
            {children}
          </main>
        </PatientAtlasBootstrap>
      </PatientExpedienteSeed>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background px-4 pb-safe md:hidden">
        <a href="/patient" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary">
          <Home className="h-6 w-6" />
          <span className="text-[10px] font-medium">Inicio</span>
        </a>
        <a href="/patient/prescriptions" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary">
          <FileText className="h-6 w-6" />
          <span className="text-[10px] font-medium">Recetas</span>
        </a>
        <a href="/patient/chat" className="flex flex-col items-center justify-center gap-1 text-primary">
          <MessageCircle className="h-6 w-6" />
          <span className="text-[10px] font-medium">Asistente</span>
        </a>
      </nav>
    </div>
  )
}
