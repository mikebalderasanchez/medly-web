export type MockPatientRecord = {
  id: string
  name: string
  age: number
  gender: string
  bloodType: string
  allergies: string
  chronicConditions: string
}

export function getMockPatientById(id: string): MockPatientRecord {
  return {
    id,
    name: "Juan Pérez",
    age: 45,
    gender: "Masculino",
    bloodType: "O+",
    allergies: "Penicilina",
    chronicConditions: "Hipertensión",
  }
}
