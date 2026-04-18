import { NextResponse } from "next/server"
import {
  buildGeminiExtractionPrompt,
  mergeExtractionWithKnownPatient,
  parseConsultationExtraction,
  type ConsultationExtraction,
} from "@/lib/consultation-extraction"
import { getClinicPatientForExtractionMerge } from "@/lib/clinic-repository"
import { getMockPatientById } from "@/lib/mock-patients"

export const runtime = "nodejs"

const MOCK_TRANSCRIPTION =
  "Doctor: Hola Juan, cuéntame, ¿cómo te has sentido con los dolores de cabeza?\n\nPaciente: Hola doctor, pues fíjese que me han disminuido un poco, pero todavía tengo puntadas fuertes en las tardes, sobre todo cuando paso mucho tiempo en la computadora.\n\nDoctor: Entiendo. ¿Te has estado tomando el Ibuprofeno como te indiqué?\n\nPaciente: Sí, me lo tomo cuando me duele, pero a veces no se me quita tan rápido.\n\nDoctor: Vamos a ajustar la dosis. Te voy a recetar 400mg cada 8 horas, y es muy importante que aumentes tu ingesta de agua. Trata de descansar la vista 5 minutos por cada hora de pantalla. Si en 15 días sigues igual, regresas."

const MOCK_STRUCTURED: ConsultationExtraction = {
  patient: {
    name: "Juan",
    age: "45",
    height_cm: null,
    weight_kg: null,
    gender: "male",
    bloodType: null,
    knownAllergies: null,
  },
  additionalMedications: ["Ibuprofeno según uso"],
  describedSymptoms: ["Cefalea vespertina", "Dolor asociado a pantalla"],
  knownIllnesses: null,
  currentEmergency: null,
}

async function transcribeElevenLabs(audio: File, apiKey: string): Promise<string> {
  const form = new FormData()
  form.append("file", audio, audio.name || "consulta.webm")
  form.append("model_id", "scribe_v2")
  form.append("diarize", "true")
  form.append("tag_audio_events", "true")

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ElevenLabs STT failed (${res.status}): ${errText.slice(0, 500)}`)
  }

  const data = (await res.json()) as { text?: string }
  if (typeof data.text !== "string" || !data.text.trim()) {
    throw new Error("ElevenLabs response missing text")
  }
  return data.text
}

async function extractWithGemini(transcript: string, apiKey: string): Promise<ConsultationExtraction> {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(apiKey)

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildGeminiExtractionPrompt(transcript) }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini failed (${res.status}): ${errText.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
    error?: { message?: string }
  }

  if (data.error?.message) {
    throw new Error(data.error.message)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini response missing text")
  }

  return parseConsultationExtraction(text)
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Se esperaba multipart/form-data con el campo audio." },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const audio = formData.get("audio")
    const patientIdRaw = formData.get("patientId")

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json(
        { error: "Falta el archivo de audio (campo audio)." },
        { status: 400 }
      )
    }

    const patientId =
      typeof patientIdRaw === "string" && patientIdRaw.trim() ? patientIdRaw.trim() : null

    const elevenKey = process.env.ELEVENLABS_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY

    if (!elevenKey || !geminiKey) {
      let structured = MOCK_STRUCTURED
      if (patientId) {
        const fromDb = await getClinicPatientForExtractionMerge(patientId)
        const known = fromDb ?? getMockPatientById(patientId)
        structured = mergeExtractionWithKnownPatient(structured, known)
      }
      await new Promise((r) => setTimeout(r, 800))
      return NextResponse.json({
        success: true,
        mock: true,
        transcription: MOCK_TRANSCRIPTION,
        structured,
        patientId,
        message:
          "Modo demo: configura ELEVENLABS_API_KEY y GEMINI_API_KEY en el servidor para procesamiento real.",
      })
    }

    const transcript = await transcribeElevenLabs(audio, elevenKey)
    let structured = await extractWithGemini(transcript, geminiKey)

    if (patientId) {
      const fromDb = await getClinicPatientForExtractionMerge(patientId)
      const known = fromDb ?? getMockPatientById(patientId)
      structured = mergeExtractionWithKnownPatient(structured, known)
    }

    return NextResponse.json({
      success: true,
      mock: false,
      transcription: transcript,
      structured,
      patientId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar la consulta."
    console.error("[consultations/process]", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
