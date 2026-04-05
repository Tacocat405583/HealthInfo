import type { DecryptedRecord } from '../types/health'

/**
 * Extract plain text from a decrypted record, dispatched by mimeType.
 * Returns null for unsupported types (image/*, binary) — the caller should
 * show a "cannot be analyzed" message in that case.
 */
export async function extractText(record: DecryptedRecord): Promise<string | null> {
  const { data, mimeType } = record

  if (mimeType === 'application/pdf') {
    try {
      return await extractPdfText(data)
    } catch (err) {
      console.error('PDF text extraction failed:', err)
      return null
    }
  }

  if (mimeType === 'application/json') {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(data))
      return JSON.stringify(parsed, null, 2)
    } catch {
      return new TextDecoder().decode(data)
    }
  }

  if (mimeType.startsWith('text/')) {
    return new TextDecoder().decode(data)
  }

  // image/*, binary — not supported in 48h hackathon scope
  return null
}

async function extractPdfText(data: Uint8Array): Promise<string> {
  // pdfjs-dist is loaded from CDN at runtime to avoid bundling its 26k-line
  // webpack bundle through Rollup (which hangs the production build).
  // Type safety is preserved via the installed type definitions.
  const PDFJS_VERSION = '5.6.205'
  const pdfjs = await import(
    /* @vite-ignore */
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`
  ) as typeof import('pdfjs-dist')

  // Worker setup: use CDN worker for simplicity. In production, host the
  // worker file locally or import it as a URL via Vite's ?url suffix.
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`

  const pdf = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // content.items is (TextItem | TextMarkedContent)[]; only TextItem has `.str`
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(text)
  }
  return pages.join('\n\n')
}
