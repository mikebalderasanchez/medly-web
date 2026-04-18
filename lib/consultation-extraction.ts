export type ConsultationPatientGender = "male" | "female" | null

export type ConsultationPatient = {
  name: string | null
  age: string | null
  height_cm: number | null
  weight_kg: number | null
  gender: ConsultationPatientGender
  bloodType: string | null
  knownAllergies: string[] | null
}

export type ConsultationExtraction = {
  patient: ConsultationPatient
  additionalMedications: string[] | null
  describedSymptoms: string[] | null
  knownIllnesses: string[] | null
  currentEmergency: string | null
}

export function buildGeminiExtractionPrompt(transcript: string): string {
  return `
    You are a medical assistant that summarizes spoken conversations from patients to doctors and from paramedics to doctors.


    Return ONLY valid JSON. No explanations.
    Use null for missing fields.
    Return all values in the same language as the transcript.

    Consider age estimates are common in these situations, for those cases display the age as XX - XX",
    For blood type use this format: letter(s)-symbol",
    For currentEmergency describe the emergency situation the patient is suffering, leave this null if its not an emergency and just an illness or symptom consultation"


    {
      "patient": {
        "name": string | null,
        "age": string | null,
        "height_cm": number | null,
        "weight_kg": number | null,
        "gender": "male" | "female" | null,
        "bloodType": string | null,
        "knownAllergies": string[] | null
      },
      "additionalMedications": string[] | null,
      "describedSymptoms": string[] | null,
      "knownIllnesses": string[] | null,
      "currentEmergency": string | null
    }


    Transcript:
    ${transcript}
        `.trim()
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of items) {
    const t = s.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function mergeStringLists(
  a: string[] | null | undefined,
  b: string[] | null | undefined
): string[] | null {
  const merged = dedupeStrings([...(a ?? []), ...(b ?? [])])
  return merged.length ? merged : null
}

function mockGenderToEnum(gender: string): ConsultationPatientGender {
  const g = gender.toLowerCase()
  if (g.includes("femen") || g === "f") return "female"
  if (g.includes("mascul") || g === "m") return "male"
  return null
}

export function mergeExtractionWithKnownPatient(
  extraction: ConsultationExtraction,
  known: {
    name: string
    age: number
    gender: string
    bloodType: string
    allergies: string
    chronicConditions: string
  } | null
): ConsultationExtraction {
  if (!known) return extraction

  const knownAllergiesList = known.allergies
    ? known.allergies.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : []

  const mergedAllergies = mergeStringLists(
    extraction.patient.knownAllergies,
    knownAllergiesList.length ? knownAllergiesList : null
  )

  const chronicList = known.chronicConditions
    ? [known.chronicConditions.trim()].filter(Boolean)
    : []

  return {
    ...extraction,
    patient: {
      name: known.name || extraction.patient.name,
      age: known.age != null ? String(known.age) : extraction.patient.age,
      height_cm: extraction.patient.height_cm,
      weight_kg: extraction.patient.weight_kg,
      gender: mockGenderToEnum(known.gender) ?? extraction.patient.gender,
      bloodType: known.bloodType || extraction.patient.bloodType,
      knownAllergies: mergedAllergies ?? extraction.patient.knownAllergies,
    },
    knownIllnesses: mergeStringLists(extraction.knownIllnesses, chronicList),
    additionalMedications: extraction.additionalMedications,
    describedSymptoms: extraction.describedSymptoms,
    currentEmergency: extraction.currentEmergency,
  }
}

function stripJsonFences(raw: string): string {
  const t = raw.trim()
  if (t.startsWith("```")) {
    return t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
  }
  return t
}

export function parseConsultationExtraction(raw: string): ConsultationExtraction {
  const data = JSON.parse(stripJsonFences(raw)) as ConsultationExtraction
  if (!data || typeof data !== "object" || !data.patient || typeof data.patient !== "object") {
    throw new Error("Invalid extraction shape")
  }
  return data
}
