"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Send, Bot, User, Square, Volume2, FileText, IdCard } from "lucide-react"
import type { PrescriptionAnalysis } from "@/lib/prescription-extraction"
import type { AssistantChatBlock } from "@/lib/patient-assistant-blocks"
import { clearStoredPrescriptionContext, readStoredPrescriptionContext } from "@/lib/patient-prescription-context"
import {
  clearStoredExpedienteContext,
  readStoredExpedienteContext,
  type PatientExpedienteRecord,
} from "@/lib/patient-expediente"
import { hasPatientChatContext } from "@/lib/patient-chat-context"
import { getOrCreatePatientDeviceId } from "@/lib/patient-device-id"
import { AssistantMessageContent } from "@/components/patient/assistant-message-content"

type Message =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; blocks: AssistantChatBlock[] }

function buildWelcomeBlocks(
  prescription: PrescriptionAnalysis | null,
  expediente: PatientExpedienteRecord | null
): AssistantChatBlock[] {
  if (prescription?.medications?.length) {
    const names = prescription.medications.map((m) => m.name).join(", ")
    return [
      { type: "heading", text: "Contexto de receta listo", level: 2 },
      {
        type: "paragraph",
        text: `Puedo orientarte sobre **${names}** usando la información de tu última foto analizada.`,
      },
      {
        type: "callout",
        variant: "info",
        title: "Antes de empezar",
        text: "Mis respuestas son educativas: confirma siempre dudas importantes con tu médico o farmacéutico.",
      },
    ]
  }

  if (expediente) {
    return [
      { type: "heading", text: `Hola, ${expediente.patientName}`, level: 2 },
      {
        type: "paragraph",
        text: "Tengo cargado tu **expediente demo** en esta sesión (alergias, antecedentes y medicación activa). Pregunta con el detalle que necesites.",
      },
      { type: "divider" },
      {
        type: "callout",
        variant: "info",
        title: "¿Quieres aún más precisión?",
        text: "Si subes una receta reciente en la pestaña Recetas, podré cruzar posología exacta con lo que ves en papel.",
      },
    ]
  }

  return [
    {
      type: "callout",
      variant: "warning",
      title: "Falta expediente o receta",
      text: "Para activar el asistente necesitas contexto: visita **Inicio** (expediente demo) o analiza una receta en **Recetas**.",
    },
    {
      type: "bullet_list",
      items: [
        "El expediente se guarda en esta sesión del navegador.",
        "La receta se usa cuando pulsas **Leer receta** tras subir la foto.",
      ],
    },
  ]
}

function readExpedienteRecord(): PatientExpedienteRecord | null {
  const s = readStoredExpedienteContext()
  if (!s) return null
  const { savedAt: _savedAt, ...rest } = s
  return rest
}

function readPrescriptionRecord(): PrescriptionAnalysis | null {
  const s = readStoredPrescriptionContext()
  if (!s) return null
  const { savedAt: _savedAt, ...rest } = s
  return rest
}

export default function PatientChat() {
  const [prescriptionContext, setPrescriptionContext] = useState<PrescriptionAnalysis | null>(null)
  const [expedienteContext, setExpedienteContext] = useState<PatientExpedienteRecord | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", blocks: buildWelcomeBlocks(null, null) },
  ])
  const [input, setInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [demoNotice, setDemoNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const hasContext = hasPatientChatContext(prescriptionContext, expedienteContext)

  useEffect(() => {
    const rx = readPrescriptionRecord()
    const ex = readExpedienteRecord()
    if (rx) setPrescriptionContext(rx)
    if (ex) setExpedienteContext(ex)
    setMessages([{ id: "welcome", role: "assistant", blocks: buildWelcomeBlocks(rx, ex) }])
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isProcessing])

  const callAssistant = async (nextMessages: Message[]) => {
    setIsProcessing(true)
    setError(null)
    setDemoNotice(null)

    try {
      const res = await fetch("/api/patient/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) =>
            m.role === "user" ? { role: "user", content: m.content } : { role: "assistant", content: summarizeBlocks(m) }
          ),
          prescriptionContext,
          expedienteContext,
          deviceId: getOrCreatePatientDeviceId() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo obtener respuesta.")
        return
      }
      if (data.mock && typeof data.message === "string") {
        setDemoNotice(data.message)
      }

      const blocks = Array.isArray(data.blocks) ? (data.blocks as AssistantChatBlock[]) : null
      if (!blocks?.length) {
        setError("Respuesta vacía del servidor.")
        return
      }

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", blocks }])
    } catch {
      setError("No se pudo contactar al servidor.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendText = async () => {
    if (!input.trim() || isProcessing || !hasContext) return

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput("")
    await callAssistant(next)
  }

  const handleMicToggle = () => {
    if (isProcessing) return
    if (isRecording) {
      setIsRecording(false)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          blocks: [
            {
              type: "callout",
              variant: "info",
              title: "Voz en web",
              text: "Todavía no transcribimos audio en el navegador. **Escribe** tu pregunta para obtener una respuesta estructurada.",
            },
          ],
        },
      ])
      return
    }
    setIsRecording(true)
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Asistente Medly</h1>
        <p className="text-sm text-muted-foreground">
          Respuestas enriquecidas (tarjetas, avisos y listas) basadas solo en tu expediente o receta cargados en esta sesión.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Contexto</span>
        {expedienteContext ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
            <IdCard className="h-3.5 w-3.5" aria-hidden />
            Expediente
          </span>
        ) : (
          <span className="text-[11px]">Sin expediente</span>
        )}
        {prescriptionContext?.medications?.length ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Receta
          </span>
        ) : (
          <span className="text-[11px]">Sin receta analizada</span>
        )}
        <div className="ml-auto flex flex-wrap gap-1">
          {prescriptionContext ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                clearStoredPrescriptionContext()
                setPrescriptionContext(null)
                setDemoNotice(null)
                setMessages([{ id: "welcome", role: "assistant", blocks: buildWelcomeBlocks(null, expedienteContext) }])
              }}
            >
              Quitar receta
            </Button>
          ) : null}
          {expedienteContext ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                clearStoredExpedienteContext()
                setExpedienteContext(null)
                setDemoNotice(null)
                setMessages([{ id: "welcome", role: "assistant", blocks: buildWelcomeBlocks(prescriptionContext, null) }])
              }}
            >
              Quitar expediente
            </Button>
          ) : null}
        </div>
      </div>

      {!hasContext ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-50">
          El envío está bloqueado hasta que exista al menos un **expediente** en sesión o una **receta** analizada.
        </p>
      ) : null}

      {demoNotice ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {demoNotice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <Card className="flex flex-1 flex-col overflow-hidden border-border/80 bg-card shadow-sm">
        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                }`}
              >
                {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>
              <div className={`flex min-w-0 max-w-[min(100%,36rem)] flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {msg.role === "user" ? (
                  <div className="rounded-2xl rounded-tr-sm bg-primary px-5 py-3 text-sm text-primary-foreground shadow-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="w-full rounded-2xl rounded-tl-sm border border-border/50 bg-muted/40 px-4 py-3 text-sm shadow-sm">
                    <AssistantMessageContent blocks={msg.blocks} />
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="h-6 gap-1 rounded-full px-2 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    disabled
                  >
                    <Volume2 className="h-3 w-3" aria-hidden />
                    Audio próximamente
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {isProcessing ? (
            <div className="flex animate-in gap-3 fade-in duration-300 flex-row">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border/50 bg-muted/50 px-5 py-4">
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/50 bg-card p-3">
          <div className="flex items-end gap-2 rounded-[2rem] border border-border/60 bg-muted/30 p-1.5 transition-all focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/30">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className={`h-10 w-10 shrink-0 rounded-full transition-colors ${
                isRecording ? "bg-red-100 text-red-600 hover:bg-red-200" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
              onClick={handleMicToggle}
              disabled={isProcessing}
            >
              {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
            </Button>

            <div className="flex-1 px-2 pb-1">
              {isRecording ? (
                <div className="flex h-10 items-center gap-2 text-sm font-medium text-red-600 animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-red-600" />
                  Grabando… (usa texto para preguntar)
                </div>
              ) : (
                <Input
                  placeholder={hasContext ? "Escribe tu duda aquí…" : "Primero carga expediente o receta…"}
                  className="h-10 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void handleSendText()
                    }
                  }}
                  disabled={isProcessing || !hasContext}
                />
              )}
            </div>

            <Button
              size="icon"
              type="button"
              className={`h-10 w-10 shrink-0 rounded-full shadow-md ${!input.trim() && !isRecording ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={() => void handleSendText()}
              disabled={(!input.trim() && !isRecording) || isProcessing || isRecording || !hasContext}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-muted-foreground">
              La IA puede equivocarse. No sustituye la opinión médica. En emergencia, acude a urgencias.
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

function summarizeBlocks(m: Extract<Message, { role: "assistant" }>): string {
  const parts: string[] = []
  for (const b of m.blocks) {
    if (b.type === "heading") parts.push(b.text)
    if (b.type === "paragraph") parts.push(b.text)
    if (b.type === "bullet_list") parts.push(b.items.join("; "))
    if (b.type === "key_value") parts.push(`${b.label}: ${b.value}`)
    if (b.type === "medication_hint") parts.push(`${b.name} — ${b.hint}`)
    if (b.type === "callout") parts.push(b.title ? `${b.title}. ${b.text}` : b.text)
  }
  const t = parts.join("\n").trim()
  return t || "(respuesta del asistente)"
}
