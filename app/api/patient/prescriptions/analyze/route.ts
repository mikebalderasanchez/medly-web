import { NextResponse } from "next/server"
import {
  buildPrescriptionVisionPrompt,
  parsePrescriptionAnalysis,
  type PrescriptionAnalysis,
} from "@/lib/prescription-extraction"
import { upsertPatientSession } from "@/lib/patient-atlas-session"

export const runtime = "nodejs"

const MAX_BYTES = 12 * 1024 * 1024
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])

const MOCK_ANALYSIS: PrescriptionAnalysis = {
  summary: "Infección de garganta leve. Antibiótico y analgésico según la receta.",
  medications: [
    {
      name: "Amoxicilina 500 mg",
      instructions: "1 cápsula cada 8 horas por 7 días",
      warning: "Tomar con alimentos",
    },
    {
      name: "Paracetamol 500 mg",
      instructions: "1 tableta cada 8 horas en caso de dolor o fiebre",
      warning: "No exceder la dosis indicada por tu médico",
    },
  ],
}

async function analyzeWithGemini(
  mimeType: string,
  base64: string,
  apiKey: string
): Promise<PrescriptionAnalysis> {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(apiKey)

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: buildPrescriptionVisionPrompt() },
          ],
        },
      ],
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

  return parsePrescriptionAnalysis(text)
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Se esperaba multipart/form-data con el campo image." },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const image = formData.get("image")
    const deviceIdRaw = formData.get("deviceId")
    const deviceId = typeof deviceIdRaw === "string" ? deviceIdRaw.trim() : ""

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "Falta la imagen (campo image)." }, { status: 400 })
    }

    if (image.size > MAX_BYTES) {
      return NextResponse.json({ error: "La imagen es demasiado grande (máx. 12 MB)." }, { status: 400 })
    }

    const mime = (image.type || "image/jpeg").toLowerCase()
    if (mime && !ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa JPEG, PNG o WebP." },
        { status: 400 }
      )
    }

    const geminiKey = process.env.GEMINI_API_KEY

    if (!geminiKey) {
      await new Promise((r) => setTimeout(r, 900))
      if (deviceId) {
        try {
          await upsertPatientSession(deviceId, { prescriptionAnalysis: MOCK_ANALYSIS })
        } catch (e) {
          console.warn("[patient/prescriptions/analyze] Atlas upsert (mock):", e)
        }
      }
      return NextResponse.json({
        success: true,
        mock: true,
        analysis: MOCK_ANALYSIS,
        message:
          "Modo demo: configura GEMINI_API_KEY en el servidor para leer recetas reales con visión.",
      })
    }

    const buf = Buffer.from(await image.arrayBuffer())
    const base64 = buf.toString("base64")
    const mimeType = ALLOWED.has(mime) ? mime : "image/jpeg"

    const analysis = await analyzeWithGemini(mimeType, base64, geminiKey)

    if (deviceId) {
      try {
        await upsertPatientSession(deviceId, { prescriptionAnalysis: analysis })
      } catch (e) {
        console.warn("[patient/prescriptions/analyze] Atlas upsert:", e)
      }
    }

    return NextResponse.json({
      success: true,
      mock: false,
      analysis,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al analizar la receta."
    console.error("[patient/prescriptions/analyze]", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
