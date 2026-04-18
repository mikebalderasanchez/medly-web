import { buildPrescriptionPdfBytes, type PrescriptionPdfInput } from "@/lib/prescription-pdf-core"

export type { PrescriptionPdfInput }

export function downloadPrescriptionPdf({
  body,
  patientLabel,
  fileSlug,
}: PrescriptionPdfInput & { fileSlug?: string | null }): void {
  const bytes = buildPrescriptionPdfBytes({ body, patientLabel })

  const base =
    (fileSlug && fileSlug.replace(/[^\w-]+/gi, "-").replace(/^-|-$/g, "").slice(0, 48)) || "receta"
  const filename = `${base}-${new Date().toISOString().slice(0, 10)}.pdf`

  const blob = new Blob([bytes], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
