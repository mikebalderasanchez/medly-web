export type AssistantCalloutVariant = "info" | "warning" | "danger"

export type AssistantChatBlock =
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "bullet_list"; items: string[] }
  | { type: "key_value"; label: string; value: string }
  | { type: "medication_hint"; name: string; hint: string; caution?: string | null }
  | { type: "callout"; variant: AssistantCalloutVariant; title?: string | null; text: string }
  | { type: "divider" }

export type AssistantStructuredReply = {
  blocks: AssistantChatBlock[]
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

function isCalloutVariant(v: unknown): v is AssistantCalloutVariant {
  return v === "info" || v === "warning" || v === "danger"
}

function normalizeBlock(raw: unknown): AssistantChatBlock | null {
  if (!raw || typeof raw !== "object") return null
  const b = raw as { type?: string }
  const type = typeof b.type === "string" ? b.type : ""

  if (type === "heading") {
    const text = typeof (b as { text?: string }).text === "string" ? (b as { text: string }).text.trim() : ""
    if (!text) return null
    const level = (b as { level?: number }).level
    return { type: "heading", text, level: level === 3 ? 3 : 2 }
  }

  if (type === "paragraph") {
    const text = typeof (b as { text?: string }).text === "string" ? (b as { text: string }).text.trim() : ""
    if (!text) return null
    return { type: "paragraph", text }
  }

  if (type === "bullet_list") {
    const items = (b as { items?: unknown }).items
    if (!Array.isArray(items)) return null
    const cleaned = items
      .filter((x) => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
    if (!cleaned.length) return null
    return { type: "bullet_list", items: cleaned }
  }

  if (type === "key_value") {
    const label = typeof (b as { label?: string }).label === "string" ? (b as { label: string }).label.trim() : ""
    const value = typeof (b as { value?: string }).value === "string" ? (b as { value: string }).value.trim() : ""
    if (!label || !value) return null
    return { type: "key_value", label, value }
  }

  if (type === "medication_hint") {
    const name = typeof (b as { name?: string }).name === "string" ? (b as { name: string }).name.trim() : ""
    const hint = typeof (b as { hint?: string }).hint === "string" ? (b as { hint: string }).hint.trim() : ""
    if (!name || !hint) return null
    const cautionRaw = (b as { caution?: string | null }).caution
    const caution = typeof cautionRaw === "string" && cautionRaw.trim() ? cautionRaw.trim() : null
    return { type: "medication_hint", name, hint, caution }
  }

  if (type === "callout") {
    const variant = (b as { variant?: unknown }).variant
    if (!isCalloutVariant(variant)) return null
    const text = typeof (b as { text?: string }).text === "string" ? (b as { text: string }).text.trim() : ""
    if (!text) return null
    const titleRaw = (b as { title?: string | null }).title
    const title =
      typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : titleRaw === null ? null : null
    return { type: "callout", variant, title, text }
  }

  if (type === "divider") {
    return { type: "divider" }
  }

  return null
}

export function parseAssistantStructuredReply(raw: string): AssistantStructuredReply {
  const data = JSON.parse(stripJsonFences(raw)) as { blocks?: unknown }
  if (!data || typeof data !== "object" || !Array.isArray(data.blocks)) {
    throw new Error("Respuesta estructurada inválida")
  }
  const blocks: AssistantChatBlock[] = []
  for (const item of data.blocks) {
    const n = normalizeBlock(item)
    if (n) blocks.push(n)
  }
  if (!blocks.length) {
    throw new Error("La respuesta no contiene bloques válidos")
  }
  return { blocks }
}

export function assistantReplyFromPlainText(text: string): AssistantStructuredReply {
  const t = text.trim()
  if (!t) return { blocks: [{ type: "paragraph", text: "…" }] }
  return { blocks: [{ type: "paragraph", text: t }] }
}

export function buildPatientAssistantJsonPrompt(): string {
  return `
Debes responder SOLO con JSON válido (sin markdown). Idioma: español.

Formato:
{
  "blocks": [
    { "type": "heading", "text": "string", "level": 2 },
    { "type": "paragraph", "text": "string" },
    { "type": "bullet_list", "items": ["string", "..."] },
    { "type": "key_value", "label": "string", "value": "string" },
    { "type": "medication_hint", "name": "string", "hint": "string", "caution": "string | null" },
    { "type": "callout", "variant": "info" | "warning" | "danger", "title": "string | null", "text": "string" },
    { "type": "divider" }
  ]
}

Reglas de contenido enriquecido:
- Empieza con un "heading" corto (nivel 2) que resuma la respuesta.
- Usa 1-3 "paragraph" con frases claras (puedes usar saltos de línea \\n dentro del texto).
- Cuando enumeres pasos o recomendaciones, usa "bullet_list".
- Usa "key_value" para datos puntuales (ej. "Con comida" -> "Sí").
- Usa "medication_hint" cuando hables de un medicamento concreto del expediente o receta (name = nombre del fármaco).
- Usa "callout" variant "warning" para precauciones habituales; "danger" solo ante señales de alarma o urgencia; "info" para aclaraciones útiles.
- Usa "divider" solo si separas dos secciones largas (máx. 1 por respuesta).

No inventes datos clínicos que no estén en el contexto del paciente. Si falta información, dilo en un "callout" info y sugiere consultar al médico o farmacéutico.
`.trim()
}
