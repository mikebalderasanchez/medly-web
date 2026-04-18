import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Users, FileText, TrendingUp, Clock } from "lucide-react"

export default function StatsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-muted-foreground">Análisis global de atenciones y tendencias de salud.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consultas (Mes)</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground">+12% vs mes anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">84</div>
            <p className="text-xs text-muted-foreground">+5% vs mes anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Ahorrado (IA)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42 hrs</div>
            <p className="text-xs text-muted-foreground">Estimado este mes en documentación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Preventivas</CardTitle>
            <Activity className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">3</div>
            <p className="text-xs text-muted-foreground">Interacciones de medicamentos detectadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Motivos de Consulta Frecuentes</CardTitle>
            <CardDescription>Top diagnósticos de la semana.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-full flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Infecciones respiratorias</span>
                    <span className="text-sm font-medium text-muted-foreground">35%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "35%" }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Hipertensión arterial</span>
                    <span className="text-sm font-medium text-muted-foreground">22%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full opacity-80" style={{ width: "22%" }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Gastroenteritis</span>
                    <span className="text-sm font-medium text-muted-foreground">15%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full opacity-60" style={{ width: "15%" }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Cefaleas y Migrañas</span>
                    <span className="text-sm font-medium text-muted-foreground">12%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full opacity-40" style={{ width: "12%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Rendimiento IA</CardTitle>
            <CardDescription>Métricas del motor de transcripción y resumen.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center gap-6 py-6">
            <div className="flex items-center justify-around text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">98.5%</div>
                <div className="text-xs text-muted-foreground">Precisión Transcripción</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">2.4s</div>
                <div className="text-xs text-muted-foreground">Tiempo Promedio RAG</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">100%</div>
                <div className="text-xs text-muted-foreground">Aprobación de Notas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
