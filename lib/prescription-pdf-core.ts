/**
 * Generación de PDF mínima (sin dependencias) para recetas / indicaciones.
 * Uso: descarga en navegador y adjunto en correo (Node).
 */

export type PrescriptionPdfInput = {
  body: string
  patientLabel: string
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

const LINES_PER_PAGE = 48
const LINE_GAP = 13
const BODY_START_Y = 598
const MAX_CHARS = 78

function buildPageStream(
  lines: string[],
  startY: number,
  lineGap: number,
  opts: { showHeader: boolean; pageIndex: number; totalPages: number; dateStr: string; patient: string }
): string {
  let ops = ""
  if (opts.showHeader) {
    ops += "q\n0.93 0.95 0.98 rg\n0 742 595 100 re\nf\nQ\n"
    ops += "BT\n/F2 17 Tf\n0.1 0.15 0.22 rg\n1 0 0 1 48 805 Tm\n"
    ops += `${escapePdfLiteral("Receta e indicaciones")} Tj\n`
    ops += "/F1 10 Tf\n0.25 0.32 0.42 rg\n1 0 0 1 48 782 Tm\n"
    ops += `${escapePdfLiteral(`Medly · ${opts.dateStr}`)} Tj\n`
    ops += "1 0 0 1 48 766 Tm\n"
    ops += `${escapePdfLiteral(`Paciente: ${opts.patient}`)} Tj\n`
    ops += "ET\n"
    ops += "0.75 0.82 0.9 RG\n2 w\n48 732 m 547 732 l S\n"
  }

  ops += "BT\n/F1 10 Tf\n0.12 0.14 0.18 rg\n"
  let y = startY
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].length ? lines[i] : " "
    ops += `1 0 0 1 48 ${y} Tm\n${escapePdfLiteral(text)} Tj\n`
    y -= lineGap
  }
  ops += "ET\n"

  // Pie de página
  ops += "BT\n/F1 8 Tf\n0.45 0.48 0.52 rg\n1 0 0 1 48 42 Tm\n"
  ops += `${escapePdfLiteral(`Página ${opts.pageIndex + 1} de ${opts.totalPages} · Borrador informativo · No sustituye la receta original`)} Tj\n`
  ops += "ET\n"

  return ops
}

function buildPdfFromStreams(
  pageSlices: string[][],
  meta: { dateStr: string; patient: string }
): Uint8Array<ArrayBuffer> {
  const nPages = pageSlices.length
  // Objects: 1 Catalog, 2 Pages, 3 Font Helvetica, 4 Font Helvetica-Bold, then pairs (Page, Contents)
  const baseId = 4
  const maxObj = baseId + 2 * nPages

  const offsets: number[] = new Array(maxObj + 1).fill(0)
  const parts: Uint8Array[] = []
  const push = (s: string) => parts.push(te.encode(s))
  const len = () => parts.reduce((a, p) => a + p.length, 0)

  push("%PDF-1.4\n")

  offsets[1] = len()
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

  const kidRefs = Array.from({ length: nPages }, (_, i) => `${baseId + 1 + i * 2} 0 R`).join(" ")
  offsets[2] = len()
  push(`2 0 obj\n<< /Type /Pages /Kids [ ${kidRefs} ] /Count ${nPages} >>\nendobj\n`)

  offsets[3] = len()
  push("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

  offsets[4] = len()
  push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n")

  for (let i = 0; i < nPages; i++) {
    const pageNum = baseId + 1 + i * 2
    const contentNum = pageNum + 1
    const stream = buildPageStream(pageSlices[i]!, i === 0 ? BODY_START_Y : 800, LINE_GAP, {
      showHeader: i === 0,
      pageIndex: i,
      totalPages: nPages,
      dateStr: meta.dateStr,
      patient: meta.patient,
    })
    const streamBytes = te.encode(stream)

    offsets[contentNum] = len()
    push(`${contentNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`)
    parts.push(streamBytes)
    push("\nendstream\nendobj\n")

    offsets[pageNum] = len()
    push(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`,
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

export function buildPrescriptionPdfBytes({ body, patientLabel }: PrescriptionPdfInput): Uint8Array<ArrayBuffer> {
  const dateStr = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const patient = foldForPdf(patientLabel)
  const bodyF = foldForPdf(body)
  const bodyLines = buildWrappedLines(bodyF, MAX_CHARS)

  const pageSlices: string[][] = []
  for (let start = 0; start < bodyLines.length; start += LINES_PER_PAGE) {
    pageSlices.push(bodyLines.slice(start, start + LINES_PER_PAGE))
  }
  if (pageSlices.length === 0) pageSlices.push([""])

  return buildPdfFromStreams(pageSlices, { dateStr: foldForPdf(dateStr), patient })
}
