import type { ConsultationExtraction } from "@/lib/consultation-extraction"

export type ClinicPatientDoc = {
  id: string
  name: string
  age: number
  gender: string
  bloodType: string
  allergies: string
  chronicConditions: string
  phone: string
  email: string
  notes: string
  status: string
  lastVisit: string
  createdAt: Date
  updatedAt: Date
}

export type ClinicPatientListRow = {
  id: string
  name: string
  age: number
  lastVisit: string
  status: string
}

export type ClinicConsultationPrescription = {
  diagnosis: string | null
  lines: Array<{
    drug: string
    dose: string
    route: string
    frequency: string
    duration: string
  }>
  generalNotes: string | null
  previewText: string
}

export type ClinicConsultationDoc = {
  id: string
  patientId: string | null
  patientName: string | null
  reason: string
  status: string
  transcription: string | null
  /** Notas clínicas adicionales (distintas de la transcripción en bruto). */
  notes: string | null
  structured: ConsultationExtraction | null
  prescription: ClinicConsultationPrescription | null
  /** Conformidad del paciente con registrar la información en expediente. */
  patientConsentAccepted: boolean | null
  /** Si no hay conformidad: motivo o limitación manifestada (texto del personal). */
  patientConsentManualReason: string | null
  /** Si no hay conformidad: registro manual complementario. */
  patientConsentManualDetail: string | null
  createdAt: Date
  updatedAt: Date
}

export type ClinicConsultationListRow = {
  id: string
  patientId: string | null
  patient: string
  date: string
  reason: string
  status: string
}
