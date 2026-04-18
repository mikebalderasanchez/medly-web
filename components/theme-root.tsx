"use client"

import { useEffect } from "react"
import {
  applyThemePreference,
  CLINIC_SETTINGS_STORAGE_KEY,
  readClinicSettings,
  subscribeSystemTheme,
} from "@/lib/clinic-settings"

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const sync = () => {
      const { theme } = readClinicSettings()
      applyThemePreference(theme)
    }

    sync()
    const off = subscribeSystemTheme(sync)

    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === CLINIC_SETTINGS_STORAGE_KEY) sync()
    }
    window.addEventListener("storage", onStorage)
    window.addEventListener("medly:clinic-settings-updated", sync)

    return () => {
      off()
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("medly:clinic-settings-updated", sync)
    }
  }, [])

  return children
}
