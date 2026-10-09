import mammoth from 'mammoth'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const ALLOWED_EXT = ['.pdf', '.txt', '.docx'] as const

export function isAllowedFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return ALLOWED_EXT.some((ext) => name.endsWith(ext))
}

async function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer()
}

async function parseTxt(file: File): Promise<string> {
  return file.text()
}

async function parseDocx(file: File): Promise<string> {
  const buffer = await readAsArrayBuffer(file)
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  return result.value.trim()
}

async function parsePdf(file: File): Promise<string> {
  const buffer = await readAsArrayBuffer(file)
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
  const parts: string[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(pageText)
  }
  return parts.join('\n\n').replace(/\s+\n/g, '\n').trim()
}

export async function parseUploadedFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase()
  if (!isAllowedFile(file)) {
    throw new Error(
      'Lubatud on ainult PDF, TXT või DOCX failid.',
    )
  }
  let text = ''
  if (lower.endsWith('.txt')) text = await parseTxt(file)
  else if (lower.endsWith('.docx')) text = await parseDocx(file)
  else if (lower.endsWith('.pdf')) text = await parsePdf(file)

  if (!text.trim()) {
    throw new Error(
      'Failist ei leitud loetavat teksti. Proovi teist faili või vormingut.',
    )
  }
  return text.trim()
}
