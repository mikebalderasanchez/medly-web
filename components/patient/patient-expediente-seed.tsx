"use client"

import type { ReactNode } from "react"
import {
  DEMO_PATIENT_EXPEDIENTE,
  PATIENT_EXPEDIENTE_STORAGE_KEY,
  writeStoredExpedienteContext,
} from "@/lib/patient-expediente"

export function PatientExpedienteSeed({ children }: { children: ReactNode }) {
  if (typeof window !== "undefined") {
    try {
      if (!window.sessionStorage.getItem(PATIENT_EXPEDIENTE_STORAGE_KEY)) {
        writeStoredExpedienteContext(DEMO_PATIENT_EXPEDIENTE)
      }
    } catch {
    }
  }
  return children
}
