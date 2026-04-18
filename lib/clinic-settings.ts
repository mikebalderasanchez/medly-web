export const CLINIC_SETTINGS_STORAGE_KEY = "medly:clinic-settings"

export type ThemePreference = "light" | "dark" | "system"

export type ClinicSettings = {
  theme: ThemePreference
  displayName: string
  specialty: string
  clinicName: string
  email: string
  notifyConsultations: boolean
  notifyFollowups: boolean
  language: "es" | "en"
}

export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  theme: "system",
  displayName: "Dr. Usuario",
  specialty: "Medicina General",
  clinicName: "Consultorio Medly",
  email: "contacto@ejemplo.com",
  notifyConsultations: true,
  notifyFollowups: true,
  language: "es",
}

function mergeSettings(partial: Partial<ClinicSettings>): ClinicSettings {
  return { ...DEFAULT_CLINIC_SETTINGS, ...partial }
}

export function readClinicSettings(): ClinicSettings {
  if (typeof window === "undefined") return DEFAULT_CLINIC_SETTINGS
  try {
    const raw = window.localStorage.getItem(CLINIC_SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_CLINIC_SETTINGS
    const data = JSON.parse(raw) as Partial<ClinicSettings>
    if (!data || typeof data !== "object") return DEFAULT_CLINIC_SETTINGS
    return mergeSettings(data)
  } catch {
    return DEFAULT_CLINIC_SETTINGS
  }
}

export function writeClinicSettings(overlay: Partial<ClinicSettings>): ClinicSettings {
  const merged = mergeSettings({ ...readClinicSettings(), ...overlay })
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CLINIC_SETTINGS_STORAGE_KEY, JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent("medly:clinic-settings-updated"))
  }
  return merged
}

export function resetClinicSettings(): ClinicSettings {
  const merged = mergeSettings(DEFAULT_CLINIC_SETTINGS)
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CLINIC_SETTINGS_STORAGE_KEY, JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent("medly:clinic-settings-updated"))
  }
  return merged
}

function prefersDark(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
}

export function applyThemePreference(theme: ThemePreference): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const dark = theme === "dark" || (theme === "system" && prefersDark())
  root.classList.toggle("dark", dark)
}

export function subscribeSystemTheme(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const handler = () => callback()
  mq.addEventListener("change", handler)
  return () => mq.removeEventListener("change", handler)
}
