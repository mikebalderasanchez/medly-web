"use client"

import * as React from "react"
import { Users, Stethoscope, BarChart, Settings, Home, Building2, UserCog } from "lucide-react"

import { MedlyLogoMark } from "@/components/brand/MedlyLogoMark"
import { ClinicLogoutMenuItem } from "@/components/clinic/clinic-logout-button"
import { CLINIC_ROLES } from "@/lib/clinic-auth-roles"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const adminNav = [
  { title: "Panel hospital", url: "/hospital", icon: Building2 },
  { title: "Equipo médico", url: "/hospital/equipo", icon: UserCog },
] as const

const mainNav = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Pacientes", url: "/patients", icon: Users },
  { title: "Consultas", url: "/consultations", icon: Stethoscope },
  { title: "Estadísticas", url: "/stats", icon: BarChart },
] as const

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [role, setRole] = React.useState<string | null | undefined>(undefined)

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/auth/session")
      .then((r) => r.json() as Promise<{ user?: { role?: string } | null }>)
      .then((d) => {
        if (cancelled) return
        setRole(typeof d.user?.role === "string" ? d.user.role : null)
      })
      .catch(() => {
        if (!cancelled) setRole(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isAdmin = role === CLINIC_ROLES.HOSPITAL_ADMIN

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="pt-6 pb-2 px-6 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex aspect-square size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-md shadow-primary/20 group-data-[collapsible=icon]:size-8">
            <MedlyLogoMark decorative className="size-full" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold tracking-tight text-xl text-foreground">Medly</span>
            <span className="text-xs font-medium text-primary">Plataforma hospitalaria</span>
            {role ? (
              <span className="text-[10px] font-medium text-muted-foreground">
                {isAdmin ? "Administración" : "Médico"}
              </span>
            ) : null}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 mt-4 gap-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:mt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-wider text-primary/70 group-data-[collapsible=icon]:hidden">
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2 group-data-[collapsible=icon]:mt-0">
            <SidebarMenu className="gap-1">
              {isAdmin
                ? adminNav.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        size="lg"
                        tooltip={item.title}
                        className="rounded-2xl transition-all duration-200 hover:bg-primary/5 hover:text-primary active:scale-[0.98] data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold"
                        render={<a href={item.url} />}
                      >
                        <item.icon className="opacity-70 group-data-[active=true]/menu-button:opacity-100" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                : null}
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={item.title}
                    className="rounded-2xl transition-all duration-200 hover:bg-primary/5 hover:text-primary active:scale-[0.98] data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold"
                    render={<a href={item.url} />}
                  >
                    <item.icon className="opacity-70 group-data-[active=true]/menu-button:opacity-100" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto mb-4">
          <SidebarGroupContent>
            <div className="rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 p-5 mb-4 border border-primary/10 relative overflow-hidden group-data-[collapsible=icon]:hidden">
              <div className="absolute -right-4 -top-4 size-24 rounded-full bg-primary/10 blur-2xl" />
              <h4 className="font-semibold text-foreground relative z-10">¿Necesitas ayuda?</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-3 relative z-10">Contacta con el soporte técnico de Medly.</p>
              <button className="w-full rounded-full bg-white border border-border/80 px-3 py-2 text-xs font-medium shadow-sm hover:border-primary/30 hover:text-primary transition-colors relative z-10">
                Soporte
              </button>
            </div>
            <SidebarMenu>
              <ClinicLogoutMenuItem />
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Configuración"
                  className="rounded-2xl transition-all duration-200 hover:bg-primary/5 hover:text-primary active:scale-[0.98]"
                  render={<a href="/settings" />}
                >
                  <Settings className="opacity-70" />
                  <span className="group-data-[collapsible=icon]:hidden">Configuración</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
