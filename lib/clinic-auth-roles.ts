export const CLINIC_ROLES = {
  HOSPITAL_ADMIN: "hospital_admin",
  DOCTOR: "doctor",
} as const

export type ClinicRole = (typeof CLINIC_ROLES)[keyof typeof CLINIC_ROLES]

export function isClinicRole(value: unknown): value is ClinicRole {
  return value === CLINIC_ROLES.HOSPITAL_ADMIN || value === CLINIC_ROLES.DOCTOR
}

export function isHospitalAdminRole(role: string | undefined | null): boolean {
  return role === CLINIC_ROLES.HOSPITAL_ADMIN
}
