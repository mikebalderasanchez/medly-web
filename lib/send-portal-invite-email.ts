function appBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`
  return "http://localhost:3000"
}

export type SendInviteEmailResult =
  | { ok: true; sent: true }
  | { ok: true; sent: false; reason: "not_configured"; previewLink: string }

export async function sendPatientPortalInviteEmail(input: {
  to: string
  patientName: string
  claimUrl: string
  plainLine: string
  /** HTML adicional (p. ej. receta del consultorio). */
  prescriptionHtmlAppendix?: string | null
  /** PDF en base64 (sin data: prefix) para adjuntar la receta. */
  prescriptionPdfBase64?: string | null
  prescriptionPdfFilename?: string | null
}): Promise<SendInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim() || "Medly <onboarding@resend.dev>"

  const hasRx = Boolean(input.prescriptionHtmlAppendix?.trim() || input.prescriptionPdfBase64?.trim())
  const subject = hasRx
    ? "Tu acceso a Medly y receta del consultorio"
    : "Tu acceso al portal de paciente Medly"
  const html = `
  <p>Hola${input.patientName ? `, <strong>${escapeHtml(input.patientName)}</strong>` : ""},</p>
  <p>Tu equipo médico compartió contigo el acceso al portal de paciente de <strong>Medly</strong> tras tu consulta.</p>
  <p><a href="${escapeHtml(input.claimUrl)}">Abrir enlace de acceso</a></p>
  <p style="font-size:12px;color:#555">Si el botón no funciona, copia y pega esta URL en el navegador o en la app móvil Medly (sección «Vincular acceso»):<br/>
  <code style="word-break:break-all">${escapeHtml(input.claimUrl)}</code></p>
  <p style="font-size:12px;color:#555">Código para la app (una sola línea):<br/><code style="word-break:break-all">${escapeHtml(input.plainLine)}</code></p>
  <p style="font-size:12px;color:#888">Este enlace caduca en 14 días y solo puede usarse una vez.</p>
  ${input.prescriptionHtmlAppendix?.trim() ? `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />${input.prescriptionHtmlAppendix.trim()}` : ""}
`.trim()

  const attachments =
    input.prescriptionPdfBase64 && input.prescriptionPdfBase64.trim()
      ? [
          {
            filename: (input.prescriptionPdfFilename?.trim() || "receta-medly.pdf").replace(/[^\w.-]+/g, "-"),
            content: input.prescriptionPdfBase64.trim(),
          },
        ]
      : undefined

  if (!apiKey) {
    return {
      ok: true,
      sent: false,
      reason: "not_configured",
      previewLink: input.claimUrl,
    }
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    console.error("[sendPatientPortalInviteEmail] Resend error", res.status, t)
    return {
      ok: true,
      sent: false,
      reason: "not_configured",
      previewLink: input.claimUrl,
    }
  }

  return { ok: true, sent: true }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export { appBaseUrl }
