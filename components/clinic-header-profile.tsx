"use client"

import { useCallback, useEffect, useState } from "react"

import { readClinicSettings } from "@/lib/clinic-settings"

type MeUser = {
  email: string
  displayName: string | null
  specialty: string | null
}

export function ClinicHeaderProfile() {
  const [name, setName] = useState("Dr. Usuario")
  const [specialty, setSpecialty] = useState("Medicina General")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me")
      if (!res.ok) throw new Error("no-me")
      const data = (await res.json()) as { user?: MeUser | null }
      const u = data.user
      if (u) {
        const display = u.displayName?.trim()
        const local = readClinicSettings()
        setName(display || u.email.split("@")[0] || "Usuario")
        setSpecialty(u.specialty?.trim() || local.specialty || "Medicina General")
        return
      }
    } catch {
    }
    const s = readClinicSettings()
    setName(s.displayName || "Dr. Usuario")
    setSpecialty(s.specialty || "Medicina General")
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    const onLocal = () => {
      window.setTimeout(() => void load(), 0)
    }
    window.addEventListener("medly:clinic-settings-updated", onLocal)
    window.addEventListener("medly:auth-profile-updated", onLocal)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("medly:clinic-settings-updated", onLocal)
      window.removeEventListener("medly:auth-profile-updated", onLocal)
    }
  }, [load])

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "DR"

  return (
    <>
      <div className="hidden flex-col items-end leading-none md:flex">
        <span className="text-sm font-bold text-foreground">{name}</span>
        <span className="mt-1 text-xs font-medium text-muted-foreground">{specialty}</span>
      </div>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary shadow-sm"
        title={name}
      >
        {initials}
      </div>
    </>
  )
}
