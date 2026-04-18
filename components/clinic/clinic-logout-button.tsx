"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { LogOut } from "lucide-react"

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function ClinicLogoutMenuItem() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const logout = async () => {
    setLoading(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/signin")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        type="button"
        tooltip="Cerrar sesión"
        className="rounded-2xl transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:scale-[0.98]"
        onClick={logout}
        disabled={loading}
      >
        <LogOut className="opacity-70" />
        <span className="group-data-[collapsible=icon]:hidden">
          {loading ? "Saliendo…" : "Cerrar sesión"}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
