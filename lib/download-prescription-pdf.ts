export type PrescriptionPdfInput = {
  body: string
  patientLabel: string
  fileSlug?: string | null
}

const te = new TextEncoder()

function foldForPdf(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
}

function escapePdfLiteral(s: string): string {
  let out = "("
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === 0x5c) out += "\\\\"
    else if (c === 0x28) out += "\\("
    else if (c === 0x29) out += "\\)"
    else if (c === 0x0a) out += "\\n"
    else if (c < 0x20 || c > 0x7e) out += "?"
    else out += s[i]
  }
  return `${out})`
}

function wrapParagraph(line: string, maxLen: number): string[] {
  const t = line.trimEnd()
  if (!t) return [""]
  const out: string[] = []
  let rest = t
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf(" ", maxLen)
    if (cut <= 0) cut = maxLen
    out.push(rest.slice(0, cut).trimEnd())
    rest = rest.slice(cut).trimStart()
  }
  out.push(rest)
  return out
}

function buildWrappedLines(body: string, maxCharsPerLine: number): string[] {
  const lines: string[] = []
  for (const raw of body.split("\n")) {
    lines.push(...wrapParagraph(raw, maxCharsPerLine))
  }
  return lines
}

function buildContentStream(lines: string[], startY: number, lineGap: number): string {
  let y = startY
  let ops = "BT\n/F1 11 Tf\n"
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].length ? lines[i] : " "
    ops += `1 0 0 1 48 ${y} Tm\n${escapePdfLiteral(text)} Tj\n`
    y -= lineGap
  }
  ops += "ET\n"
  return ops
}

function concatBytes(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  let n = 0
  for (const c of chunks) n += c.length
  const out = new Uint8Array(n)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return out as Uint8Array<ArrayBuffer>
}

const LINES_PER_PAGE = 52
const LINE_GAP = 14
const START_Y = 780
const MAX_CHARS = 85

function buildPdfFromStreams(pageStreams: string[]): Uint8Array<ArrayBuffer> {
  const nPages = pageStreams.length
  const maxObj = 3 + 2 * nPages
  const offsets: number[] = new Array(maxObj + 1).fill(0)

  const parts: Uint8Array[] = []
  const push = (s: string) => parts.push(te.encode(s))
  const len = () => parts.reduce((a, p) => a + p.length, 0)

  push("%PDF-1.4\n")

  offsets[1] = len()
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

  const kidRefs = Array.from({ length: nPages }, (_, i) => `${4 + i * 2} 0 R`).join(" ")
  offsets[2] = len()
  push(`2 0 obj\n<< /Type /Pages /Kids [ ${kidRefs} ] /Count ${nPages} >>\nendobj\n`)

  offsets[3] = len()
  push("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

  for (let i = 0; i < nPages; i++) {
    const pageNum = 4 + i * 2
    const contentNum = pageNum + 1
    const stream = pageStreams[i]
    const streamBytes = te.encode(stream)

    offsets[contentNum] = len()
    push(`${contentNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`)
    parts.push(streamBytes)
    push("\nendstream\nendobj\n")

    offsets[pageNum] = len()
    push(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`,
    )
  }

  const xrefPos = len()
  push(`xref\n0 ${maxObj + 1}\n`)
  push("0000000000 65535 f \n")
  for (let i = 1; i <= maxObj; i++) {
    push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`)
  }
  push(
    "trailer\n<< /Size " +
      String(maxObj + 1) +
      " /Root 1 0 R >>\nstartxref\n" +
      String(xrefPos) +
      "\n%%EOF\n",
  )

  return concatBytes(parts)
}

export function downloadPrescriptionPdf({ body, patientLabel, fileSlug }: PrescriptionPdfInput): void {
  const title = "Receta medica"
  const dateStr = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const patient = foldForPdf(patientLabel)
  const bodyF = foldForPdf(body)

  const header: string[] = [
    title,
    "",
    `Fecha: ${foldForPdf(dateStr)}`,
    `Paciente: ${patient}`,
    "________________________________________",
    "",
  ]
  const bodyLines = buildWrappedLines(bodyF, MAX_CHARS)
  const combined = [...header, ...bodyLines]

  const pageStreams: string[] = []
  for (let start = 0; start < combined.length; start += LINES_PER_PAGE) {
    const slice = combined.slice(start, start + LINES_PER_PAGE)
    pageStreams.push(buildContentStream(slice, START_Y, LINE_GAP))
  }

  const bytes = buildPdfFromStreams(pageStreams)

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
