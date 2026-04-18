"use client"

import type { AssistantChatBlock } from "@/lib/patient-assistant-blocks"
import { Pill, AlertTriangle, Info, Siren } from "lucide-react"

function renderInlineEmphasis(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function Paragraph({ text }: { text: string }) {
  const lines = text.split(/\n+/)
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground/95">
      {lines.map((line, idx) => (
        <p key={idx}>{renderInlineEmphasis(line)}</p>
      ))}
    </div>
  )
}

function CalloutIcon({ variant }: { variant: "info" | "warning" | "danger" }) {
  if (variant === "danger") return <Siren className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
  if (variant === "warning") return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
  return <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
}

function CalloutStyles({ variant }: { variant: "info" | "warning" | "danger" }) {
  if (variant === "danger") {
    return "border-red-200 bg-red-50 text-red-950 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-50"
  }
  if (variant === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-50"
  }
  return "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/35 dark:text-sky-50"
}

export function AssistantMessageContent({ blocks }: { blocks: AssistantChatBlock[] }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {blocks.map((block, idx) => {
        const key = `${block.type}-${idx}`

        if (block.type === "divider") {
          return <hr key={key} className="my-1 border-border/60" />
        }

        if (block.type === "heading") {
          const Tag = block.level === 3 ? "h4" : "h3"
          return (
            <Tag key={key} className={block.level === 3 ? "text-sm font-semibold" : "text-base font-semibold tracking-tight"}>
              {block.text}
            </Tag>
          )
        }

        if (block.type === "paragraph") {
          return <Paragraph key={key} text={block.text} />
        }

        if (block.type === "bullet_list") {
          return (
            <ul key={key} className="list-inside list-disc space-y-1.5 pl-1 text-sm text-foreground/95 marker:text-primary">
              {block.items.map((item, i) => (
                <li key={i}>{renderInlineEmphasis(item)}</li>
              ))}
            </ul>
          )
        }

        if (block.type === "key_value") {
          return (
            <div
              key={key}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
            >
              <span className="font-medium text-muted-foreground">{block.label}</span>
              <span className="text-right font-medium text-foreground">{renderInlineEmphasis(block.value)}</span>
            </div>
          )
        }

        if (block.type === "medication_hint") {
          return (
            <div
              key={key}
              className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm dark:bg-primary/10"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Pill className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">{block.name}</p>
                <p className="text-sm text-muted-foreground">{renderInlineEmphasis(block.hint)}</p>
                {block.caution ? (
                  <p className="rounded-md border border-amber-200/80 bg-amber-50/80 px-2 py-1 text-xs font-medium text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-50">
                    {block.caution}
                  </p>
                ) : null}
              </div>
            </div>
          )
        }

        if (block.type === "callout") {
          return (
            <div
              key={key}
              className={`flex gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-sm ${CalloutStyles({ variant: block.variant })}`}
              role="note"
            >
              <CalloutIcon variant={block.variant} />
              <div className="min-w-0 space-y-1">
                {block.title ? <p className="font-semibold leading-tight">{block.title}</p> : null}
                <p className="leading-relaxed">{renderInlineEmphasis(block.text)}</p>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
