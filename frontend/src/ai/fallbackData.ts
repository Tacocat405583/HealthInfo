import { RecordCategory } from '../types/health'
import type { RecordInsight } from './useUnderstandRecord'

/**
 * Pre-written fallback summaries for demo safety.
 * If the live LLM call fails (network, API down, parse error, missing env),
 * these take over so the demo still has something to show.
 *
 * Covers the three record categories most likely to appear in hackathon demos.
 * Other categories fall back to GENERIC.
 */
const FALLBACKS: Partial<Record<RecordCategory, Omit<RecordInsight, 'isFallback'>>> = {
  [RecordCategory.Labs]: {
    summary: [
      'Your cholesterol levels are mostly within normal range.',
      'LDL is slightly above the ideal target of 100 mg/dL.',
      'Blood pressure and blood sugar readings look healthy.',
      'You may want to discuss dietary adjustments with your doctor at the next visit.',
    ],
    glossary: [
      { term: 'LDL', definition: 'Often called "bad" cholesterol; high levels can clog arteries over time.' },
      { term: 'HDL', definition: '"Good" cholesterol that helps remove other forms of cholesterol.' },
      { term: 'mg/dL', definition: 'Milligrams per deciliter — the standard unit for measuring substances in blood.' },
    ],
  },
  [RecordCategory.Cardiology]: {
    summary: [
      'Your ECG reading shows a normal heart rhythm.',
      'Heart rate and blood pressure are in the healthy range.',
      'The doctor noted slight elevation in cholesterol to monitor.',
      'A follow-up in 6 months was recommended.',
    ],
    glossary: [
      { term: 'ECG (or EKG)', definition: 'A test that records the electrical activity of your heart.' },
      { term: 'Sinus rhythm', definition: 'The normal, healthy pattern of heartbeats.' },
    ],
  },
  [RecordCategory.Primary]: {
    summary: [
      'Your annual checkup was generally positive.',
      'Weight, blood pressure, and vitals are all within expected ranges.',
      'The doctor recommended a follow-up lab panel in 6 months.',
    ],
    glossary: [
      { term: 'Vitals', definition: 'Basic health measurements: temperature, heart rate, breathing rate, blood pressure.' },
    ],
  },
}

const GENERIC: Omit<RecordInsight, 'isFallback'> = {
  summary: [
    'This record contains medical information from your healthcare provider.',
    'Please open the document to view the full details.',
    'You may want to discuss this record with your doctor if anything is unclear.',
  ],
  glossary: [],
}

export function getFallback(category: RecordCategory): RecordInsight {
  const data = FALLBACKS[category] ?? GENERIC
  return { ...data, isFallback: true }
}
