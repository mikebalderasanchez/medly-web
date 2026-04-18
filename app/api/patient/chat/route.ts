import { NextResponse } from "next/server"
import type { PrescriptionAnalysis } from "@/lib/prescription-extraction"
import type { PatientExpedienteRecord } from "@/lib/patient-expediente"
import {
  formatExpedienteForPrompt,
  formatRecentConsultationsForPrompt,
  hasPatientChatContext,
  parseExpedienteRecord,
  parsePrescriptionRecord,
} from "@/lib/patient-chat-context"
import { getPatientSessionByDeviceId } from "@/lib/patient-atlas-session"
import { listConsultationsForPatient } from "@/lib/clinic-repository"
import {
  assistantReplyFromPlainText,
  buildPatientAssistantJsonPrompt,
  parseAssistantStructuredReply,
  type AssistantStructuredReply,
} from "@/lib/patient-assistant-blocks"

export const runtime = "nodejs"

type ChatMessage = { role: "user" | "assistant"; content: string }

const BLOCKED_REPLY: AssistantStructuredReply = {
  blocks: [
    {
      type: "callout",
      variant: "warning",
      title: "Activa tu expediente o una receta",
      text: "Para protegerte, el asistente solo responde cuando hay **contexto clínico** cargado: tu expediente en esta sesión o una receta analizada desde la pestaña Recetas.",
    },
    {
      type: "bullet_list",
      items: [
        "Si recibiste un **correo del consultorio**, abre **Vincular acceso** y pega el código para cargar tu expediente.",
        "O abre **Inicio** (expediente de ejemplo en este navegador) o **Recetas** para analizar una foto de receta.",
      ],
    },
    { type: "paragraph", text: "Cuando veas el chip de contexto arriba del chat, podrás escribir tu pregunta con seguridad." },
  ],
}

function buildSystemInstruction(
  prescription: PrescriptionAnalysis | null,
  expediente: PatientExpedienteRecord | null,
  consultationsContext: string
): string {
  const base = `
Eres el asistente virtual de Medly para pacientes. Responde en español, con tono claro y empático.
No sustituyes al médico: explica de forma educativa y recuerda seguir la indicación del profesional.
Si hay emergencia o síntomas graves, indica acudir a urgencias o llamar a servicios de emergencia.
No inventes dosis ni diagnósticos: si falta información, dilo y sugiere consultar al médico o farmacéutico.

${buildPatientAssistantJsonPrompt()}
`.trim()

  const chunks: string[] = [base]

  if (expediente) {
    chunks.push(`\nContexto de expediente del paciente (puede estar incompleto):\n${formatExpedienteForPrompt(expediente)}`)
  }

  if (prescription && (prescription.summary?.trim() || prescription.medications.length)) {
    const meds = prescription.medications
      .map(
        (m) =>
          `- ${m.name}${m.instructions ? ` · ${m.instructions}` : ""}${m.warning ? ` · Precaución: ${m.warning}` : ""}`
      )
      .join("\n")
    const rxLines = [
      prescription.summary ? `Resumen de la última receta analizada: ${prescription.summary}` : null,
      meds ? `Medicamentos en la receta:\n${meds}` : null,
    ]
      .filter(Boolean)
      .join("\n\n")
    chunks.push(`\nContexto de receta del usuario (no contradigas al médico):\n${rxLines}`)
  }

  if (consultationsContext.trim()) {
    chunks.push(`\n${consultationsContext.trim()}`)
  }

  return chunks.join("\n").trim()
}

function trimForGemini(messages: ChatMessage[]): { role: string; parts: { text: string }[] }[] {
  let i = 0
  while (i < messages.length && messages[i].role === "assistant") i++
  const slice = messages.slice(i)

  const out: { role: string; parts: { text: string }[] }[] = []
  let expect: "user" | "assistant" = "user"

  for (const m of slice) {
    if (!m.content?.trim()) continue
    if (m.role !== expect) continue
    out.push({
      role: expect === "user" ? "user" : "model",
      parts: [{ text: m.content.trim().slice(0, 8000) }],
    })
    expect = expect === "user" ? "assistant" : "user"
  }

  return out
}

async function replyWithGeminiStructured(
  contents: { role: string; parts: { text: string }[] }[],
  systemInstruction: string,
  apiKey: string
): Promise<AssistantStructuredReply> {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(apiKey)

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: { temperature: 0.55, responseMimeType: "application/json" },
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

  try {
    return parseAssistantStructuredReply(text)
  } catch {
    return assistantReplyFromPlainText(text)
  }
}

function demoStructuredReply(lastUser: string): AssistantStructuredReply {
  const q = lastUser.toLowerCase()
  if (q.includes("duele") || q.includes("dolor")) {
    return {
      blocks: [
        { type: "heading", text: "Dolor y autotratamiento", level: 2 },
        {
          type: "paragraph",
          text: "En **modo demo** no puedo valorar tu caso con precisión. Usa esto como orientación general y confirma siempre con tu médico.",
        },
        {
          type: "callout",
          variant: "danger",
          title: "Busca urgencias si…",
          text: "Dolor intenso o súbito, fiebre alta, confusión, dificultad para respirar, debilidad en brazo/pierna, o síntomas neurológicos nuevos.",
        },
        {
          type: "bullet_list",
          items: [
            "No aumentes la dosis por tu cuenta.",
            "Si ya tienes medicación prescrita, revisa la posología en tu receta/expediente.",
          ],
        },
      ],
    }
  }

  return {
    blocks: [
      { type: "heading", text: "Modo demo activo", level: 2 },
      {
        type: "paragraph",
        text: "Estoy respondiendo con un **formato enriquecido** de ejemplo porque no hay `GEMINI_API_KEY` en el servidor.",
      },
      {
        type: "key_value",
        label: "Qué puedes hacer ahora",
        value: "Configura la clave y vuelve a preguntar",
      },
      {
        type: "callout",
        variant: "info",
        title: "Importante",
        text: "Sigue las indicaciones de tu médico o farmacéutico. No cambies horarios ni dosis sin supervisión profesional.",
      },
    ],
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      messages?: ChatMessage[]
      prescriptionContext?: unknown
      expedienteContext?: unknown
      deviceId?: string
    }

    const rawMessages = Array.isArray(body.messages) ? body.messages : []
    const messages = rawMessages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-24) as ChatMessage[]

    if (!messages.length) {
      return NextResponse.json({ error: "Falta el historial de mensajes." }, { status: 400 })
    }

    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : ""

    let prescriptionContext = parsePrescriptionRecord(body.prescriptionContext)
    let expedienteContext = parseExpedienteRecord(body.expedienteContext)

    let consultationsContext = ""
    if (deviceId) {
      const stored = await getPatientSessionByDeviceId(deviceId)
      if (stored) {
        if (!prescriptionContext) {
          prescriptionContext = stored.prescriptionAnalysis ?? stored.clinicPrescriptionDraft ?? null
        }
        if (!expedienteContext && stored.expediente) {
          expedienteContext = stored.expediente
        }
        const pid = stored.clinicPatientId?.trim()
        if (pid) {
          const visits = await listConsultationsForPatient(pid)
          consultationsContext = formatRecentConsultationsForPrompt(visits, 6)
        }
      }
    }

    const contents = trimForGemini(messages)
    if (!contents.length) {
      return NextResponse.json(
        { error: "No hay mensajes del usuario para responder (revisa el historial)." },
        { status: 400 }
      )
    }
    if (contents[contents.length - 1].role !== "user") {
      return NextResponse.json(
        { error: "El último mensaje visible para el modelo debe ser del usuario." },
        { status: 400 }
      )
    }

    const hasContext = hasPatientChatContext(prescriptionContext, expedienteContext)
    if (!hasContext) {
      return NextResponse.json({
        success: true,
        blocked: true,
        blocks: BLOCKED_REPLY.blocks,
      })
    }

    const systemInstruction = buildSystemInstruction(prescriptionContext, expedienteContext, consultationsContext)
    const geminiKey = process.env.GEMINI_API_KEY
    const lastUser = messages.filter((m) => m.role === "user").pop()?.content ?? ""

    if (!geminiKey) {
      await new Promise((r) => setTimeout(r, 600))
      return NextResponse.json({
        success: true,
        mock: true,
        blocks: demoStructuredReply(lastUser).blocks,
        message:
          "Modo demo: configura GEMINI_API_KEY en el servidor para respuestas generadas por IA enriquecidas.",
      })
    }

    const structured = await replyWithGeminiStructured(contents, systemInstruction, geminiKey)

    return NextResponse.json({
      success: true,
      mock: false,
      blocks: structured.blocks,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al generar la respuesta."
    console.error("[patient/chat]", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
