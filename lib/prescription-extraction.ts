export type PrescriptionMedication = {
  name: string
  instructions: string | null
  warning: string | null
}

export type PrescriptionAnalysis = {
  medications: PrescriptionMedication[]
  summary: string | null
}

export function buildPrescriptionVisionPrompt(): string {
  return `
Eres un asistente que lee imágenes de recetas médicas (manuscritas o impresas) y extrae la información útil para el paciente.

Reglas:
- Responde SOLO con JSON válido. Sin markdown ni texto fuera del JSON.
- Usa null cuando un dato no aparezca o sea ilegible.
- Los textos (name, instructions, warning, summary) deben estar en el mismo idioma que la receta (si es español, en español).
- "name" debe incluir principio activo y dosis si constan (ej. "Amoxicilina 500 mg").
- "instructions": posología y duración si aparecen.
- "warning": interacciones, alergias mencionadas en la receta, ayunas, restricciones, o null.
- "summary": una o dos frases sobre el propósito general si se deduce del texto de la receta; si no, null.
- Si la imagen no es una receta o no hay texto legible, devuelve medications: [] y summary breve explicando que no se pudo leer.

Formato exacto:
{
  "medications": [
    { "name": string, "instructions": string | null, "warning": string | null }
  ],
  "summary": string | null
}
`.trim()
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

export function parsePrescriptionAnalysis(raw: string): PrescriptionAnalysis {
  const data = JSON.parse(stripJsonFences(raw)) as PrescriptionAnalysis
  if (!data || typeof data !== "object") {
    throw new Error("Respuesta de receta inválida")
  }
  if (!Array.isArray(data.medications)) {
    throw new Error("Respuesta de receta sin lista de medicamentos")
  }
  const medications = data.medications
    .filter((m) => m && typeof m === "object" && typeof (m as PrescriptionMedication).name === "string")
    .map((m) => {
      const med = m as PrescriptionMedication
      const instructions = med.instructions
      const warning = med.warning
      return {
        name: String(med.name).trim(),
        instructions: typeof instructions === "string" ? instructions.trim() || null : null,
        warning: typeof warning === "string" ? warning.trim() || null : null,
      }
    })
    .filter((m) => m.name.length > 0)

  const summary =
    typeof data.summary === "string" && data.summary.trim() ? data.summary.trim() : null

  return { medications, summary }
}
