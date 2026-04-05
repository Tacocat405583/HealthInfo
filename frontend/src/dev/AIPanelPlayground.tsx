import { useState } from 'react'
import { RecordCategory, type DecryptedRecord } from '../types/health'
import { RecordAIPanel } from '../ai/RecordAIPanel'

/**
 * Dev-only sandbox for iterating on the AI prompt and panel UI without needing
 * the full wallet → chain → IPFS → decrypt flow to work first.
 *
 * To use: temporarily swap the <App /> in main.tsx for <AIPanelPlayground />.
 * This change is LOCAL ONLY — never commit it to the feature branch PR.
 *
 *   // main.tsx (during dev)
 *   createRoot(...).render(
 *     <AppProvider>
 *       <AIPanelPlayground />
 *     </AppProvider>
 *   )
 *
 * Paste real-world lab report text into SAMPLE_TEXT below for realistic
 * prompt iteration.
 */

const SAMPLE_TEXT = `Patient: Sarah Johnson
Date: April 4, 2026

LIPID PANEL
- Total Cholesterol: 195 mg/dL (normal <200)
- LDL-C: 110 mg/dL (above ideal <100)
- HDL-C: 55 mg/dL (normal >40)
- Triglycerides: 125 mg/dL (normal <150)

BLOOD PRESSURE
- 120/80 mmHg (normal)

NOTES
Dr. Martinez: Your cardiovascular health is generally good. LDL is slightly
elevated; consider dietary adjustments and recheck in 6 months.`

const textBytes = new TextEncoder().encode(SAMPLE_TEXT)

const MOCK_RECORD: DecryptedRecord = {
  category: RecordCategory.Labs,
  mimeType: 'text/plain',
  filename: 'sample-lab.txt',
  data: textBytes,
  objectUrl: URL.createObjectURL(new Blob([textBytes], { type: 'text/plain' })),
  pointer: {
    cid: 'bafybeimockmockmockmockmockmockmockmockmockmock',
    dataHash: '0xmock',
    encryptedDEK: 'mock',
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
    lastModifiedBy: '0xMockPatient',
  },
}

export function AIPanelPlayground() {
  const [record] = useState<DecryptedRecord>(MOCK_RECORD)
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-4">AI Panel Playground</h1>
        <p className="text-sm text-gray-600 mb-4">
          Dev-only sandbox for iterating on the AI prompt without needing wallet
          / chain / IPFS.
        </p>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
          {SAMPLE_TEXT}
        </pre>
      </main>
      <RecordAIPanel record={record} />
    </div>
  )
}
